import { useState, useCallback, useRef, useEffect } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

type PreviewStatus = 'building' | 'ready' | 'error' | 'none';

interface PreviewState {
  status: PreviewStatus;
  url: string | null;
  error: string | null;
}

interface PreviewPaneProps {
  projectId: string;
  /** Called when the user clicks "Fix it" on the error overlay */
  onFixRequested?: () => void;
}

// ── API helpers ──────────────────────────────────────────────────────────────

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

async function startPreview(projectId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/preview/${projectId}`, { method: 'POST' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error || `HTTP ${res.status}`);
  }
}

async function fetchPreviewStatus(projectId: string): Promise<PreviewState> {
  const res = await fetch(`${API_URL}/api/preview/${projectId}/status`);
  if (!res.ok) return { status: 'none', url: null, error: null };
  const data = await res.json();
  return {
    status: data.status ?? 'none',
    url: data.url ?? null,
    error: data.error ?? null,
  };
}

async function stopPreview(projectId: string): Promise<void> {
  await fetch(`${API_URL}/api/preview/${projectId}`, { method: 'DELETE' }).catch(() => {});
}

// ── Icons ────────────────────────────────────────────────────────────────────

function IconRefresh({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0115.3-4.3M20 15a9 9 0 01-15.3 4.3" />
    </svg>
  );
}

function IconExternalLink({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
    </svg>
  );
}

function IconCopy({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="animate-spin h-8 w-8 text-blue-400" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PreviewPane({ projectId, onFixRequested }: PreviewPaneProps) {
  const [preview, setPreview] = useState<PreviewState>({
    status: 'none',
    url: null,
    error: null,
  });
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  // ── Polling ──────────────────────────────────────────────────────────────

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      const state = await fetchPreviewStatus(projectId);
      if (!mountedRef.current) return;
      setPreview(state);
      if (state.status === 'ready' || state.status === 'error') {
        stopPolling();
      }
    }, 1500);
  }, [projectId, stopPolling]);

  // Cleanup on unmount — stop polling and kill remote preview
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopPolling();
      stopPreview(projectId);
    };
  }, [projectId, stopPolling]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleLaunch = useCallback(async () => {
    setPreview({ status: 'building', url: null, error: null });
    try {
      await startPreview(projectId);
      startPolling();
    } catch (err: any) {
      if (mountedRef.current) {
        setPreview({ status: 'error', url: null, error: err.message });
      }
    }
  }, [projectId, startPolling]);

  const handleRefresh = useCallback(() => {
    if (iframeRef.current) {
      // eslint-disable-next-line no-self-assign
      iframeRef.current.src = iframeRef.current.src;
    }
  }, []);

  const handleOpenTab = useCallback(() => {
    if (preview.url) window.open(preview.url, '_blank', 'noopener,noreferrer');
  }, [preview.url]);

  const handleCopy = useCallback(async () => {
    if (!preview.url) return;
    try {
      await navigator.clipboard.writeText(preview.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API may not be available in all contexts
    }
  }, [preview.url]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px',
      }}
      className="flex flex-col overflow-hidden h-full"
    >
      {/* Toolbar */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b shrink-0"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <span className="text-xs font-semibold text-white/60 mr-1 uppercase tracking-widest">
          Preview
        </span>

        {preview.status === 'none' && (
          <button
            onClick={handleLaunch}
            className="ml-auto text-xs font-semibold px-3 py-1 rounded-2xl bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
          >
            Launch
          </button>
        )}

        {(preview.status === 'ready' || preview.status === 'error') && (
          <>
            <div className="ml-auto flex items-center gap-1.5">
              <button
                onClick={handleRefresh}
                disabled={preview.status !== 'ready'}
                title="Refresh preview"
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors"
              >
                <IconRefresh className="w-4 h-4" />
              </button>
              <button
                onClick={handleOpenTab}
                disabled={!preview.url}
                title="Open in new tab"
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors"
              >
                <IconExternalLink className="w-4 h-4" />
              </button>
              <button
                onClick={handleCopy}
                disabled={!preview.url}
                title={copied ? 'Copied!' : 'Copy link'}
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors"
              >
                <IconCopy className="w-4 h-4" />
              </button>
            </div>
            {copied && (
              <span className="text-xs text-emerald-400 ml-1">Copied!</span>
            )}
          </>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 relative flex items-center justify-center min-h-0">
        {/* No preview yet */}
        {preview.status === 'none' && (
          <div className="text-center text-white/30 select-none">
            <p className="text-sm">No preview running</p>
            <p className="text-xs mt-1">Click &ldquo;Launch&rdquo; to build &amp; serve</p>
          </div>
        )}

        {/* Building spinner */}
        {preview.status === 'building' && (
          <div className="flex flex-col items-center gap-3 text-white/60">
            <Spinner />
            <span className="text-sm">Building preview&hellip;</span>
          </div>
        )}

        {/* Error overlay */}
        {preview.status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-red-950/40 backdrop-blur-sm p-6 text-center">
            <svg className="w-10 h-10 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-red-300 mb-1">Preview failed</p>
              {preview.error && (
                <p className="text-xs text-red-400/80 max-w-xs break-words">{preview.error}</p>
              )}
            </div>
            {onFixRequested && (
              <button
                onClick={onFixRequested}
                className="mt-1 text-xs font-semibold px-4 py-2 rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white hover:opacity-90 transition-opacity"
              >
                Fix it
              </button>
            )}
            <button
              onClick={handleLaunch}
              className="text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Ready iframe */}
        {preview.status === 'ready' && preview.url && (
          <iframe
            ref={iframeRef}
            src={preview.url}
            title="Preview"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        )}
      </div>
    </div>
  );
}
