import { useState, ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';

// Prewired Supabase client — swap in real env vars or use SupabaseConnector to inject at runtime
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL ?? '',
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
);

// ── Types ─────────────────────────────────────────────────────────────────────

type Page = 'home' | 'about' | 'pricing' | 'contact';

// ── Shared Nav ────────────────────────────────────────────────────────────────

const NAV_LINKS: { id: Page; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'contact', label: 'Contact' },
];

function Nav({ current, onNav }: { current: Page; onNav: (p: Page) => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-40 border-b border-white/8 backdrop-blur-md"
      style={{ background: 'rgba(15,15,35,0.9)' }}
    >
      <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
        {/* Logo */}
        <button onClick={() => onNav('home')} className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500" />
          <span className="font-bold text-white">Acme</span>
        </button>

        {/* Desktop nav */}
        <nav className="hidden md:flex gap-1">
          {NAV_LINKS.map((l) => (
            <button
              key={l.id}
              onClick={() => onNav(l.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                current === l.id
                  ? 'bg-white/8 text-white'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              {l.label}
            </button>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => onNav('contact')}
            className="px-5 py-2 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Get started
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-white/60 hover:text-white"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/8 px-6 py-4 space-y-1">
          {NAV_LINKS.map((l) => (
            <button
              key={l.id}
              onClick={() => { onNav(l.id); setMobileOpen(false); }}
              className={`block w-full text-left px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                current === l.id ? 'bg-white/8 text-white' : 'text-white/50 hover:text-white'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}

// ── Shared Layout ─────────────────────────────────────────────────────────────

function Layout({ children }: { children: ReactNode }) {
  const year = new Date().getFullYear();
  return (
    <>
      <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      <footer className="border-t border-white/8 px-6 py-8">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500" />
            <span className="text-sm font-semibold text-white">Acme Inc.</span>
          </div>
          <p className="text-xs text-white/25">&copy; {year} Acme Inc. All rights reserved.</p>
          <nav className="flex gap-5">
            {['Privacy', 'Terms', 'Blog'].map((l) => (
              <a key={l} href="#" className="text-xs text-white/30 hover:text-white/60 transition-colors">
                {l}
              </a>
            ))}
          </nav>
        </div>
      </footer>
    </>
  );
}

// ── Page: Home ────────────────────────────────────────────────────────────────

function HomePage({ onNav }: { onNav: (p: Page) => void }) {
  return (
    <Layout>
      {/* Hero */}
      <section className="relative px-6 pt-24 pb-28 text-center overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(ellipse 70% 55% at 50% 0%, rgba(139,92,246,0.2) 0%, transparent 70%)',
          }}
        />
        <div className="mx-auto max-w-3xl">
          <h1 className="text-5xl font-extrabold text-white tracking-tight mb-6 leading-tight">
            The modern platform for{' '}
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              growing teams
            </span>
          </h1>
          <p className="text-lg text-white/45 mb-10 max-w-xl mx-auto">
            Everything you need to collaborate, ship, and scale — in one beautifully designed workspace.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => onNav('pricing')}
              className="px-8 py-3 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/20"
            >
              View pricing
            </button>
            <button
              onClick={() => onNav('about')}
              className="px-8 py-3 rounded-full border border-white/10 text-white/70 text-sm font-medium hover:bg-white/5 transition-colors"
            >
              Learn more
            </button>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-4xl">
          <p className="text-center text-xs uppercase tracking-widest text-white/25 mb-10">
            Trusted by 500+ teams worldwide
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {['Acme Corp', 'Globex', 'Initech', 'Umbrella'].map((co) => (
              <div
                key={co}
                className="rounded-xl border border-white/8 px-4 py-3 text-center text-sm font-semibold text-white/30"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                {co}
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}

// ── Page: About ───────────────────────────────────────────────────────────────

function AboutPage() {
  const TEAM = [
    { name: 'Alice Chen', role: 'CEO & Co-founder', avatar: 'AC' },
    { name: 'Bob Smith', role: 'CTO & Co-founder', avatar: 'BS' },
    { name: 'Carol Davis', role: 'Head of Design', avatar: 'CD' },
    { name: 'Dan Lee', role: 'Head of Engineering', avatar: 'DL' },
  ];

  return (
    <Layout>
      <section className="px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold text-white mb-6">Our mission</h1>
          <p className="text-white/50 text-lg leading-relaxed mb-16">
            We believe every team deserves tools that are fast, reliable, and genuinely enjoyable to
            use. Founded in 2022, we've grown from a small weekend project to a product used by teams
            across 30 countries.
          </p>

          <h2 className="text-2xl font-bold text-white mb-8">Meet the team</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {TEAM.map((m) => (
              <div
                key={m.name}
                className="flex items-center gap-4 rounded-2xl border border-white/8 p-5"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                  {m.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{m.name}</p>
                  <p className="text-xs text-white/40">{m.role}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Values */}
          <div className="mt-16 space-y-6">
            <h2 className="text-2xl font-bold text-white">Our values</h2>
            {[
              { title: 'Transparency', body: 'We default to open communication internally and with our customers.' },
              { title: 'Quality', body: 'We ship fewer things, but each one is genuinely excellent.' },
              { title: 'Empathy', body: 'Every decision starts with understanding the person on the other side.' },
            ].map((v) => (
              <div key={v.title} className="border-l-2 border-purple-500/40 pl-5">
                <h3 className="text-sm font-semibold text-white mb-1">{v.title}</h3>
                <p className="text-sm text-white/40">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}

// ── Page: Pricing ─────────────────────────────────────────────────────────────

const PLANS = [
  {
    name: 'Starter',
    price: '$0',
    period: 'forever',
    description: 'Perfect for solo projects and exploration.',
    features: ['1 project', '1 GB storage', 'Community support', 'Basic analytics'],
    cta: 'Get started free',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: 'per month',
    description: 'For growing teams who need more power.',
    features: ['Unlimited projects', '100 GB storage', 'Priority support', 'Advanced analytics', 'Custom domains', 'Team members'],
    cta: 'Start free trial',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'Bespoke solutions for large organisations.',
    features: ['Everything in Pro', 'SSO / SAML', 'SLA guarantee', 'Dedicated support', 'On-premise option'],
    cta: 'Contact sales',
    highlight: false,
  },
];

function PricingPage({ onNav }: { onNav: (p: Page) => void }) {
  return (
    <Layout>
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold text-white mb-4">Simple, transparent pricing</h1>
            <p className="text-white/40 max-w-lg mx-auto">
              Start for free, upgrade when you're ready. No hidden fees.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-7 flex flex-col ${
                  plan.highlight
                    ? 'border-purple-500/50 shadow-lg shadow-purple-500/10'
                    : 'border-white/8'
                }`}
                style={{
                  background: plan.highlight
                    ? 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.12) 100%)'
                    : 'rgba(255,255,255,0.03)',
                }}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-xs font-semibold text-white">
                    Most popular
                  </span>
                )}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-white/60 mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                    {plan.period && <span className="text-sm text-white/30">/{plan.period}</span>}
                  </div>
                  <p className="text-sm text-white/40">{plan.description}</p>
                </div>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-white/60">
                      <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => onNav('contact')}
                  className={`w-full py-3 rounded-full text-sm font-semibold transition-opacity ${
                    plan.highlight
                      ? 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white hover:opacity-90'
                      : 'border border-white/10 text-white/70 hover:bg-white/5'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}

// ── Page: Contact ─────────────────────────────────────────────────────────────

function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      // POST to your backend or Supabase table
      if (import.meta.env.VITE_SUPABASE_URL) {
        const { error } = await supabase.from('contact_messages').insert({
          name: form.name,
          email: form.email,
          message: form.message,
        });
        if (error) throw new Error(error.message);
      } else {
        await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }
      setStatus('success');
      setForm({ name: '', email: '', message: '' });
    } catch {
      setStatus('error');
    }
  };

  const inputCls =
    'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-blue-500/50 transition-colors';

  return (
    <Layout>
      <section className="px-6 py-24">
        <div className="mx-auto max-w-lg">
          <h1 className="text-4xl font-bold text-white mb-3">Get in touch</h1>
          <p className="text-white/40 mb-10">We'd love to hear from you. Drop us a message and we'll respond within 24 hours.</p>

          {status === 'success' ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
              <p className="text-emerald-400 font-semibold mb-1">Message received!</p>
              <p className="text-white/40 text-sm">We'll be in touch soon.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="text" value={form.name} onChange={update('name')} placeholder="Your name" required className={inputCls} />
              <input type="email" value={form.email} onChange={update('email')} placeholder="you@company.com" required className={inputCls} />
              <textarea
                value={form.message}
                onChange={update('message')}
                placeholder="How can we help?"
                rows={5}
                required
                className={`${inputCls} resize-none`}
              />
              {status === 'error' && (
                <p className="text-sm text-red-400">Something went wrong. Please try again.</p>
              )}
              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full py-3 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {status === 'loading' ? 'Sending…' : 'Send message'}
              </button>
            </form>
          )}

          {/* Quick contact info */}
          <div className="mt-10 space-y-3">
            {[
              { label: 'Email', value: 'hello@acme.com' },
              { label: 'Address', value: '123 Market St, San Francisco, CA' },
            ].map((item) => (
              <div key={item.label} className="flex gap-3 text-sm">
                <span className="text-white/25 w-16 flex-shrink-0">{item.label}</span>
                <span className="text-white/60">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}

// ── Root Component ────────────────────────────────────────────────────────────

export default function MarketingSite() {
  const [page, setPage] = useState<Page>('home');

  const pageMap: Record<Page, ReactNode> = {
    home: <HomePage onNav={setPage} />,
    about: <AboutPage />,
    pricing: <PricingPage onNav={setPage} />,
    contact: <ContactPage />,
  };

  return (
    <div
      className="min-h-screen text-white"
      style={{ background: 'linear-gradient(135deg, #1a1035 0%, #0f0f23 50%, #0a0a1a 100%)' }}
    >
      <Nav current={page} onNav={setPage} />
      {pageMap[page]}
    </div>
  );
}
