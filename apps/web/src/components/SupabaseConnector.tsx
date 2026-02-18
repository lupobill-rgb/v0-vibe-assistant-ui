import React, { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ── Types ────────────────────────────────────────────────────────────────────

interface SupabaseStatus {
  connected: boolean;
  projectId: string;
  url?: string;
  anonKey?: string;
  connectedAt?: number;
}

interface FeatureToggles {
  auth: boolean;
  table: boolean;
  storage: boolean;
}

interface Props {
  projectId: string;
  tenantId: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchStatus(projectId: string, tenantId: string): Promise<SupabaseStatus> {
  const res = await fetch(`${API_URL}/api/supabase/status/${projectId}`, {
    headers: { 'X-Tenant-Id': tenantId },
  });
  if (!res.ok) throw new Error('Failed to fetch Supabase status');
  return res.json();
}

async function postConnect(
  projectId: string,
  tenantId: string,
  url: string,
  anonKey: string,
  serviceKey: string,
): Promise<{ ok?: boolean; error?: string }> {
  const res = await fetch(`${API_URL}/api/supabase/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': tenantId },
    body: JSON.stringify({ projectId, url, anonKey, serviceKey }),
  });
  return res.json();
}

// ── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
        connected
          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
          : 'bg-white/5 text-white/40 border border-white/10'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-white/30'}`}
      />
      {connected ? 'Connected' : 'Not connected'}
    </span>
  );
}

// ── Feature Toggle ────────────────────────────────────────────────────────────

interface ToggleProps {
  label: string;
  description: string;
  enabled: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}

function FeatureToggle({ label, description, enabled, disabled = false, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <div>
        <p className="text-sm font-medium text-white/90">{label}</p>
        <p className="text-xs text-white/40 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
          enabled ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-white/10'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        aria-checked={enabled}
        role="switch"
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition duration-200 ${
            enabled ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

interface ModalProps {
  projectId: string;
  tenantId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function ConnectModal({ projectId, tenantId, onClose, onSuccess }: ModalProps) {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [serviceKey, setServiceKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await postConnect(projectId, tenantId, url.trim(), anonKey.trim(), serviceKey.trim());
      if (result.error) {
        setError(result.error);
      } else {
        onSuccess();
        onClose();
      }
    } catch {
      setError('Network error — could not reach the API.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 p-6 shadow-2xl"
        style={{ background: 'rgba(20,16,45,0.97)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Connect Supabase</h2>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/70 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">
              Project URL
            </label>
            <input
              type="url"
              required
              placeholder="https://xxxx.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 border border-white/10 focus:border-blue-500/50 focus:outline-none transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">
              Anon / Public Key
            </label>
            <input
              type="text"
              required
              placeholder="eyJ..."
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 border border-white/10 focus:border-blue-500/50 focus:outline-none transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">
              Service Role Key
              <span className="ml-2 text-xs text-amber-400/70 font-normal">(stored encrypted)</span>
            </label>
            <input
              type="password"
              required
              placeholder="eyJ..."
              value={serviceKey}
              onChange={(e) => setServiceKey(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 border border-white/10 focus:border-blue-500/50 focus:outline-none transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)' }}
              autoComplete="new-password"
            />
            <p className="mt-1 text-xs text-white/30">
              Never shared or logged — used only for server-side admin operations.
            </p>
          </div>

          {error && (
            <div className="rounded-lg px-3 py-2 text-sm text-red-400 border border-red-500/20"
              style={{ background: 'rgba(239,68,68,0.08)' }}>
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl py-2 text-sm font-medium text-white/60 border border-white/10 hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {loading ? 'Connecting…' : 'Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SupabaseConnector({ projectId, tenantId }: Props) {
  const [status, setStatus] = useState<SupabaseStatus | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [features, setFeatures] = useState<FeatureToggles>({ auth: false, table: false, storage: false });

  const loadStatus = useCallback(async () => {
    try {
      const s = await fetchStatus(projectId, tenantId);
      setStatus(s);
    } catch {
      setStatus({ connected: false, projectId });
    }
  }, [projectId, tenantId]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  function toggleFeature(key: keyof FeatureToggles) {
    if (!status?.connected) return;
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <>
      {modalOpen && (
        <ConnectModal
          projectId={projectId}
          tenantId={tenantId}
          onClose={() => setModalOpen(false)}
          onSuccess={loadStatus}
        />
      )}

      <div
        className="rounded-2xl border border-white/10 p-5"
        style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Supabase logo mark */}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(62,207,142,0.15)' }}
            >
              <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.9 1.036c-.015-.986-1.26-1.41-1.874-.637L.764 12.05C.111 12.888.785 14 1.79 14h9.21l.001 8.965c.015.986 1.26 1.409 1.874.636l9.262-11.651C22.79 11.112 22.115 10 21.11 10h-9.21L11.9 1.036z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Supabase</h3>
              <p className="text-xs text-white/40">Database &amp; Auth backend</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge connected={status?.connected ?? false} />
            <button
              onClick={() => setModalOpen(true)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium text-white/70 border border-white/10 hover:bg-white/8 hover:text-white transition-colors"
            >
              {status?.connected ? 'Reconfigure' : 'Connect'}
            </button>
          </div>
        </div>

        {/* Connected info */}
        {status?.connected && status.url && (
          <div
            className="rounded-lg px-3 py-2 mb-4 text-xs text-white/50 border border-white/5 truncate"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            {status.url}
          </div>
        )}

        {/* Feature toggles */}
        <div className="mt-1">
          <FeatureToggle
            label="Auth"
            description="Enable Supabase Auth for user sign-up and sign-in"
            enabled={features.auth}
            disabled={!status?.connected}
            onChange={() => toggleFeature('auth')}
          />
          <FeatureToggle
            label="Database Tables"
            description="Provision tables with RLS enabled by default"
            enabled={features.table}
            disabled={!status?.connected}
            onChange={() => toggleFeature('table')}
          />
          <FeatureToggle
            label="Storage"
            description="Manage Supabase Storage buckets"
            enabled={features.storage}
            disabled={!status?.connected}
            onChange={() => toggleFeature('storage')}
          />
        </div>

        {!status?.connected && (
          <p className="mt-4 text-xs text-white/25 text-center">
            Connect a Supabase project to enable these features.
          </p>
        )}
      </div>
    </>
  );
}
