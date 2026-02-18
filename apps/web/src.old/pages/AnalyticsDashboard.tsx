import { useState, useEffect } from 'react';
import { fetchJobs, fetchProjects } from '../api/client';

interface AnalyticsData {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  successRate: number;
  totalProjects: number;
  avgIterations: number;
  recentJobs: { date: string; count: number }[];
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="glass-card p-5">
      <p className="text-xs text-white/40 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [jobs, projects] = await Promise.all([fetchJobs(), fetchProjects()]);

        const completed = jobs.filter((j) => j.execution_state === 'completed').length;
        const failed = jobs.filter((j) => j.execution_state === 'failed').length;
        const totalIter = jobs.reduce((s, j) => s + (j.iteration_count || 0), 0);

        // Group jobs by day
        const byDay = new Map<string, number>();
        for (const j of jobs) {
          const d = new Date(j.initiated_at).toLocaleDateString();
          byDay.set(d, (byDay.get(d) || 0) + 1);
        }
        const recentJobs = Array.from(byDay.entries())
          .map(([date, count]) => ({ date, count }))
          .slice(-7);

        setData({
          totalJobs: jobs.length,
          completedJobs: completed,
          failedJobs: failed,
          successRate: jobs.length > 0 ? Math.round((completed / jobs.length) * 100) : 0,
          totalProjects: projects.length,
          avgIterations: jobs.length > 0 ? Math.round((totalIter / jobs.length) * 10) / 10 : 0,
          recentJobs,
        });
      } catch {
        setData({
          totalJobs: 0, completedJobs: 0, failedJobs: 0, successRate: 0,
          totalProjects: 0, avgIterations: 0, recentJobs: [],
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex items-center gap-3 text-white/50">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const barMax = Math.max(...data.recentJobs.map((d) => d.count), 1);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">
        <span className="bg-gradient-to-r from-vibe-blue via-vibe-purple to-vibe-pink bg-clip-text text-transparent">
          Analytics
        </span>
      </h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard label="Total Jobs" value={data.totalJobs} />
        <StatCard label="Completed" value={data.completedJobs} />
        <StatCard label="Failed" value={data.failedJobs} />
        <StatCard label="Success Rate" value={`${data.successRate}%`} />
        <StatCard label="Projects" value={data.totalProjects} />
        <StatCard label="Avg Iterations" value={data.avgIterations} />
      </div>

      {/* Simple bar chart */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-4">
          Jobs Per Day (Last 7 Days)
        </h2>
        {data.recentJobs.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-8">No job data yet</p>
        ) : (
          <div className="flex items-end gap-2 h-40">
            {data.recentJobs.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-white/50">{d.count}</span>
                <div
                  className="w-full bg-gradient-to-t from-vibe-blue to-vibe-purple rounded-t-md transition-all"
                  style={{ height: `${(d.count / barMax) * 100}%`, minHeight: 4 }}
                />
                <span className="text-[10px] text-white/30 truncate max-w-full">{d.date}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
