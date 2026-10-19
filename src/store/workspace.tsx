'use client';
import {
  configureStore,
  createSlice,
  type PayloadAction,
  type Middleware,
  type UnknownAction,
} from '@reduxjs/toolkit';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { api, configured, supabase } from '@/lib/supabase';
import type { WorkspaceData } from '@/lib/schemas';
export const columns = ['Backlog', 'To do', 'In progress', 'In review', 'Done'] as const;
export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type Task = WorkspaceData['tasks'][number];
export type Board = WorkspaceData['boards'][number];
type Profile = { name: string; email: string };
type Workspace = WorkspaceData & { profile: Profile; recent: string[]; collapsed: boolean };
export type Member = { id: string; name: string; email: string; role: string };
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const empty = (): Workspace => ({
  boards: [],
  tasks: [],
  profile: { name: '', email: '' },
  recent: [],
  collapsed: false,
});
const slice = createSlice({
  name: 'workspace',
  initialState: empty(),
  reducers: {
    hydrate: (_, a: PayloadAction<Workspace>) => a.payload,
    addBoard: (s, a: PayloadAction<Board>) => {
      s.boards.push(a.payload);
    },
    addTasks: (s, a: PayloadAction<Task[]>) => {
      for (const t of a.payload) if (!s.tasks.some((x) => x.id === t.id)) s.tasks.push(t);
    },
    saveTask: (s, a: PayloadAction<Task>) => {
      const i = s.tasks.findIndex((t) => t.id === a.payload.id);
      if (i < 0) s.tasks.push(a.payload);
      else s.tasks[i] = a.payload;
    },
    moveTask: (s, a: PayloadAction<{ id: string; column: Task['column'] }>) => {
      const t = s.tasks.find((t) => t.id === a.payload.id);
      if (t) t.column = a.payload.column;
    },
    visit: (s, a: PayloadAction<string>) => {
      s.recent = [a.payload, ...s.recent.filter((id) => id !== a.payload)].slice(0, 6);
    },
    profile: (s, a: PayloadAction<Profile>) => {
      s.profile = a.payload;
    },
    collapse: (s) => {
      s.collapsed = !s.collapsed;
    },
  },
});
export const actions = slice.actions;
const makeStore = (middleware: Middleware) =>
  configureStore({ reducer: slice.reducer, middleware: (g) => g().concat(middleware) });
