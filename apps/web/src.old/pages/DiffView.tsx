import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, PencilSquareIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface DiffLine {
  type: 'add' | 'remove' | 'context' | 'header' | 'hunk';
  content: string;
}

function parseDiff(raw: string): DiffLine[] {
  return raw.split('\n').map((line) => {
    if (line.startsWith('diff --git') || line.startsWith('index ') || line.startsWith('---') || line.startsWith('+++')) {
      return { type: 'header', content: line };
    }
    if (line.startsWith('@@')) return { type: 'hunk', content: line };
    if (line.startsWith('+')) return { type: 'add', content: line };
    if (line.startsWith('-')) return { type: 'remove', content: line };
    return { type: 'context', content: line };
  });
}

const lineColors: Record<DiffLine['type'], string> = {
  add: 'bg-emerald-500/10 text-emerald-300',
  remove: 'bg-red-500/10 text-red-300',
  context: 'text-white/60',
  header: 'text-white/80 font-semibold bg-white/5',
  hunk: 'text-vibe-blue bg-vibe-blue/5',
};

export default function DiffView() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [diff, setDiff] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editedDiff, setEditedDiff] = useState('');
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!taskId) return;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/jobs/${taskId}/diff`);
        if (!res.ok) throw new Error(res.status === 404 ? 'No diff available for this task' : 'Failed to fetch diff');
        const data = await res.json();
        setDiff(data.diff || null);
        setEditedDiff(data.diff || '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    })();
  }, [taskId]);

  const handleApply = async () => {
    if (!taskId) return;
    setApplying(true);
    setApplyResult(null);
    try {
      const res = await fetch(`${API_URL}/jobs/${taskId}/diff/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diff: editedDiff }),
      });
      const data = await res.json();
      setApplyResult({ ok: res.ok, message: data.message || data.error || 'Done' });
      if (res.ok) {
        setEditing(false);
        setDiff(editedDiff);
      }
    } catch (err) {
      setApplyResult({ ok: false, message: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex items-center gap-3 text-white/50">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Loading diff...</span>
        </div>
      </div>
    );
  }

  const lines = diff ? parseDiff(diff) : [];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(taskId ? `/task/${taskId}` : '/')}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-xl font-bold">
            <span className="bg-gradient-to-r from-vibe-blue via-vibe-purple to-vibe-pink bg-clip-text text-transparent">
              Diff Preview
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              disabled={!diff}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all disabled:opacity-30"
            >
              <PencilSquareIcon className="w-4 h-4" />
              Edit
            </button>
          ) : (
            <>
              <button
                onClick={() => { setEditing(false); setEditedDiff(diff || ''); }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all"
              >
                <XMarkIcon className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={applying}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-vibe-blue to-vibe-purple rounded-xl hover:shadow-glow transition-all disabled:opacity-50"
              >
                <CheckIcon className="w-4 h-4" />
                {applying ? 'Applying...' : 'Apply Diff'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Apply result message */}
      {applyResult && (
        <div
          className={`mb-4 px-4 py-3 rounded-xl border text-sm ${
            applyResult.ok
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          {applyResult.message}
        </div>
      )}

      {/* Error or empty state */}
      {error && (
        <div className="glass-card p-8 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={() => navigate('/')} className="text-vibe-blue hover:text-vibe-purple text-sm">
            Back to Dashboard
          </button>
        </div>
      )}

      {!error && !diff && (
        <div className="glass-card p-8 text-center">
          <p className="text-white/40">No diff available for this task yet.</p>
        </div>
      )}

      {/* Diff content */}
      {!error && diff && (
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide">
              {editing ? 'Editing Diff' : 'Generated Diff'}
            </h2>
            <span className="text-xs text-white/30">{lines.length} lines</span>
          </div>
          {editing ? (
            <textarea
              value={editedDiff}
              onChange={(e) => setEditedDiff(e.target.value)}
              className="w-full bg-black/30 text-white font-mono text-sm p-4 outline-none resize-y min-h-[400px]"
              spellCheck={false}
            />
          ) : (
            <div className="overflow-x-auto bg-black/20">
              {lines.map((line, i) => (
                <div
                  key={i}
                  className={`flex px-4 py-0.5 font-mono text-sm ${lineColors[line.type]}`}
                >
                  <span className="select-none text-white/20 w-10 text-right mr-4 flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="whitespace-pre">{line.content}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
