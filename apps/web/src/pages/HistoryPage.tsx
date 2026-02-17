import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchJobs, type Task } from '../api/client';

const stateColors: Record<string, string> = {
  completed: 'bg-emerald-500/20 text-emerald-400',
  failed: 'bg-red-500/20 text-red-400',
  queued: 'bg-white/10 text-white/60',
};

export default function HistoryPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchJobs();
        setTasks(data);
      } catch {
        // ignore
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
          <span>Loading history...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">
        <span className="bg-gradient-to-r from-vibe-blue via-vibe-purple to-vibe-pink bg-clip-text text-transparent">
          Job History
        </span>
      </h1>

      {tasks.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="text-white/40">No jobs yet. Create one from the Dashboard.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const stateClass = stateColors[task.execution_state] || 'bg-vibe-blue/20 text-vibe-blue';
            return (
              <div
                key={task.task_id}
                onClick={() => navigate(`/task/${task.task_id}`)}
                className="glass-card p-4 flex items-center gap-4 cursor-pointer hover:bg-white/[0.09] transition-all"
              >
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase flex-shrink-0 ${stateClass}`}>
                  {task.execution_state.replace(/_/g, ' ')}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{task.user_prompt}</p>
                  <p className="text-xs text-white/30 mt-0.5">
                    {new Date(task.initiated_at).toLocaleString()}
                    {task.llm_provider && ` | ${task.llm_provider}`}
                    {` | ${task.iteration_count} iterations`}
                  </p>
                </div>
                {task.pull_request_link && (
                  <a
                    href={task.pull_request_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-emerald-400 hover:text-emerald-300 flex-shrink-0"
                  >
                    PR
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
