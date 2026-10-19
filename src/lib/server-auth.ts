import { createClient } from '@supabase/supabase-js';
export async function authenticate(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key)
    throw new Response(JSON.stringify({ error: 'Supabase is not configured.' }), { status: 503 });
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new Response(JSON.stringify({ error: 'Sign in required.' }), { status: 401 });
  const db = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error,
  } = await db.auth.getUser(token);
  if (error || !user)
    throw new Response(JSON.stringify({ error: 'Session expired. Please sign in again.' }), {
      status: 401,
    });
  return { db, user };
}
export function failure(error: unknown) {
  if (error instanceof Response) return error;
  return Response.json(
    { error: error instanceof Error ? error.message : 'Request failed' },
    { status: 400 },
  );
}
export async function readJson(request: Request) {
  const text = await request.text();
  if (text.length > 250000) throw Error('Request is too large');
  return JSON.parse(text);
}
