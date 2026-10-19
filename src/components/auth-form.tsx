'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { configured, supabase } from '@/lib/supabase';
export default function AuthForm() {
  const [mode, setMode] = useState<'login' | 'register' | 'reset' | 'update'>('login'),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [name, setName] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!configured) return;
    const {
      data: { subscription },
    } = supabase().auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setMode('update');
    });
    return () => subscription.unsubscribe();
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const client = supabase();
      let result;
      if (mode === 'register')
        result = await client.auth.signUp({
          email,
          password,
          options: { data: { name }, emailRedirectTo: location.origin + '/login/' },
        });
      else if (mode === 'reset')
        result = await client.auth.resetPasswordForEmail(email, {
          redirectTo: location.origin + '/login/',
        });
      else if (mode === 'update') result = await client.auth.updateUser({ password });
      else result = await client.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (mode === 'reset') {
        setMessage('If an account exists, a reset email will arrive shortly.');
        return;
      }
      if (mode === 'register' && !('session' in result.data && result.data.session)) {
        setMessage('Check your email to confirm your account, then sign in.');
        return;
      }
      location.assign('/app/dashboard/');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Sign in failed');
    } finally {
      setBusy(false);
    }
  }
  async function google() {
    setBusy(true);
    setMessage('');
    const { error } = await supabase().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: location.origin + '/app/dashboard/' },
    });
    if (error) {
      setMessage(error.message);
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <section className="login-card">
        <Link className="brand" href="/">
          constrack.
        </Link>
        <h1>
          {mode === 'register'
            ? 'Create your account'
            : mode === 'reset'
              ? 'Reset your password'
              : mode === 'update'
                ? 'Choose a new password'
                : 'Welcome back.'}
        </h1>
        <p>Your projects, together in one place.</p>
        {!configured ? (
          <div className="integration-note" role="status">
            Supabase setup is required. Add the two public Supabase variables to .env.local and run
            the SQL migration. See INTEGRATION.md.
          </div>
        ) : (
          <>
            <form onSubmit={submit}>
              {mode === 'register' && (
                <label>
                  Your name
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={60}
                    autoComplete="name"
                  />
                </label>
              )}
              {mode !== 'update' && (
                <label>
                  Email
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </label>
              )}
              {mode !== 'reset' && (
                <label>
                  Password
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                </label>
              )}
              <button className="button primary full" disabled={busy}>
                {busy
                  ? 'Please wait…'
                  : mode === 'register'
                    ? 'Create account'
                    : mode === 'reset'
                      ? 'Send reset link'
                      : mode === 'update'
                        ? 'Save password'
                        : 'Sign in'}
              </button>
            </form>
            {mode === 'login' && (
              <button className="button full" disabled={busy} onClick={google}>
                Continue with Google
              </button>
            )}
            <div className="auth-links">
              <button
                className="button"
                disabled={busy}
                onClick={() => {
                  setMode(mode === 'register' ? 'login' : 'register');
                  setMessage('');
                }}
              >
                {mode === 'register' ? 'Already have an account?' : 'Create account'}
              </button>
              <button
                className="button"
                disabled={busy}
                onClick={() => {
                  setMode(mode === 'reset' ? 'login' : 'reset');
                  setMessage('');
                }}
              >
                {mode === 'reset' ? 'Back to sign in' : 'Forgot password?'}
              </button>
            </div>
          </>
        )}
        {message && <p role="status">{message}</p>}
        <Link href="/">Back to home</Link>
      </section>
    </main>
  );
}