type Store = ReturnType<typeof makeStore>;
export const useWorkspace = () => useSelector((s: Workspace) => s);
export const useAppDispatch = useDispatch.withTypes<Store['dispatch']>();
type Connection = {
  workspaceId: string;
  workspaceName: string;
  userId: string;
  members: Member[];
  status: string;
  error: string;
  workspaces: { id: string; name: string }[];
  switchWorkspace: (id: string) => void;
  reload: () => void;
  signOut: () => Promise<void>;
  saveProfile: (name: string) => Promise<void>;
};
const ConnectionContext = createContext<Connection | null>(null);
export function useConnection() {
  const value = useContext(ConnectionContext);
  if (!value) throw Error('Workspace connection missing');
  return value;
}
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    protectedPage = path.startsWith('/app/');
  const [status, setStatus] = useState('Loading workspace…'),
    [error, setError] = useState(''),
    [ready, setReady] = useState(false),
    [workspaceId, setWorkspaceId] = useState(''),
    [workspaceName, setWorkspaceName] = useState(''),
    [userId, setUserId] = useState(''),
    [members, setMembers] = useState<Member[]>([]),
    [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([]),
    [epoch, setEpoch] = useState(0);
  const handler = useRef<(action: UnknownAction, before: Workspace) => void>(() => {}),
    ref = useRef<Store | null>(null);
  if (!ref.current)
    ref.current = makeStore((store) => (next) => (action) => {
      const before = store.getState() as Workspace;
      const result = next(action);
      if (
        typeof action === 'object' &&
        action &&
        'type' in action &&
        [
          'workspace/addBoard',
          'workspace/saveTask',
          'workspace/moveTask',
          'workspace/addTasks',
        ].includes(String(action.type))
      )
        handler.current(action as UnknownAction, before);
      return result;
    });
  useEffect(() => {
    if (!protectedPage || !configured) return;
    const client = supabase(),
      store = ref.current!;
    let stopped = false,
      initializedUser = '',
      queue: { action: UnknownAction; before?: Task | null }[] = [],
      busy = false,
      wid = '',
      revision = -1;
    let channel: ReturnType<typeof client.channel> | null = null;
    setReady(false);
    setError('');
    setStatus('Loading workspace…');
    store.dispatch(actions.hydrate(empty()));
    function hydrate(data: WorkspaceData, rev: number) {
      if (stopped || rev < revision) return;
      revision = rev;
      let merged = { ...store.getState(), ...data };
      for (const pending of queue) merged = slice.reducer(merged, pending.action);
      store.dispatch(actions.hydrate(merged));
    }
    async function refresh() {
      if (!wid || stopped || busy || queue.length) return;
      try {
        const row = await api(`/api/workspace/?id=${wid}`);
        if (stopped) return;
        hydrate(row.state, row.revision);
        const { data, error: membersError } = await client.rpc('list_workspace_members', { wid });
        if (membersError) throw membersError;
        if (!stopped) setMembers(data || []);
      } catch (e) {
        if (!stopped) setError(e instanceof Error ? e.message : 'Sync failed');
      }
    }
    async function flush() {
      if (busy || !wid || stopped) return;
      busy = true;
      setStatus('Saving…');
      while (queue.length && !stopped) {
        const pending = queue[0];
        try {
          const result = await api('/api/workspace/', {
            id: wid,
            mutation: {
              ...pending.action,
              ...('before' in pending ? { before: pending.before } : {}),
            },
          });
          if (stopped) break;
          queue.shift();
          hydrate(result.state, result.revision);
        } catch (e) {
          if (stopped) break;
          queue = [];
          setError(
            (e instanceof Error ? e.message : 'Save failed') +
              ' Your last changes could not be confirmed. Reload before continuing.',
          );
          setStatus('Save failed');
          busy = false;
          await refresh();
          return;
        }
      }
      busy = false;
      if (!stopped) setStatus('Saved to Supabase');
    }
    async function initialize() {
      try {
        const incomingInvite = new URLSearchParams(location.search).get('invite');
        if (incomingInvite) sessionStorage.setItem('constrack-pending-invite', incomingInvite);
        const {
          data: { user },
          error: authError,
        } = await client.auth.getUser();
        if (stopped) return;
        if (authError || !user) {
          location.replace('/login/');
          return;
        }
        if (initializedUser === user.id) return;
        initializedUser = user.id;
        setUserId(user.id);
        const invite = sessionStorage.getItem('constrack-pending-invite');
        if (invite) {
          const { data, error } = await client.rpc('accept_workspace_invite', { code: invite });
          if (error) {
            sessionStorage.removeItem('constrack-pending-invite');
            throw error;
          }
          sessionStorage.removeItem('constrack-pending-invite');
          localStorage.setItem(`constrack-workspace-${user.id}`, data);
          history.replaceState(null, '', location.pathname);
        }
        const { data: defaultId, error: ensureError } = await client.rpc('ensure_workspace');
        if (ensureError) throw ensureError;
        const { data: list, error: listError } = await client.from('workspaces').select('id,name');
        if (listError) throw listError;
        if (stopped) return;
        setWorkspaces(list || []);
        const saved = localStorage.getItem(`constrack-workspace-${user.id}`);
        wid = list?.some((w) => w.id === saved) ? saved! : defaultId;
        setWorkspaceId(wid);
        setWorkspaceName(list?.find((w) => w.id === wid)?.name || 'Workspace');
        store.dispatch(
          actions.profile({
            name: user.user_metadata.name || user.email?.split('@')[0] || 'Member',
            email: user.email || '',
          }),
        );
        const row = await api(`/api/workspace/?id=${wid}`);
        if (stopped) return;
        hydrate(row.state, row.revision);
        const { data: people, error: peopleError } = await client.rpc('list_workspace_members', {
          wid,
        });
        if (peopleError) throw peopleError;
        if (stopped) return;
        setMembers(people || []);
        handler.current = (action, before) => {
          if (stopped) return;
          const payload = action.payload as { id: string };
          queue.push({
            action,
            ...(['workspace/saveTask', 'workspace/moveTask'].includes(action.type)
              ? {
                  before:
                    (action.meta as { before?: Task | null } | undefined)?.before !== undefined
                      ? (action.meta as { before: Task | null }).before
                      : before.tasks.find((t) => t.id === payload.id) || null,
                }
              : {}),
          });
          void flush();
        };
        channel = client
          .channel(`workspace-${wid}`)
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'workspaces', filter: `id=eq.${wid}` },
            () => void refresh(),
          )
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'workspace_members',
              filter: `workspace_id=eq.${wid}`,
            },
            () => void refresh(),
          )
          .subscribe((state) => {
            if (!stopped && state === 'CHANNEL_ERROR')
              setStatus('Realtime reconnecting · polling active');
          });
        setReady(true);
        setStatus('Saved to Supabase');
      } catch (e) {
        if (!stopped) {
          setError(e instanceof Error ? e.message : 'Workspace setup failed');
          setReady(false);
        }
      }
    }
    void initialize();
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && !stopped) {
        store.dispatch(actions.hydrate(empty()));
        location.replace('/login/');
      }
    });
    const interval = setInterval(() => void refresh(), 15000);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    const unload = (e: BeforeUnloadEvent) => {
      if (queue.length) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', unload);
    return () => {
      stopped = true;
      handler.current = () => {};
      subscription.unsubscribe();
      if (channel) void client.removeChannel(channel);
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('beforeunload', unload);
    };
  }, [protectedPage, epoch]);
  const connection: Connection = {
    workspaceId,
    workspaceName,
    userId,
    members,
    status,
    error,
    workspaces,
    reload: () => setEpoch((n) => n + 1),
    switchWorkspace: (id) => {
      if (status === 'Saving…') {
        setError('Wait until changes are saved before switching.');
        return;
      }
      localStorage.setItem(`constrack-workspace-${userId}`, id);
      setEpoch((n) => n + 1);
    },
    signOut: async () => {
      if (status === 'Saving…') {
        setError('Wait until changes are saved before signing out.');
        return;
      }
      const { error } = await supabase().auth.signOut();
      if (error) setError(error.message);
      else location.assign('/login/');
    },
    saveProfile: async (name) => {
      const { error } = await supabase().auth.updateUser({ data: { name } });
      if (error) throw error;
      ref.current!.dispatch(actions.profile({ ...ref.current!.getState().profile, name }));
      setMembers((ms) => ms.map((m) => (m.id === userId ? { ...m, name } : m)));
    },
  };
  return (
    <Provider store={ref.current}>
      <ConnectionContext.Provider value={connection}>
        {protectedPage ? (
          !configured ? (
            <main className="login-page">
              <section className="login-card">
                <h1>Connect your workspace</h1>
                <p>
                  Add your Supabase settings to .env.local, run the SQL migration, then restart the
                  app. Follow INTEGRATION.md.
                </p>
                <a href="/login/">Go to sign in</a>
              </section>
            </main>
          ) : !ready ? (
            <main className="login-page">
              <section className="login-card">
                <h1>{error ? 'Connection needs attention' : 'Opening your workspace…'}</h1>
                <p role="status">{error || status}</p>
                {error && (
                  <button className="button primary" onClick={connection.reload}>
                    Retry
                  </button>
                )}
                <a href="/login/">Back to sign in</a>
              </section>
            </main>
          ) : (
            <>
              {error && (
                <div className="sync-error" role="alert">
                  {error}
                  <button className="button" onClick={connection.reload}>
                    Reload saved data
                  </button>
                </div>
              )}
              <div inert={!!error}>{children}</div>
            </>
          )
        ) : (
          children
        )}
      </ConnectionContext.Provider>
    </Provider>
  );
}
