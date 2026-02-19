import { useEffect, useState, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface UsageRow {
  date: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  job_count: number;
}

interface UsageResponse {
  tenantId: string;
  totalSpend: number;
  budgetLimit: number | null;
  rows: UsageRow[];
}

function getTenantId(): string {
  return (
    (typeof window !== 'undefined' && window.localStorage.getItem('vibe_tenant_id')) ||
    'default'
  );
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('vibe_token');
  const tenantId = getTenantId();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  headers['X-Tenant-Id'] = tenantId;
  return headers;
}

export default function BillingDashboard() {
  const [data, setData] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [budgetInput, setBudgetInput] = useState('');
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [budgetMsg, setBudgetMsg] = useState<string | null>(null);

  const tenantId = getTenantId();

  const loadUsage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/billing/usage/${encodeURIComponent(tenantId)}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const json: UsageResponse = await res.json();
      setData(json);
      setBudgetInput(json.budgetLimit != null ? String(json.budgetLimit) : '');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  async function handleExport() {
    const url = `${API_URL}/api/billing/export/${encodeURIComponent(tenantId)}`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) return;
    const blob = await res.blob();
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `billing-${tenantId}.csv`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }

  async function handleSetBudget() {
    const limitUSD = parseFloat(budgetInput);
    if (isNaN(limitUSD) || limitUSD < 0) {
      setBudgetMsg('Enter a valid non-negative dollar amount.');
      return;
    }
    setBudgetSaving(true);
    setBudgetMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/billing/budget/${encodeURIComponent(tenantId)}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ limitUSD }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setBudgetMsg('Budget updated.');
      await loadUsage();
    } catch (e: unknown) {
      setBudgetMsg(e instanceof Error ? e.message : 'Failed to update budget');
    } finally {
      setBudgetSaving(false);
    }
  }

  const totalSpend = data?.totalSpend ?? 0;
  const budgetLimit = data?.budgetLimit ?? null;
  const gaugePercent =
    budgetLimit != null && budgetLimit > 0
      ? Math.min(100, Math.round((totalSpend / budgetLimit) * 100))
      : null;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Billing & Usage</h1>
        <button
          onClick={handleExport}
          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
        >
          Export CSV
        </button>
      </div>

      {/* Spend gauge */}
      <div className="glass-card p-6 space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Total Spend</p>
            <p className="text-3xl font-mono text-white">${totalSpend.toFixed(4)}</p>
          </div>
          {budgetLimit != null && (
            <div className="text-right">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Budget Limit</p>
              <p className="text-xl font-mono text-white/70">${budgetLimit.toFixed(2)}</p>
            </div>
          )}
        </div>

        {gaugePercent != null && (
          <div className="space-y-1">
            <div className="w-full bg-white/10 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all ${
                  gaugePercent >= 90
                    ? 'bg-red-500'
                    : gaugePercent >= 70
                    ? 'bg-yellow-500'
                    : 'bg-vibe-blue'
                }`}
                style={{ width: `${gaugePercent}%` }}
              />
            </div>
            <p className="text-xs text-white/40 text-right">{gaugePercent}% of budget used</p>
          </div>
        )}
      </div>

      {/* Set budget */}
      <div className="glass-card p-6">
        <p className="text-sm font-medium text-white mb-3">Set Spend Ceiling (USD)</p>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 50.00"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-vibe-blue/60"
            />
          </div>
          <button
            onClick={handleSetBudget}
            disabled={budgetSaving}
            className="px-4 py-2 rounded-lg bg-vibe-blue hover:bg-vibe-blue/80 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {budgetSaving ? 'Saving…' : 'Save Budget'}
          </button>
        </div>
        {budgetMsg && (
          <p className="mt-2 text-xs text-white/50">{budgetMsg}</p>
        )}
      </div>

      {/* Usage table */}
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-medium text-white">Usage by Day &amp; Model</h2>
        </div>

        {loading && (
          <div className="px-6 py-10 text-center text-white/40 text-sm">Loading…</div>
        )}
        {error && (
          <div className="px-6 py-10 text-center text-red-400 text-sm">{error}</div>
        )}
        {!loading && !error && data && (
          data.rows.length === 0 ? (
            <div className="px-6 py-10 text-center text-white/30 text-sm">
              No metered calls yet. Token usage will appear here after jobs complete.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/30 text-xs uppercase tracking-wider">
                    <th className="px-6 py-3 text-left">Date</th>
                    <th className="px-6 py-3 text-left">Model</th>
                    <th className="px-6 py-3 text-right">Input Tokens</th>
                    <th className="px-6 py-3 text-right">Output Tokens</th>
                    <th className="px-6 py-3 text-right">Cost (USD)</th>
                    <th className="px-6 py-3 text-right">Jobs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {data.rows.map((row, i) => (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-3 text-white/70 font-mono">{row.date}</td>
                      <td className="px-6 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-white/10 text-white/60">
                          {row.model}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right text-white/60 font-mono">
                        {row.input_tokens.toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-right text-white/60 font-mono">
                        {row.output_tokens.toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-right text-white font-mono">
                        ${row.cost_usd.toFixed(6)}
                      </td>
                      <td className="px-6 py-3 text-right text-white/40">{row.job_count}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-white/10 font-medium">
                    <td colSpan={4} className="px-6 py-3 text-white/40 text-xs uppercase tracking-wider">
                      Total
                    </td>
                    <td className="px-6 py-3 text-right text-white font-mono">
                      ${totalSpend.toFixed(6)}
                    </td>
                    <td className="px-6 py-3 text-right text-white/40">
                      {data.rows.reduce((s, r) => s + r.job_count, 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
