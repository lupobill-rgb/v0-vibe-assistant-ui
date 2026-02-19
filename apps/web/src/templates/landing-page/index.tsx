import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Prewired Supabase client — swap in real env vars or use SupabaseConnector to inject at runtime
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL ?? '',
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
);

// ── Lead Capture ──────────────────────────────────────────────────────────────

async function submitLead(email: string, name: string): Promise<void> {
  const res = await fetch('/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? 'Failed to submit');
  }
}

// ── Section: Hero ─────────────────────────────────────────────────────────────

function HeroSection({ onCtaClick }: { onCtaClick: () => void }) {
  return (
    <section className="relative overflow-hidden px-6 pt-24 pb-32 text-center">
      {/* Background glow */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(59,130,246,0.18) 0%, transparent 70%)',
        }}
      />
      <div className="mx-auto max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/60 mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
          Now in public beta
        </span>
        <h1 className="text-5xl font-extrabold tracking-tight text-white mb-6 leading-tight">
          Build faster with{' '}
          <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            AI-powered tools
          </span>
        </h1>
        <p className="text-lg text-white/50 mb-10 max-w-xl mx-auto">
          Ship in minutes, not months. Our platform automates the tedious parts so you can focus on
          what actually matters.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onCtaClick}
            className="px-8 py-3 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/20"
          >
            Get early access
          </button>
          <a
            href="#features"
            className="px-8 py-3 rounded-full border border-white/10 text-white/70 text-sm font-medium hover:bg-white/5 transition-colors"
          >
            See how it works
          </a>
        </div>
      </div>
    </section>
  );
}

// ── Section: Features ─────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Blazing Fast',
    description: 'Sub-100 ms response times with edge-cached assets and an optimised runtime.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: 'Secure by Default',
    description: 'End-to-end encryption, SOC 2 Type II, and RLS-backed data access out of the box.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Real-time Analytics',
    description: 'Live dashboards, funnel analysis, and anomaly detection with zero setup.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    title: 'Auto-scaling',
    description: 'Handles traffic spikes automatically — pay only for what you use.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    title: 'Developer-first API',
    description: 'RESTful and GraphQL endpoints, typed SDKs, and exhaustive documentation.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    title: 'Team Collaboration',
    description: 'Role-based access, audit logs, and shared workspaces for every team size.',
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-4">Everything you need to ship</h2>
          <p className="text-white/40 max-w-xl mx-auto">
            A complete toolkit built on modern open-source infrastructure — no vendor lock-in.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-white/8 p-6 hover:border-white/16 transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)' }}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-blue-400 mb-4">
                {f.icon}
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Section: CTA / Lead Capture ───────────────────────────────────────────────

interface LeadFormProps {
  id?: string;
}

function LeadCaptureForm({ id }: LeadFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');
    try {
      await submitLead(email.trim(), name.trim());
      // Also upsert into Supabase if connected
      if (import.meta.env.VITE_SUPABASE_URL) {
        await supabase.from('leads').upsert({ email: email.trim(), name: name.trim() });
      }
      setStatus('success');
      setName('');
      setEmail('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
      setStatus('error');
    }
  };

  return (
    <section id={id ?? 'early-access'} className="px-6 py-24">
      <div className="mx-auto max-w-lg text-center">
        <h2 className="text-3xl font-bold text-white mb-3">Get early access</h2>
        <p className="text-white/40 mb-10">Join the waitlist and be first to try the platform.</p>

        {status === 'success' ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-8">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-emerald-400 font-semibold mb-1">You're on the list!</p>
            <p className="text-white/40 text-sm">We'll reach out when your spot is ready.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-blue-500/50 transition-colors"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-blue-500/50 transition-colors"
            />
            {status === 'error' && (
              <p className="text-sm text-red-400 text-left">{errorMsg}</p>
            )}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {status === 'loading' ? 'Submitting…' : 'Request access'}
            </button>
            <p className="text-xs text-white/25">No spam. Unsubscribe at any time.</p>
          </form>
        )}
      </div>
    </section>
  );
}

// ── Section: Footer ───────────────────────────────────────────────────────────

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-white/8 px-6 py-10">
      <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500" />
          <span className="text-sm font-semibold text-white">Acme Inc.</span>
        </div>
        <nav className="flex gap-6">
          {['Privacy', 'Terms', 'Contact'].map((link) => (
            <a key={link} href="#" className="text-xs text-white/30 hover:text-white/60 transition-colors">
              {link}
            </a>
          ))}
        </nav>
        <p className="text-xs text-white/20">&copy; {year} Acme Inc. All rights reserved.</p>
      </div>
    </footer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const scrollToCta = () => {
    document.getElementById('early-access')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div
      className="min-h-screen text-white"
      style={{ background: 'linear-gradient(135deg, #1a1035 0%, #0f0f23 50%, #0a0a1a 100%)' }}
    >
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-white/5 backdrop-blur-md"
        style={{ background: 'rgba(15,15,35,0.85)' }}>
        <div className="mx-auto max-w-5xl flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500" />
            <span className="font-bold text-white">Acme</span>
          </div>
          <nav className="hidden sm:flex gap-6 text-sm text-white/50">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#early-access" className="hover:text-white transition-colors">Pricing</a>
          </nav>
          <button
            onClick={scrollToCta}
            className="px-4 py-2 rounded-full bg-white/8 border border-white/10 text-sm text-white/80 hover:bg-white/12 transition-colors"
          >
            Get access
          </button>
        </div>
      </header>

      <main>
        <HeroSection onCtaClick={scrollToCta} />
        <FeaturesSection />
        <LeadCaptureForm id="early-access" />
      </main>

      <Footer />
    </div>
  );
}
