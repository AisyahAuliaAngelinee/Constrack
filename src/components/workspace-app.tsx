'use client';
import Link from 'next/link';
import { AIPlanner, ConnectedTeam, ConnectedPreferences } from './connected-panels';
import { useConnection } from '@/store/workspace';
import { startNavigation } from '@/components/navigation-progress';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, type ReactNode, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  ListTodo,
  CalendarDays,
  Users,
  Settings,
  Search,
  Plus,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowRight,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Sparkles,
  Globe,
  Rocket,
  Shapes,
  Smartphone,
  MoreHorizontal,
  Check,
  CheckCircle2,
  Clock,
  Columns3,
  X,
  SlidersHorizontal,
  Grid2X2,
  List,
  Flag,
  MessageSquare,
  Paperclip,
  Menu,
  Command,
  ExternalLink,
  Target,
  ArrowDownUp,
  Mail,
  Lock,
  GripVertical,
  FolderKanban,
  ArrowLeft,
  CheckSquare,
  Circle,
  Info,
} from 'lucide-react';
import {
  actions,
  columns,
  useWorkspace,
  useAppDispatch,
  today,
  type Task,
  type Board,
  type Priority,
} from '@/store/workspace';
const icons = { Globe, Rocket, Shapes, Smartphone, FolderKanban };
const nav = [
  {
    name: 'Dashboard',
    path: '/app/dashboard',
    icon: LayoutDashboard,
    sub: 'A little clarity. A lot of progress.',
  },
  {
    name: 'My Tasks',
    path: '/app/my-tasks',
    icon: ListTodo,
    sub: 'Make room for your most important work.',
  },
  {
    name: 'Calendar',
    path: '/app/calendar',
    icon: CalendarDays,
    sub: 'Your next steps, all in good time.',
  },
  { name: 'Team', path: '/app/team', icon: Users, sub: 'Good things are built together.' },
  { name: 'Settings', path: '/app/settings', icon: Settings, sub: 'Make this space your own.' },
];
export function Logo() {
  return (
    <span className="logo" aria-label="Constrack">
      <i />
      <i />
      <i />
    </span>
  );
}
function Avatar({ name = 'Member', small = false }: { name?: string; small?: boolean }) {
  const c = useConnection();
  name = c.members.find((m) => m.id === name)?.name || name;
  return (
    <span
      className={`avatar ${name.startsWith('Maya') ? 'rose' : name.startsWith('Leo') ? 'gold' : ''} ${small ? 'small' : ''}`}
      title={name}
    >
      {name
        .split(' ')
        .map((x) => x[0])
        .slice(0, 2)
        .join('')}
    </span>
  );
}
function BoardIcon({ board }: { board: Board }) {
  const Icon = icons[board.icon as keyof typeof icons] || FolderKanban;
  return (
    <span className={`board-icon ${board.color}`}>
      <Icon size={21} />
    </span>
  );
}
function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const old = document.activeElement as HTMLElement;
    const panel = ref.current;
    panel?.querySelector<HTMLElement>('input,button,textarea')?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'Tab' && panel) {
        const items = Array.from(
          panel.querySelectorAll<HTMLElement>(
            'button:not([disabled]),input,select,textarea,a[href]',
          ),
        );
        if (!items.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', key);
      document.body.style.overflow = overflow;
      old?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        ref={ref}
        className={`modal ${wide ? 'wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-btn" aria-label="Close dialog" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        {children}
      </motion.div>
    </div>
  );
}
export default function WorkspaceApp() {
  const connection = useConnection();
  const state = useWorkspace(),
    dispatch = useAppDispatch(),
    router = useRouter(),
    path = usePathname();
  const active = nav.find((n) => path.startsWith(n.path)) || {
    name: 'Boards',
    sub: 'A shared space for your next big thing.',
  };
  const [boardId, setBoardId] = useState('website'),
    [mobile, setMobile] = useState(false),
    [command, setCommand] = useState(false),
    [query, setQuery] = useState(''),
    [newBoard, setNewBoard] = useState(false),
    [editTask, setEditTask] = useState<Task | null>(null),
    [ai, setAi] = useState(false),
    [notice, setNotice] = useState(false),
    [account, setAccount] = useState(false),
    [toast, setToast] = useState(''),
    [mounted, setMounted] = useState(false);
  const board = state.boards.find((b) => b.id === boardId) || state.boards[0];
  useEffect(() => {
    setMounted(true);
    const id = new URLSearchParams(location.search).get('id');
    if (id) setBoardId(id);
  }, [path]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommand((s) => !s);
      }
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3200);
    return () => clearTimeout(t);
  }, [toast]);
  function openBoard(b: Board) {
    setBoardId(b.id);
    dispatch(actions.visit(b.id));
    if (!path.startsWith('/app/boards') || new URLSearchParams(location.search).get('id') !== b.id)
      startNavigation();
    router.push(`/app/boards?id=${b.id}`);
    setCommand(false);
    setQuery('');
  }
  function taskNew(column: Task['column'] = 'To do', id = board?.id) {
    if (!id) return;
    setEditTask({
      id: crypto.randomUUID(),
      boardId: id,
      title: '',
      description: '',
      column,
      priority: 'Medium',
      due: '',
      assignee: connection.userId,
      label: '',
      created: Date.now(),
      subtasks: [],
    });
  }
  const boardTask = (t: Task) => {
    setEditTask(t);
    setCommand(false);
  };
  return (
    <div className={`app-shell ${state.collapsed ? 'is-collapsed' : ''}`}>
      {mobile && <div className="mobile-scrim" onClick={() => setMobile(false)} />}
      <aside className={`sidebar ${mobile ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <Link href="/" className="brand">
            <Logo />
            <span>
              constrack<span className="brand-dot">.</span>
            </span>
          </Link>
          <button
            className="collapse"
            aria-label="Toggle sidebar"
            onClick={() => dispatch(actions.collapse())}
          >
            {state.collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>
        <div className="workspace-selector">
          <span className="workspace-letter">S</span>
          <div>
            <strong>{connection.workspaceName}</strong>
            <small>{connection.members.length} members</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <span className="nav-caption">WORKSPACE</span>
        <nav>
          {nav.map((n) => (
            <Link
              title={n.name}
              onClick={() => setMobile(false)}
              key={n.name}
              href={n.path}
              className={active.name === n.name ? 'active' : ''}
            >
              <n.icon size={19} />
              <span>{n.name}</span>
              {n.name === 'My Tasks' && (
                <em>
                  {
                    state.tasks.filter(
                      (t) => t.assignee === connection.userId && t.column !== 'Done',
                    ).length
                  }
                </em>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-ai">
            <Sparkles size={21} />
            <strong>A head start, powered by AI.</strong>
            <p>Less planning. More making.</p>
            <button onClick={() => setAi(true)}>
              Explore Constrack AI <ArrowUpRight size={15} />
            </button>
          </div>
          <button className="sidebar-link" onClick={() => setCommand(true)}>
            <Search size={18} />
            <span>Help & search</span>
            <kbd>⌘ K</kbd>
          </button>
          <button className="sidebar-link" onClick={() => void connection.signOut()}>
            <LogOut size={18} />
            <span>Sign out</span>
          </button>
          <div className="sidebar-profile">
            <Avatar name={state.profile.name} />
            <div>
              <strong>{state.profile.name}</strong>
              <small>{state.profile.email}</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <div className="page-name">
            <button
              className="icon-btn mobile-toggle"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <div>
              <strong>{active.name}</strong>
              <span>{active.sub}</span>
            </div>
          </div>
          <div className="top-actions">
            <button className="search-trigger" onClick={() => setCommand(true)}>
              <Search size={16} />
              <span>Search anything...</span>
              <kbd>⌘ K</kbd>
            </button>
            <button
              className="icon-btn notification"
              aria-label="Notifications"
              onClick={() => setNotice(true)}
            >
              <Bell size={19} />
            </button>
            <span className="divider" />
            <button className="button primary small-btn" onClick={() => setNewBoard(true)}>
              <Plus size={17} />
              <span>New board</span>
            </button>
            <div className="account-wrap">
              <button className="account-trigger" onClick={() => setAccount(!account)}>
                <Avatar name={state.profile.name} small />
                <span>{state.profile.name.split(' ')[0]}</span>
                <ChevronDown size={13} />
              </button>
              {account && (
                <div className="account-menu">
                  <strong>{state.profile.name}</strong>
                  <small>{state.profile.email}</small>
                  <Link href="/app/settings" onClick={() => setAccount(false)}>
                    Edit information <ArrowUpRight size={14} />
                  </Link>
                  <button onClick={() => void connection.signOut()}>
                    Sign out <LogOut size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="content">
          <div className="demo-line">
            <span>
              <i /> {connection.workspaceName}
            </span>
            <span role="status">{connection.status}</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={path}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {active.name === 'Dashboard' && (
                <Dashboard
                  openBoard={openBoard}
                  onNew={() => setNewBoard(true)}
                  onAI={() => setAi(true)}
                  mounted={mounted}
                />
              )}
              {active.name === 'My Tasks' && <MyTasks onTask={boardTask} />}
              {active.name === 'Calendar' && <Calendar onTask={boardTask} />}
              {active.name === 'Team' && <ConnectedTeam />}
              {active.name === 'Settings' && <ConnectedPreferences />}
              {active.name === 'Boards' && board && (
                <BoardView
                  board={board}
                  onTask={boardTask}
                  onAdd={taskNew}
                  onAI={() => setAi(true)}
                  onShare={() => router.push('/app/team/')}
                />
              )}
            </motion.div>
          </AnimatePresence>
          <footer className="app-footer">
            <span>Made for the way you work.</span>
            <span>
              <Logo /> Constrack
            </span>
          </footer>
        </main>
      </div>
      {newBoard && (
        <Modal
          title="A new space for great work"
          subtitle="Give your next project a place to grow."
          onClose={() => setNewBoard(false)}
        >
          <form
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const b: Board = {
                id: crypto.randomUUID(),
                name: String(data.get('name')).trim(),
                description: String(data.get('description')).trim(),
                color: String(data.get('color')) as Board['color'],
                icon: 'FolderKanban',
                owned: true,
                ownerId: connection.userId,
                updated: Date.now(),
              };
              if (!b.name) return;
              dispatch(actions.addBoard(b));
              setNewBoard(false);
              openBoard(b);
              setToast('Board added · saving to workspace');
            }}
          >
            <label>
              Board name
              <input name="name" placeholder="e.g. Our next big idea" required maxLength={80} />
            </label>
            <label>
              Description
              <textarea
                name="description"
                placeholder="What are we working towards?"
                maxLength={500}
              />
            </label>
            <label>
              Board color
              <select name="color">
                <option value="mint">Fresh mint</option>
                <option value="purple">Soft lavender</option>
                <option value="peach">Warm peach</option>
                <option value="blue">Sky blue</option>
              </select>
            </label>
            <div className="modal-actions">
              <button type="button" className="button" onClick={() => setNewBoard(false)}>
                Cancel
              </button>
              <button className="button primary" type="submit">
                Create board <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </Modal>
      )}
      {editTask && (
        <TaskEditor
          task={editTask}
          onClose={() => setEditTask(null)}
          onSave={(t) => {
            dispatch({
              ...actions.saveTask(t),
              meta: { before: editTask.title ? editTask : null },
            });
            setEditTask(null);
            setToast('Task updated · saving to workspace');
          }}
        />
      )}
      {command && (
        <Modal
          title="Where would you like to go?"
          onClose={() => {
            setCommand(false);
            setQuery('');
          }}
          wide
        >
          <div className="command-input">
            <Search size={20} />
            <input
              placeholder="Search boards, tasks, or pages..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search everything"
            />
          </div>
          <div className="command-results">
            <span className="eyebrow">NAVIGATION</span>
            {nav
              .filter((n) => n.name.toLowerCase().includes(query.toLowerCase()))
              .map((n) => (
                <button
                  key={n.name}
                  onClick={() => {
                    if (path !== n.path) startNavigation();
                    router.push(n.path);
                    setCommand(false);
                    setQuery('');
                  }}
                >
                  <n.icon size={18} />
                  {n.name}
                  <ArrowUpRight size={15} />
                </button>
              ))}
            <span className="eyebrow">BOARDS</span>
            {state.boards
              .filter((b) => b.name.toLowerCase().includes(query.toLowerCase()))
              .map((b) => (
                <button key={b.id} onClick={() => openBoard(b)}>
                  <BoardIcon board={b} />
                  {b.name}
                  <ArrowRight size={15} />
                </button>
              ))}
            {query && (
              <>
                <span className="eyebrow">TASKS</span>
                {state.tasks
                  .filter((t) => t.title.toLowerCase().includes(query.toLowerCase()))
                  .slice(0, 10)
                  .map((t) => (
                    <button key={t.id} onClick={() => boardTask(t)}>
                      <CheckSquare size={17} />
                      {t.title}
                      <ArrowUpRight size={15} />
                    </button>
                  ))}
              </>
            )}
            <button
              onClick={() => {
                setCommand(false);
                setNewBoard(true);
              }}
            >
              <Plus size={18} />
              Create a new board
            </button>
          </div>
          <div className="command-footer">
            Tab to navigate · Enter to open <span>ESC to close</span>
          </div>
        </Modal>
      )}
      {ai && (
        <Modal
          title="Constrack AI"
          subtitle="Generate, review, and apply your next steps."
          onClose={() => setAi(false)}
          wide
        >
          <AIPlanner initialBoard={board?.id} onClose={() => setAi(false)} />
        </Modal>
      )}
      {notice && (
        <Modal
          title="You're all caught up"
          subtitle="A little less noise, a little more focus."
          onClose={() => setNotice(false)}
        >
          <div className="empty-state">
            <Bell size={36} />
            <h3>No notifications yet</h3>
            <p>
              Check My Tasks for assignments and Team for invitations. In-app notification history
              is not available yet.
            </p>
          </div>
        </Modal>
      )}
      {toast && (
        <div role="status" className="toast">
          <CheckCircle2 size={19} />
          {toast}
          <button aria-label="Dismiss notification" onClick={() => setToast('')}>
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

function Dashboard({
  openBoard,
  onNew,
  onAI,
  mounted,
}: {
  openBoard: (b: Board) => void;
  onNew: () => void;
  onAI: () => void;
  mounted: boolean;
}) {
  const connection = useConnection();
  const s = useWorkspace();
  const [filter, setFilter] = useState('All boards'),
    [search, setSearch] = useState(''),
    [sort, setSort] = useState('recent');
  const owned = s.boards.filter((b) => b.ownerId === connection.userId).length;
  const recent = s.recent
    .map((id) => s.boards.find((b) => b.id === id))
    .filter((b): b is Board => !!b);
  const selected = s.boards
    .filter(
      (b) =>
        (filter === 'All boards' ||
          (filter === 'Owned by you'
            ? b.ownerId === connection.userId
            : !(b.ownerId === connection.userId))) &&
        b.name.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : b.updated - a.updated));
  const hour = new Date().getHours();
  const greeting = !mounted
    ? 'Hello'
    : hour < 12
      ? 'Good morning'
      : hour < 17
        ? 'Good afternoon'
        : 'Good evening';
  const due = s.tasks.filter(
    (t) => t.due === today() && t.column !== 'Done' && t.assignee === connection.userId,
  ).length;
  return (
    <>
      <div className="greeting">
        <div>
          <div className="eyebrow">YOUR WORK, AT A GLANCE</div>
          <h1>
            {greeting}, {s.profile.name.split(' ')[0]} <span className="wave">✦</span>
          </h1>
          <p>
            Let’s make a little progress today. <strong>{due} tasks</strong> are due today.
          </p>
        </div>
        <div className="date-chip">
          <CalendarDays size={16} />
          {mounted
            ? new Date().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : 'Your workspace'}
        </div>
      </div>
      <div className="metrics">
        {[
          {
            title: 'Total boards',
            value: s.boards.length,
            icon: Columns3,
            note: 'Spaces for your ideas',
            color: 'mint',
          },
          {
            title: 'Total tasks',
            value: s.tasks.length,
            icon: ListTodo,
            note: 'Small steps, big progress',
            color: 'blue',
          },
          {
            title: 'Owned by you',
            value: owned,
            icon: FolderKanban,
            note: 'Your projects to lead',
            color: 'peach',
          },
          {
            title: 'Shared with you',
            value: s.boards.length - owned,
            icon: Users,
            note: 'Better when built together',
            color: 'purple',
          },
        ].map((m) => (
          <div className="metric" key={m.title}>
            <div className="metric-top">
              <span>{m.title}</span>
              <span className={`metric-icon ${m.color}`}>
                <m.icon size={19} />
              </span>
            </div>
            <strong className="metric-value">{String(m.value).padStart(2, '0')}</strong>
            <small>
              {m.note}
              <ArrowUpRight size={13} />
            </small>
          </div>
        ))}
      </div>
      <div className="analysis-grid">
        <section className="panel analysis">
          <div className="section-heading">
            <div>
              <h2>Board analysis</h2>
              <p>A clearer picture of your progress.</p>
            </div>
            <span className="subtle-pill">
              All time <ChevronDown size={12} />
            </span>
          </div>
          <div className="chart-and-legend">
            <div className="chart">
              <div className="chart-y">
                <span>100%</span>
                <span>75%</span>
                <span>50%</span>
                <span>25%</span>
                <span>0%</span>
              </div>
              <div className="chart-plot">
                {s.boards.slice(0, 6).map((b) => {
                  const ts = s.tasks.filter((t) => t.boardId === b.id),
                    done = ts.filter((t) => t.column === 'Done').length,
                    progress = ts.filter((t) =>
                      ['In progress', 'In review'].includes(t.column),
                    ).length,
                    total = ts.length || 1;
                  return (
                    <div className="chart-column" key={b.id}>
                      <div
                        className="bar"
                        aria-label={`${b.name}: ${done} completed, ${progress} in progress, ${ts.length - done - progress} to do`}
                      >
                        <div
                          style={{
                            height: `${ts.length ? ((total - done - progress) / total) * 100 : 0}%`,
                          }}
                          className="bar-todo"
                        />
                        <div
                          style={{ height: `${(progress / total) * 100}%` }}
                          className="bar-progress"
                        />
                        <div style={{ height: `${(done / total) * 100}%` }} className="bar-done" />
                      </div>
                      <span>{b.name.split(' ').slice(0, 2).join(' ')}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="chart-legend">
              <strong>Breakdown</strong>
              <span>
                <i className="dot done" />
                Completed
              </span>
              <span>
                <i className="dot progress" />
                In progress
              </span>
              <span>
                <i className="dot todo" />
                To do
              </span>
              <div className="legend-note">
                <ArrowUpRight size={16} />
                <p>
                  Every small step
                  <br />
                  moves you forward.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="panel compositions">
          <div className="section-heading">
            <div>
              <h2>Compositions</h2>
              <p>Your own. And your shared.</p>
            </div>
            <Users size={18} />
          </div>
          <div
            className="donut"
            role="img"
            aria-label={`${owned} owned boards and ${s.boards.length - owned} shared boards`}
            style={{
              background: `conic-gradient(#006b54 0 ${s.boards.length ? (owned / s.boards.length) * 100 : 0}%, #adebcd 0 100%)`,
            }}
          >
            <div>
              <strong>{String(s.boards.length).padStart(2, '0')}</strong>
              <span>Total boards</span>
            </div>
          </div>
          <div className="composition-label">
            <span>
              <i className="dot done" />
              Owned by you
            </span>
            <strong>
              {owned}
              <small>{s.boards.length ? Math.round((owned / s.boards.length) * 100) : 0}%</small>
            </strong>
          </div>
          <div className="composition-label">
            <span>
              <i className="dot progress" />
              Shared with you
            </span>
            <strong>
              {s.boards.length - owned}
              <small>
                {s.boards.length
                  ? Math.round(((s.boards.length - owned) / s.boards.length) * 100)
                  : 0}
                %
              </small>
            </strong>
          </div>
        </section>
      </div>
      <section className="recents-section">
        <div className="section-heading">
          <div>
            <h2>
              Recently opened <span className="count">{recent.length}</span>
            </h2>
            <p>Jump back in. Pick up where you left off.</p>
          </div>
          <Clock size={18} />
        </div>
        <div className="recent-grid">
          {recent.slice(0, 3).map((b) => (
            <button className="recent-card" key={b.id} onClick={() => openBoard(b)}>
              <BoardIcon board={b} />
              <div>
                <strong>{b.name}</strong>
                <small>
                  {s.tasks.filter((t) => t.boardId === b.id).length} tasks ·{' '}
                  {b.ownerId === connection.userId ? 'Owned by you' : 'Shared with you'}
                </small>
              </div>
              <ArrowUpRight size={17} />
            </button>
          ))}
        </div>
      </section>
      <section className="boards-section">
        <div className="section-heading">
          <div>
            <h2>
              All boards <span className="count">{s.boards.length}</span>
            </h2>
            <p>A home for everything you’re building.</p>
          </div>
          <button className="button primary" onClick={onNew}>
            <Plus size={16} />
            New board
          </button>
        </div>
        <div className="board-controls">
          <div className="tabs">
            {['All boards', 'Owned by you', 'Shared with you'].map((f) => (
              <button
                key={f}
                className={filter === f ? 'selected' : ''}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="filter-controls">
            <div className="search-field">
              <Search size={15} />
              <input
                aria-label="Search boards"
                placeholder="Search boards..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select aria-label="Sort boards" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="recent">Recently updated</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
        </div>
        <div className="board-grid">
          {selected.map((b) => (
            <BoardCard key={b.id} board={b} onClick={() => openBoard(b)} />
          ))}
          <button className="new-board-card" onClick={onNew}>
            <span>
              <Plus size={23} />
            </span>
            <strong>A fresh start</strong>
            <p>Create a board for your next idea</p>
          </button>
        </div>
        {!selected.length && <p className="no-results">No boards match your search.</p>}
      </section>
      <div className="ai-banner">
        <div className="ai-orbit">
          <Sparkles size={24} />
        </div>
        <div>
          <strong>Big ideas. Clear next steps.</strong>
          <p>Meet your planning partner, Constrack AI.</p>
        </div>
        <button onClick={onAI}>
          Explore AI features <ArrowUpRight size={16} />
        </button>
        <span className="banner-star">✧</span>
      </div>
    </>
  );
}
function BoardCard({ board: b, onClick }: { board: Board; onClick: () => void }) {
  const connection = useConnection();
  const s = useWorkspace();
  const ts = s.tasks.filter((t) => t.boardId === b.id);
  const done = ts.filter((t) => t.column === 'Done').length,
    pct = ts.length ? Math.round((done / ts.length) * 100) : 0;
  return (
    <button className="board-card" onClick={onClick}>
      <div className="board-card-top">
        <BoardIcon board={b} />
        <span className="ownership">{b.ownerId === connection.userId ? 'Owned' : 'Shared'}</span>
        <ArrowUpRight size={17} />
      </div>
      <h3>{b.name}</h3>
      <p>{b.description}</p>
      <div className="progress-caption">
        <span>Progress</span>
        <strong>{pct}%</strong>
      </div>
      <div className="progress-track">
        <span style={{ width: `${pct}%` }} />
      </div>
      <div className="board-card-footer">
        <div className="avatar-stack">
          <Avatar name={s.profile.name} small />
        </div>
        <span>
          <CheckCircle2 size={13} />
          {done}/{ts.length} tasks
        </span>
      </div>
    </button>
  );
}
function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  return (
    <button
      className="task-card"
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', task.id)}
      onClick={onClick}
    >
      <div className="task-tags">
        {task.label && (
          <span className={`label-tag ${task.label === 'Design' ? 'lavender' : ''}`}>
            {task.label}
          </span>
        )}
        <MoreHorizontal size={16} />
      </div>
      <h3>{task.title}</h3>
      <span className={`priority ${task.priority.toLowerCase()}`}>
        <Flag size={11} />
        {task.priority}
      </span>
      <div className="task-card-footer">
        <span className={task.due && task.due < today() && task.column !== 'Done' ? 'overdue' : ''}>
          {task.due && (
            <>
              <CalendarDays size={12} />
              {new Date(task.due + 'T12:00:00').toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </>
          )}
        </span>
        <span>
          {task.subtasks.length > 0 && (
            <>
              <CheckSquare size={12} />
              {task.subtasks.filter((x) => x.done).length}/{task.subtasks.length}
            </>
          )}
        </span>
        <Avatar name={task.assignee || 'Unassigned'} small />
      </div>
    </button>
  );
}
function BoardView({
  board,
  onTask,
  onAdd,
  onAI,
  onShare,
}: {
  board: Board;
  onTask: (t: Task) => void;
  onAdd: (column?: Task['column']) => void;
  onAI: () => void;
  onShare: () => void;
}) {
  const s = useWorkspace(),
    dispatch = useAppDispatch();
  const [search, setSearch] = useState(''),
    [priority, setPriority] = useState('All priorities'),
    [hover, setHover] = useState('');
  const tasks = s.tasks.filter(
    (t) =>
      t.boardId === board.id &&
      t.title.toLowerCase().includes(search.toLowerCase()) &&
      (priority === 'All priorities' || t.priority === priority),
  );
  return (
    <>
      <div className="board-heading">
        <div>
          <Link className="back-link" href="/app/dashboard">
            <ArrowLeft size={14} />
            All boards
          </Link>
          <div className="board-title">
            <BoardIcon board={board} />
            <h1>{board.name}</h1>
          </div>
          <p>{board.description}</p>
        </div>
        <div className="board-heading-actions">
          <div className="avatar-stack">
            <Avatar name={s.profile.name} small />
          </div>
          <button className="button" onClick={onShare}>
            <Users size={16} />
            Share board
          </button>
        </div>
      </div>
      <div className="kanban-toolbar">
        <div className="filter-controls">
          <div className="search-field">
            <Search size={16} />
            <input
              placeholder="Search tasks..."
              aria-label="Search tasks"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            aria-label="Filter task priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            {['All priorities', 'Low', 'Medium', 'High', 'Urgent'].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="filter-controls">
          <button className="button ai-button" onClick={onAI}>
            <Sparkles size={16} />
            AI actions
          </button>
          <button className="button primary" onClick={() => onAdd()}>
            <Plus size={16} />
            Add task
          </button>
        </div>
      </div>
      <div className="kanban">
        {columns.map((column, i) => (
          <section
            key={column}
            className={`kanban-column ${hover === column ? 'drop-active' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setHover(column);
            }}
            onDragLeave={() => setHover('')}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData('text/plain');
              if (tasks.some((t) => t.id === id)) dispatch(actions.moveTask({ id, column }));
              setHover('');
            }}
          >
            <header>
              <i className={`column-dot c${i}`} />
              <strong>{column}</strong>
              <span>{tasks.filter((t) => t.column === column).length}</span>
              <button
                className="icon-btn"
                aria-label={`Add task to ${column}`}
                onClick={() => onAdd(column)}
              >
                <Plus size={16} />
              </button>
            </header>
            {tasks
              .filter((t) => t.column === column)
              .map((t) => (
                <TaskCard key={t.id} task={t} onClick={() => onTask(t)} />
              ))}
            <button className="add-task" onClick={() => onAdd(column)}>
              <Plus size={15} />
              Add task
            </button>
          </section>
        ))}
      </div>
      <p className="kanban-hint">
        <GripVertical size={14} />
        Drag tasks between columns, or open a task to change its status.
      </p>
    </>
  );
}
function TaskEditor({
  task,
  onClose,
  onSave,
}: {
  task: Task;
  onClose: () => void;
  onSave: (t: Task) => void;
}) {
  const [draft, setDraft] = useState({ ...task, subtasks: task.subtasks.map((x) => ({ ...x })) }),
    [sub, setSub] = useState('');
  const connection = useConnection();
  const s = useWorkspace();
  return (
    <Modal
      title={task.title ? 'Task details' : 'Make your next move'}
      subtitle={s.boards.find((b) => b.id === task.boardId)?.name}
      onClose={onClose}
      wide
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.title.trim()) onSave({ ...draft, title: draft.title.trim() });
        }}
      >
        <label>
          Task title
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            required
            maxLength={160}
            placeholder="What needs to happen?"
          />
        </label>
        <div className="form-grid">
          <label>
            Status
            <select
              value={draft.column}
              onChange={(e) => setDraft({ ...draft, column: e.target.value as Task['column'] })}
            >
              {columns.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select
              value={draft.priority}
              onChange={(e) => setDraft({ ...draft, priority: e.target.value as Priority })}
            >
              {['Low', 'Medium', 'High', 'Urgent'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Due date
            <input
              type="date"
              value={draft.due}
              onChange={(e) => setDraft({ ...draft, due: e.target.value })}
            />
          </label>
          <label>
            Assignee
            <select
              value={draft.assignee}
              onChange={(e) => setDraft({ ...draft, assignee: e.target.value })}
            >
              <option value="">Unassigned</option>
              {connection.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Description
          <textarea
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder="Add context, ideas, or acceptance criteria..."
            rows={3}
          />
        </label>
        <label>
          Label
          <input
            value={draft.label}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            placeholder="Design, Development..."
            maxLength={30}
          />
        </label>
        <div className="subtask-heading">
          <strong>Subtasks</strong>
          <small>
            {draft.subtasks.filter((x) => x.done).length}/{draft.subtasks.length} complete
          </small>
        </div>
        {draft.subtasks.map((t, i) => (
          <label className="check-row" key={i}>
            <input
              type="checkbox"
              checked={t.done}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  subtasks: draft.subtasks.map((st, j) =>
                    j === i ? { ...st, done: e.target.checked } : st,
                  ),
                })
              }
            />
            <span>{t.title}</span>
          </label>
        ))}
        <div className="subtask-input">
          <input
            aria-label="New subtask"
            value={sub}
            onChange={(e) => setSub(e.target.value)}
            placeholder="Add a small next step..."
          />
          <button
            type="button"
            className="button"
            onClick={() => {
              if (sub.trim()) {
                setDraft({
                  ...draft,
                  subtasks: [...draft.subtasks, { title: sub.trim(), done: false }],
                });
                setSub('');
              }
            }}
          >
            <Plus size={16} />
            Add
          </button>
        </div>
        <div className="modal-actions">
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button primary">
            <Check size={16} />
            Save task
          </button>
        </div>
      </form>
    </Modal>
  );
}
function MyTasks({ onTask }: { onTask: (t: Task) => void }) {
  const connection = useConnection();
  const s = useWorkspace();
  const [search, setSearch] = useState(''),
    [priority, setPriority] = useState('All priorities'),
    [board, setBoard] = useState('all'),
    [view, setView] = useState('cards'),
    [sort, setSort] = useState('new');
  const mine = s.tasks.filter((t) => t.assignee === connection.userId);
  const tasks = mine
    .filter(
      (t) =>
        t.title.toLowerCase().includes(search.toLowerCase()) &&
        (priority === 'All priorities' || t.priority === priority) &&
        (board === 'all' || t.boardId === board),
    )
    .sort((a, b) => (sort === 'new' ? b.created - a.created : a.created - b.created));
  const date = new Date(),
    weekday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - weekday);
  const monday = date.toLocaleDateString('en-CA');
  date.setDate(date.getDate() + 6);
  const sunday = date.toLocaleDateString('en-CA');
  return (
    <>
      <div className="greeting">
        <div>
          <div className="eyebrow">YOUR PERSONAL FOCUS</div>
          <h1>A little focus goes a long way.</h1>
          <p>Everything assigned to you, in one calm place.</p>
        </div>
      </div>
      <div className="metrics">
        {[
          ['Assigned to you', mine.length],
          ['Overdue', mine.filter((t) => t.due && t.due < today() && t.column !== 'Done').length],
          [
            'Due this week',
            mine.filter((t) => t.due >= monday && t.due <= sunday && t.column !== 'Done').length,
          ],
          ['Completed', mine.filter((t) => t.column === 'Done').length],
        ].map(([name, n]) => (
          <div className="metric" key={name}>
            <span>{name}</span>
            <strong className="metric-value">{String(n).padStart(2, '0')}</strong>
          </div>
        ))}
      </div>
      <div className="kanban-toolbar">
        <div className="filter-controls">
          <div className="search-field">
            <Search size={16} />
            <input
              placeholder="Find a task..."
              aria-label="Find your tasks"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            aria-label="Filter by priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            {['All priorities', 'Low', 'Medium', 'High', 'Urgent'].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <select
            aria-label="Filter by board"
            value={board}
            onChange={(e) => setBoard(e.target.value)}
          >
            <option value="all">All boards</option>
            {s.boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-controls">
          <select aria-label="Sort tasks" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="new">Newest first</option>
            <option value="old">Oldest first</option>
          </select>
          <button
            aria-label="Card view"
            className={`icon-btn ${view === 'cards' ? 'chosen' : ''}`}
            onClick={() => setView('cards')}
          >
            <Grid2X2 size={18} />
          </button>
          <button
            aria-label="List view"
            className={`icon-btn ${view === 'list' ? 'chosen' : ''}`}
            onClick={() => setView('list')}
          >
            <List size={18} />
          </button>
        </div>
      </div>
      {s.boards
        .filter((b) => tasks.some((t) => t.boardId === b.id))
        .map((b) => (
          <section className="my-task-group" key={b.id}>
            <h2>
              <BoardIcon board={b} />
              {b.name}
              <span className="count">{tasks.filter((t) => t.boardId === b.id).length}</span>
            </h2>
            <div className={view === 'cards' ? 'task-grid' : 'task-list'}>
              {tasks
                .filter((t) => t.boardId === b.id)
                .map((t) =>
                  view === 'cards' ? (
                    <TaskCard key={t.id} task={t} onClick={() => onTask(t)} />
                  ) : (
                    <button key={t.id} onClick={() => onTask(t)} className="task-row">
                      <CheckSquare size={17} />
                      <strong>{t.title}</strong>
                      <span className={`priority ${t.priority.toLowerCase()}`}>{t.priority}</span>
                      <span>{t.column}</span>
                      <span>{t.due || 'No due date'}</span>
                      <ArrowUpRight size={15} />
                    </button>
                  ),
                )}
            </div>
          </section>
        ))}
      {!tasks.length && (
        <div className="empty-state">
          <CheckCircle2 size={36} />
          <h3>A clear space</h3>
          <p>No tasks match these filters.</p>
        </div>
      )}
    </>
  );
}
function Calendar({ onTask }: { onTask: (t: Task) => void }) {
  const s = useWorkspace(),
    [month, setMonth] = useState(() => new Date()),
    [selected, setSelected] = useState('');
  const year = month.getFullYear(),
    m = month.getMonth();
  const first = (new Date(year, m, 1).getDay() + 6) % 7,
    total = new Date(year, m + 1, 0).getDate();
  return (
    <>
      <div className="greeting">
        <div>
          <div className="eyebrow">MAKE TIME FOR WHAT MATTERS</div>
          <h1>Your days, thoughtfully planned.</h1>
          <p>A little perspective on what’s coming next.</p>
        </div>
      </div>
      <section className="panel calendar-panel">
        <div className="section-heading">
          <h2>{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
          <div className="filter-controls">
            <button className="button" onClick={() => setMonth(new Date())}>
              Today
            </button>
            <button
              className="icon-btn"
              aria-label="Previous month"
              onClick={() => setMonth(new Date(year, m - 1, 1))}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              className="icon-btn"
              aria-label="Next month"
              onClick={() => setMonth(new Date(year, m + 1, 1))}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <div className="calendar-grid">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div className="calendar-weekday" key={d}>
              {d}
            </div>
          ))}
          {Array.from({ length: Math.ceil((first + total) / 7) * 7 }, (_, i) => {
            const n = i - first + 1;
            const key = `${year}-${String(m + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
            const ts = s.tasks.filter((t) => t.due === key);
            return (
              <div
                key={i}
                className={`calendar-cell ${n < 1 || n > total ? 'outside' : ''} ${key === today() ? 'today' : ''}`}
              >
                {n > 0 && n <= total && (
                  <>
                    <span className="day-number">{n}</span>
                    {ts.slice(0, 3).map((t) => (
                      <button
                        key={t.id}
                        title={t.title}
                        onClick={() => onTask(t)}
                        className={t.column === 'Done' ? 'done-event' : ''}
                      >
                        {t.title}
                      </button>
                    ))}
                    {ts.length > 3 && (
                      <button onClick={() => setSelected(key)}>+{ts.length - 3} more</button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>
      <section className="my-task-group">
        <h2>
          Unscheduled <span className="count">{s.tasks.filter((t) => !t.due).length}</span>
        </h2>
        <div className="task-grid">
          {s.tasks
            .filter((t) => !t.due)
            .map((t) => (
              <TaskCard key={t.id} task={t} onClick={() => onTask(t)} />
            ))}
        </div>
        {!s.tasks.some((t) => !t.due) && (
          <p className="muted">Everything has its time. All tasks have a due date.</p>
        )}
      </section>
      {selected && (
        <Modal title="Tasks for this day" subtitle={selected} onClose={() => setSelected('')}>
          <div className="command-results">
            {s.tasks
              .filter((t) => t.due === selected)
              .map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelected('');
                    onTask(t);
                  }}
                >
                  {t.title}
                  <ArrowUpRight size={16} />
                </button>
              ))}
          </div>
        </Modal>
      )}
    </>
  );
}
