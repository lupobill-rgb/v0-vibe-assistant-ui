import { useState, useEffect, ReactNode, createContext, useContext, useCallback } from 'react';
import { createClient, User, Session } from '@supabase/supabase-js';

// ── Supabase client ───────────────────────────────────────────────────────────

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL ?? '',
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
);

// ── Auth Context ──────────────────────────────────────────────────────────────

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);

function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });

    return () => { listener.subscription.unsubscribe(); };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signUp({ email, password });
    return error?.message ?? null;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Protected Route ───────────────────────────────────────────────────────────

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <svg className="animate-spin w-8 h-8 text-purple-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (!user) return <AuthPage />;
  return <>{children}</>;
}

// ── Auth Page (Login / Signup) ────────────────────────────────────────────────

function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    const err = mode === 'login'
      ? await signIn(email, password)
      : await signUp(email, password);

    if (err) {
      setError(err);
    } else if (mode === 'signup') {
      setSuccessMsg('Check your email to confirm your account.');
    }
    setLoading(false);
  };

  const inputCls =
    'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-blue-500/50 transition-colors';

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div
        className="w-full max-w-sm rounded-2xl border border-white/10 p-8"
        style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex justify-center mb-7">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        </div>

        <h2 className="text-lg font-bold text-white text-center mb-6">
          {mode === 'login' ? 'Sign in to your account' : 'Create an account'}
        </h2>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className={inputCls} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required minLength={6} className={inputCls} />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-white/35 mt-5">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccessMsg(''); }}
            className="text-purple-400 hover:text-purple-300 transition-colors"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}

// ── CRUD Table ────────────────────────────────────────────────────────────────

interface Row {
  id: string;
  title: string;
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
}

const STATUS_STYLES: Record<Row['status'], string> = {
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  inactive: 'bg-white/5 text-white/35 border-white/10',
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
};

function CrudTable() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const TABLE = 'items'; // change to your Supabase table name

  const fetchRows = useCallback(async () => {
    setLoadingRows(true);
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setRows(data as Row[]);
    setLoadingRows(false);
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setAdding(true);
    const { error } = await supabase.from(TABLE).insert({ title: newTitle.trim(), status: 'pending' });
    if (!error) { setNewTitle(''); await fetchRows(); }
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    setDeleteId(id);
    await supabase.from(TABLE).delete().eq('id', id);
    await fetchRows();
    setDeleteId(null);
  };

  const cycleStatus = async (row: Row) => {
    const next: Row['status'][] = ['pending', 'active', 'inactive'];
    const idx = next.indexOf(row.status);
    const nextStatus = next[(idx + 1) % next.length];
    await supabase.from(TABLE).update({ status: nextStatus }).eq('id', row.id);
    await fetchRows();
  };

  return (
    <div
      className="rounded-2xl border border-white/8 overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.04)' }}
    >
      {/* Header + Add form */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
        <h2 className="text-sm font-semibold text-white">Items</h2>
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="New item title"
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/25 outline-none focus:border-blue-500/50 transition-colors"
          />
          <button
            type="submit"
            disabled={adding || !newTitle.trim()}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {adding ? '…' : 'Add'}
          </button>
        </form>
      </div>

      {/* Loading skeleton */}
      {loadingRows ? (
        <div className="px-5 py-8 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 rounded-lg bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="px-5 py-12 text-center text-sm text-white/25">
          No items yet — add one above.
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-xs text-white/30 uppercase tracking-wide">
              <th className="px-5 py-3 text-left font-medium">Title</th>
              <th className="px-5 py-3 text-left font-medium">Status</th>
              <th className="px-5 py-3 text-left font-medium">Created</th>
              <th className="px-5 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-white/3 transition-colors">
                <td className="px-5 py-3 text-white/80">{row.title}</td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => cycleStatus(row)}
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border cursor-pointer transition-opacity hover:opacity-80 ${STATUS_STYLES[row.status]}`}
                  >
                    {row.status}
                  </button>
                </td>
                <td className="px-5 py-3 text-white/30 text-xs">
                  {new Date(row.created_at).toLocaleDateString()}
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => handleDelete(row.id)}
                    disabled={deleteId === row.id}
                    className="text-xs text-red-400/60 hover:text-red-400 transition-colors disabled:opacity-40"
                  >
                    {deleteId === row.id ? '…' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Dashboard Shell ───────────────────────────────────────────────────────────

function DashboardShell() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="border-b border-white/8 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500" />
          <span className="font-bold text-white">Dashboard</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-white/35">{user?.email}</span>
          <button
            onClick={signOut}
            className="px-3 py-1.5 rounded-lg border border-white/10 text-xs text-white/50 hover:bg-white/5 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full">
        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total items', value: '—' },
            { label: 'Active', value: '—' },
            { label: 'This month', value: '—' },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-white/8 p-5"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <p className="text-xs text-white/35 mb-1">{s.label}</p>
              <p className="text-2xl font-bold text-white">{s.value}</p>
            </div>
          ))}
        </div>

        <CrudTable />
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function AuthDashboard() {
  return (
    <div
      className="min-h-screen text-white"
      style={{ background: 'linear-gradient(135deg, #1a1035 0%, #0f0f23 50%, #0a0a1a 100%)' }}
    >
      <AuthProvider>
        <ProtectedRoute>
          <DashboardShell />
        </ProtectedRoute>
      </AuthProvider>
    </div>
  );
}
