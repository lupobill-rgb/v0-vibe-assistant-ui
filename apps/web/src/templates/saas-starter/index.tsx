import { useState, useEffect, ReactNode, createContext, useContext, useCallback } from 'react';
import { createClient, User, Session } from '@supabase/supabase-js';

// ── Supabase client ───────────────────────────────────────────────────────────

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL ?? '',
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
);

// ── Types ─────────────────────────────────────────────────────────────────────

type Role = 'admin' | 'user';
type Page = 'dashboard' | 'settings' | 'billing' | 'team';

interface Profile {
  id: string;
  email: string;
  role: Role;
  full_name: string | null;
}

// ── Auth + Profile Context ────────────────────────────────────────────────────

interface AuthCtx {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: Role;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);

function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, role, full_name')
      .eq('id', userId)
      .single();
    setProfile(data as Profile | null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) fetchProfile(u.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      const u = s?.user ?? null;
      setUser(u);
      if (u) fetchProfile(u.id);
      else setProfile(null);
    });

    return () => { listener.subscription.unsubscribe(); };
  }, [fetchProfile]);

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
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  const role: Role = profile?.role ?? 'user';

  return (
    <AuthContext.Provider value={{ user, session, profile, role, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Role Guard ────────────────────────────────────────────────────────────────

function RoleGuard({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const { role } = useAuth();
  if (!allow.includes(role)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-white/30 text-sm mb-1">Access restricted</p>
          <p className="text-white/20 text-xs">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

// ── Protected Route ───────────────────────────────────────────────────────────

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <svg className="animate-spin w-8 h-8 text-purple-500" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );
  if (!user) return <AuthPage />;
  return <>{children}</>;
}

// ── Auth Page ─────────────────────────────────────────────────────────────────

function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const err = mode === 'login' ? await signIn(email, password) : await signUp(email, password);
    if (err) setError(err);
    setSubmitting(false);
  };

  const inputCls =
    'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-blue-500/50 transition-colors';

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 p-8"
        style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)' }}>
        <div className="flex justify-center mb-7">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
            S
          </div>
        </div>
        <h2 className="text-lg font-bold text-white text-center mb-6">
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </h2>
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className={inputCls} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required minLength={6} className={inputCls} />
          <button type="submit" disabled={submitting}
            className="w-full py-3 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
            {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Sign up'}
          </button>
        </form>
        <p className="text-center text-sm text-white/35 mt-5">
          {mode === 'login' ? "No account?" : 'Have an account?'}{' '}
          <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
            className="text-purple-400 hover:text-purple-300 transition-colors">
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

interface NavItem { id: Page; label: string; icon: ReactNode; adminOnly?: boolean }

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard', label: 'Dashboard', icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7h18M3 12h18M3 17h18" />
      </svg>
    ),
  },
  {
    id: 'team', label: 'Team', icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    adminOnly: true,
  },
  {
    id: 'billing', label: 'Billing', icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    id: 'settings', label: 'Settings', icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

function Sidebar({ current, onNav }: { current: Page; onNav: (p: Page) => void }) {
  const { role, user, signOut } = useAuth();
  const visibleItems = NAV_ITEMS.filter((i) => !i.adminOnly || role === 'admin');

  return (
    <aside
      className="hidden md:flex flex-col w-56 min-h-screen border-r border-white/8 px-3 py-5"
      style={{ background: 'rgba(255,255,255,0.02)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 mb-8">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500" />
        <span className="font-bold text-white text-sm">SaaS App</span>
      </div>

      {/* Role badge */}
      <div className="px-3 mb-5">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
          role === 'admin'
            ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
            : 'bg-white/5 text-white/35 border-white/10'
        }`}>
          {role}
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-1">
        {visibleItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNav(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              current === item.id
                ? 'bg-white/8 text-white'
                : 'text-white/45 hover:text-white hover:bg-white/5'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/8 pt-4 mt-4 px-3">
        <p className="text-xs text-white/25 truncate mb-2">{user?.email}</p>
        <button
          onClick={signOut}
          className="w-full text-left text-xs text-red-400/60 hover:text-red-400 transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}

// ── Page: Dashboard ───────────────────────────────────────────────────────────

function DashboardPage() {
  const { role } = useAuth();
  const [rows, setRows] = useState<Array<{ id: string; title: string; status: string; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('items').select('*').order('created_at', { ascending: false });
    setRows(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await supabase.from('items').insert({ title: newTitle.trim(), status: 'active' });
    setNewTitle('');
    fetchRows();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        {role === 'admin' && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
            Admin view
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total items', value: rows.length.toString() },
          { label: 'Active', value: rows.filter((r) => r.status === 'active').length.toString() },
          { label: 'This week', value: rows.filter((r) => {
            const d = new Date(r.created_at);
            const week = new Date(); week.setDate(week.getDate() - 7);
            return d > week;
          }).length.toString() },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/8 p-5" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <p className="text-xs text-white/35 mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* CRUD table */}
      <div className="rounded-2xl border border-white/8 overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <h2 className="text-sm font-semibold text-white">Items</h2>
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Add item…"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-white/25 outline-none focus:border-blue-500/50 transition-colors"
            />
            <button type="submit" disabled={!newTitle.trim()}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50">
              Add
            </button>
          </form>
        </div>

        {loading ? (
          <div className="px-5 py-8 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-8 rounded-lg bg-white/5 animate-pulse" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-white/25">No items yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-xs text-white/30 uppercase tracking-wide">
                <th className="px-5 py-3 text-left">Title</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Date</th>
                {role === 'admin' && <th className="px-5 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-white/3 transition-colors">
                  <td className="px-5 py-3 text-white/75">{row.title}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${
                      row.status === 'active' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-white/5 text-white/35 border-white/10'
                    }`}>{row.status}</span>
                  </td>
                  <td className="px-5 py-3 text-white/30 text-xs">{new Date(row.created_at).toLocaleDateString()}</td>
                  {role === 'admin' && (
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={async () => { await supabase.from('items').delete().eq('id', row.id); fetchRows(); }}
                        className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
                      >Delete</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Page: Team (admin only) ───────────────────────────────────────────────────

function TeamPage() {
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('profiles').select('id, email, role, full_name').then(({ data }) => {
      setMembers((data as Profile[]) ?? []);
      setLoading(false);
    });
  }, []);

  const updateRole = async (id: string, role: Role) => {
    await supabase.from('profiles').update({ role }).eq('id', id);
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)));
  };

  return (
    <RoleGuard allow={['admin']}>
      <div className="space-y-6">
        <h1 className="text-xl font-bold text-white">Team</h1>
        <div className="rounded-2xl border border-white/8 overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {loading ? (
            <div className="px-5 py-8 space-y-3">
              {[1, 2].map((i) => <div key={i} className="h-10 rounded-lg bg-white/5 animate-pulse" />)}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-xs text-white/30 uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">Member</th>
                  <th className="px-5 py-3 text-left">Role</th>
                  <th className="px-5 py-3 text-right">Change role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-white/3">
                    <td className="px-5 py-3">
                      <p className="text-white/80 text-sm">{m.full_name ?? '—'}</p>
                      <p className="text-white/30 text-xs">{m.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs border ${
                        m.role === 'admin' ? 'bg-purple-500/15 text-purple-400 border-purple-500/30' : 'bg-white/5 text-white/35 border-white/10'
                      }`}>{m.role}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => updateRole(m.id, m.role === 'admin' ? 'user' : 'admin')}
                        className="text-xs text-white/40 hover:text-white/70 transition-colors"
                      >
                        Make {m.role === 'admin' ? 'user' : 'admin'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}

// ── Page: Settings ────────────────────────────────────────────────────────────

function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    await supabase.from('profiles').update({ full_name: fullName }).eq('id', profile.id);
    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputCls =
    'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-blue-500/50 transition-colors';

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-xl font-bold text-white">Settings</h1>

      {/* Profile */}
      <div className="rounded-2xl border border-white/8 p-6" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-5">Profile</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs text-white/40 mb-1.5">Full name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1.5">Email</label>
            <input type="email" value={profile?.email ?? ''} disabled className={`${inputCls} opacity-40 cursor-not-allowed`} />
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving}
              className="px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {saved && <span className="text-sm text-emerald-400">Saved!</span>}
          </div>
        </form>
      </div>

      {/* Notifications (static placeholder) */}
      <div className="rounded-2xl border border-white/8 p-6" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-5">Notifications</h2>
        {[
          { label: 'Email digest', description: 'Weekly summary of activity' },
          { label: 'Product updates', description: 'New features and changelog' },
        ].map((n) => (
          <div key={n.label} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
            <div>
              <p className="text-sm text-white/80">{n.label}</p>
              <p className="text-xs text-white/35 mt-0.5">{n.description}</p>
            </div>
            <input type="checkbox" defaultChecked className="accent-purple-500 w-4 h-4 cursor-pointer" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page: Billing (placeholder) ───────────────────────────────────────────────

const BILLING_PLANS = [
  { name: 'Free', price: '$0/mo', current: true, features: ['1 seat', '5 GB', 'Community support'] },
  { name: 'Pro', price: '$29/mo', current: false, features: ['10 seats', '100 GB', 'Priority support', 'SSO'] },
  { name: 'Enterprise', price: 'Custom', current: false, features: ['Unlimited seats', 'Dedicated infra', 'SLA'] },
];

function BillingPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Billing</h1>

      {/* Current usage */}
      <div className="rounded-2xl border border-white/8 p-6" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-4">Current plan</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-semibold">Free</p>
            <p className="text-xs text-white/35 mt-0.5">Renews — / —</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-medium">
            Active
          </span>
        </div>

        {/* Storage bar */}
        <div className="mt-5">
          <div className="flex justify-between text-xs text-white/35 mb-1.5">
            <span>Storage used</span>
            <span>1.2 GB / 5 GB</span>
          </div>
          <div className="h-2 rounded-full bg-white/8 overflow-hidden">
            <div className="h-full w-1/4 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
          </div>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {BILLING_PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-2xl border p-5 ${plan.current ? 'border-purple-500/40' : 'border-white/8'}`}
            style={{ background: plan.current ? 'rgba(139,92,246,0.06)' : 'rgba(255,255,255,0.03)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-white text-sm">{plan.name}</p>
              {plan.current && (
                <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30 text-xs">Current</span>
              )}
            </div>
            <p className="text-2xl font-bold text-white mb-4">{plan.price}</p>
            <ul className="space-y-2 mb-5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-white/50">
                  <svg className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <button
              disabled={plan.current}
              className={`w-full py-2 rounded-full text-xs font-semibold transition-opacity ${
                plan.current
                  ? 'bg-white/5 text-white/20 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white hover:opacity-90'
              }`}
            >
              {plan.current ? 'Current plan' : 'Upgrade'}
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs text-white/20 text-center">
        Billing is handled via Stripe. Contact support for invoices or custom pricing.
      </p>
    </div>
  );
}

// ── App Shell ─────────────────────────────────────────────────────────────────

function AppShell() {
  const [page, setPage] = useState<Page>('dashboard');

  const pageMap: Record<Page, ReactNode> = {
    dashboard: <DashboardPage />,
    team: <TeamPage />,
    billing: <BillingPage />,
    settings: <SettingsPage />,
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar current={page} onNav={setPage} />
      <main className="flex-1 px-6 py-8 max-w-5xl">
        {pageMap[page]}
      </main>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function SaasStarter() {
  return (
    <div
      className="min-h-screen text-white"
      style={{ background: 'linear-gradient(135deg, #1a1035 0%, #0f0f23 50%, #0a0a1a 100%)' }}
    >
      <AuthProvider>
        <ProtectedRoute>
          <AppShell />
        </ProtectedRoute>
      </AuthProvider>
    </div>
  );
}
