'use client';
import { useState } from 'react';
import { api, supabase } from '@/lib/supabase';
import {
  actions,
  useAppDispatch,
  useWorkspace,
  useConnection,
  type Task,
  type Priority,
} from '@/store/workspace';
type Proposal = {
  summary: string;
  tasks: { title: string; description: string; priority: Priority; subtasks: string[] }[];
};
export function AIPlanner({
  initialBoard,
  onClose,
}: {
  initialBoard?: string;
  onClose: () => void;
}) {
  const s = useWorkspace(),
    c = useConnection(),
    dispatch = useAppDispatch();
  const [boardId, setBoard] = useState(initialBoard || s.boards[0]?.id || ''),
    [mode, setMode] = useState('generate'),
    [taskId, setTask] = useState(''),
    [prompt, setPrompt] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [result, setResult] = useState<Proposal | null>(null),
    [original, setOriginal] = useState<Task | null>(null);
  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setResult(null);
    setOriginal(s.tasks.find((t) => t.id === taskId) || null);
    try {
      setResult(
        await api('/api/ai/', {
          workspaceId: c.workspaceId,
          boardId,
          mode,
          prompt,
          taskId: taskId || undefined,
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI request failed');
    } finally {
      setBusy(false);
    }
  }
  function apply() {
    if (!result) return;
    if (mode === 'breakdown' && original && result.tasks[0]) {
      const item = result.tasks[0];
      dispatch({
        ...actions.saveTask({
          ...original,
          subtasks: [
            ...original.subtasks,
            ...item.subtasks.map((title) => ({ title, done: false })),
          ],
        }),
        meta: { before: original },
      });
    } else
      dispatch(
        actions.addTasks(
          result.tasks.map((t) => ({
            id: crypto.randomUUID(),
            boardId,
            title: t.title,
            description: t.description,
            priority: t.priority,
            subtasks: t.subtasks.map((title) => ({ title, done: false })),
            column: 'Backlog',
            due: '',
            assignee: '',
            label: 'AI plan',
            created: Date.now(),
          })),
        ),
      );
    onClose();
  }
  if (!s.boards.length) return <p>Create a board first, then open AI planning.</p>;
  return (
    <>
      <form onSubmit={generate}>
        <fieldset disabled={busy || !!result} className="plain-fieldset">
          <label>
            Board
            <select
              value={boardId}
              onChange={(e) => {
                setBoard(e.target.value);
                setTask('');
              }}
            >
              {s.boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Action
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="generate">Generate tasks</option>
              <option value="breakdown">Break down a task</option>
              <option value="summary">Summarize board progress</option>
            </select>
          </label>
          {mode === 'breakdown' && (
            <label>
              Task
              <select required value={taskId} onChange={(e) => setTask(e.target.value)}>
                <option value="">Choose a task</option>
                {s.tasks
                  .filter((t) => t.boardId === boardId)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <label>
            {mode === 'summary'
              ? 'Focus or reporting period (optional)'
              : 'Brief and acceptance criteria'}
            <textarea
              required={mode === 'generate'}
              maxLength={4000}
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What would you like to accomplish?"
            />
          </label>
        </fieldset>
        <p className="muted">
          The selected board and up to 100 tasks are sent to Gemini. Review the proposal before
          applying it.
        </p>
        {!result && (
          <button className="button primary" disabled={busy || c.status === 'Saving…'}>
            {busy ? 'Generating…' : 'Generate proposal'}
          </button>
        )}
      </form>
      {error && <p role="alert">{error}</p>}
      {result && (
        <section className="ai-review">
          <h3>Review proposal</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{result.summary}</p>
          {result.tasks.map((t, i) => (
            <article key={i}>
              <strong>
                {t.title} · {t.priority}
              </strong>
              <p>{t.description}</p>
              <ul>
                {t.subtasks.map((st, j) => (
                  <li key={j}>{st}</li>
                ))}
              </ul>
            </article>
          ))}
          <div className="modal-actions">
            <button className="button" onClick={() => setResult(null)}>
              Revise brief
            </button>
            {mode !== 'summary' && result.tasks.length > 0 && (
              <button className="button primary" disabled={c.status === 'Saving…'} onClick={apply}>
                {mode === 'breakdown' ? 'Add subtasks' : 'Apply tasks to board'}
              </button>
            )}
          </div>
        </section>
      )}
    </>
  );
}
export function ConnectedTeam() {
  const c = useConnection();
  const [q, setQ] = useState(''),
    [code, setCode] = useState(''),
    [link, setLink] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  const owner = c.members.some((m) => m.id === c.userId && m.role === 'owner');
  async function invite() {
    setBusy(true);
    setMessage('');
    try {
      const { data, error } = await supabase().rpc('create_workspace_invite', {
        wid: c.workspaceId,
      });
      if (error) throw error;
      setLink(`${location.origin}/app/dashboard/?invite=${data}`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Invitation failed');
    } finally {
      setBusy(false);
    }
  }
  async function join(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      let token = code.trim();
      if (token.includes('://')) token = new URL(token).searchParams.get('invite') || '';
      const { data, error } = await supabase().rpc('accept_workspace_invite', { code: token });
      if (error) throw error;
      c.switchWorkspace(data);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not join');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="greeting">
        <div>
          <div className="eyebrow">BETTER, TOGETHER</div>
          <h1>Your workspace team.</h1>
          <p>Members share access to every board in this workspace.</p>
        </div>
      </div>
      <section className="panel settings-panel">
        <label>
          Active workspace
          <select
            value={c.workspaceId}
            disabled={c.status === 'Saving…'}
            onChange={(e) => c.switchWorkspace(e.target.value)}
          >
            {c.workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} · {w.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </label>
        {owner && (
          <>
            <button className="button primary" disabled={busy} onClick={invite}>
              Create invitation link
            </button>
            <p className="muted">
              One use, expires in 24 hours. Share this link with the person you want to invite.
            </p>
          </>
        )}
        {link && (
          <label>
            Invitation link
            <input readOnly value={link} onFocus={(e) => e.target.select()} />
          </label>
        )}
        <form onSubmit={join}>
          <label>
            Join another workspace
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              placeholder="Paste invitation link or code"
            />
          </label>
          <button disabled={busy || c.status === 'Saving…'} className="button">
            Join workspace
          </button>
        </form>
        {message && <p role="status">{message}</p>}
      </section>
      <section className="panel team-panel">
        <div className="section-heading">
          <h2>Members · {c.members.length}</h2>
          <input
            aria-label="Search members"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find a teammate"
          />
        </div>
        {c.members
          .filter((m) => `${m.name} ${m.email}`.toLowerCase().includes(q.toLowerCase()))
          .map((m) => (
            <div className="team-row" key={m.id}>
              <div>
                <strong>
                  {m.name}
                  {m.id === c.userId ? ' (you)' : ''}
                </strong>
                <p>{m.email}</p>
              </div>
              <span>{m.role}</span>
              <span className="status-pill">Member</span>
            </div>
          ))}
      </section>
    </>
  );
}
export function ConnectedPreferences() {
  const s = useWorkspace(),
    c = useConnection();
  const [name, setName] = useState(s.profile.name),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <>
      <div className="greeting">
        <h1>Your profile and connections.</h1>
      </div>
      <section className="panel settings-panel">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMessage('');
            try {
              await c.saveProfile(name.trim());
              setMessage('Profile saved');
            } catch (e) {
              setMessage(e instanceof Error ? e.message : 'Save failed');
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Display name
            <input required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Account email
            <input value={s.profile.email} readOnly />
          </label>
          <button className="button primary" disabled={busy}>
            Save profile
          </button>
          {message && <p role="status">{message}</p>}
        </form>
      </section>
      <section className="panel settings-panel">
        <h2>Connections</h2>
        <div className="connection-row">
          <span>Supabase account & workspace</span>
          <span>{c.status}</span>
        </div>
        <div className="connection-row">
          <span>Gemini</span>
          <span>Availability checked when you generate</span>
        </div>
        <p>Google sign-in is available when enabled in your Supabase project.</p>
      </section>
    </>
  );
}
