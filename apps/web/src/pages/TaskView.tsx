import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, ArrowTopRightOnSquareIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { useJobLogs } from '../hooks/useJobLogs';
import StatusPipeline from '../components/StatusPipeline';
import LogEntry from '../components/LogEntry';
import { fetchJob, type Task } from '../api/client';

const pipelineStages = [
  { id: 'queued', label: 'Queued' },
  { id: 'cloning', label: 'Cloning' },
  { id: 'building_context', label: 'Building Context' },
  { id: 'calling_llm', label: 'Calling LLM' },
  { id: 'applying_diff', label: 'Applying Diff' },
  { id: 'running_preflight', label: 'Running Preflight' },
  { id: 'creating_pr', label: 'Creating PR' },
  { id: 'completed', label: 'Completed' },
];

export function TaskView() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [taskDetails, setTaskDetails] = useState<Task | null>(null);
  const [loadingTask, setLoadingTask] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'logs' | 'preview'>('logs');
  const logContainerRef = useRef<HTMLDivElement>(null);

  const { logs, error: logsError } = useJobLogs(taskId || null);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Fetch task details
  useEffect(() => {
    if (!taskId) return;
    let intervalId: NodeJS.Timeout;

    const fetchTaskDetails = async () => {
      try {
        const data = await fetchJob(taskId);
        setTaskDetails(data);
        setLoadingTask(false);
        if (data.execution_state === 'completed' || data.execution_state === 'failed') {
          clearInterval(intervalId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoadingTask(false);
        clearInterval(intervalId);
      }
    };

    fetchTaskDetails();
    intervalId = setInterval(fetchTaskDetails, 3000);
    return () => clearInterval(intervalId);
  }, [taskId]);

  if (loadingTask) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-white/50">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Loading task details...</span>
        </div>
      </div>
    );
  }

  if (error || !taskDetails) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-red-400 text-lg">{error || 'Task not found'}</p>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/15 transition-all"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Home
        </button>
      </div>
    );
  }

  const statusLabel = taskDetails.execution_state.replace(/_/g, ' ').toUpperCase();
  const isCompleted = taskDetails.execution_state === 'completed';
  const isFailed = taskDetails.execution_state === 'failed';

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-4 border-b border-white/10">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-3 py-2 text-sm text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-xl font-bold">
          <span className="bg-gradient-to-r from-vibe-blue via-vibe-purple to-vibe-pink bg-clip-text text-transparent">
            Task Execution
          </span>
        </h1>
        <span
          className={`ml-auto px-3 py-1 rounded-full text-xs font-bold uppercase ${
            isCompleted
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : isFailed
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'bg-vibe-blue/20 text-vibe-blue border border-vibe-blue/30'
          }`}
        >
          {statusLabel}
        </span>
      </header>

      {/* Content */}
      <div className="max-w-[1600px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6 items-start">
        {/* Left: Task Details & Pipeline */}
        <div className="space-y-4 animate-fade-in">
          {/* Task Info */}
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-4">Task Details</h2>
            <div className="space-y-3">
              <div>
                <span className="text-xs text-white/40 block mb-0.5">Task ID</span>
                <span className="text-sm text-white/80 font-mono">{taskDetails.task_id}</span>
              </div>
              <div>
                <span className="text-xs text-white/40 block mb-0.5">Prompt</span>
                <div className="text-sm text-white/80 bg-black/30 rounded-lg px-3 py-2 font-mono whitespace-pre-wrap break-words border border-white/5">
                  {taskDetails.user_prompt}
                </div>
              </div>
              {taskDetails.repo_url && (
                <div>
                  <span className="text-xs text-white/40 block mb-0.5">Repository</span>
                  <span className="text-sm text-white/80">{taskDetails.repo_url}</span>
                </div>
              )}
              {taskDetails.base_branch && (
                <div>
                  <span className="text-xs text-white/40 block mb-0.5">Base Branch</span>
                  <span className="text-sm text-white/80 font-mono">{taskDetails.base_branch}</span>
                </div>
              )}
              {taskDetails.target_branch && (
                <div>
                  <span className="text-xs text-white/40 block mb-0.5">Target Branch</span>
                  <span className="text-sm text-white/80 font-mono">{taskDetails.target_branch}</span>
                </div>
              )}
            </div>
          </div>

          {/* Pipeline */}
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-4">Execution Pipeline</h2>
            <StatusPipeline
              stages={pipelineStages}
              currentStatus={taskDetails.execution_state}
            />
          </div>

          {/* Usage Metrics */}
          {(taskDetails.llm_total_tokens || taskDetails.total_job_seconds || taskDetails.files_changed_count) && (
            <div className="glass-card p-5">
              <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-4">Usage Metrics</h2>
              <div className="space-y-3">
                {taskDetails.llm_total_tokens !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">LLM Tokens</span>
                    <span className="text-sm text-white/90 font-mono">
                      {taskDetails.llm_total_tokens.toLocaleString()}
                      <span className="text-white/50 text-xs ml-1">
                        ({taskDetails.llm_prompt_tokens?.toLocaleString() || 0} in / {taskDetails.llm_completion_tokens?.toLocaleString() || 0} out)
                      </span>
                    </span>
                  </div>
                )}
                {taskDetails.preflight_seconds !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">Preflight Time</span>
                    <span className="text-sm text-white/90 font-mono">{taskDetails.preflight_seconds.toFixed(1)}s</span>
                  </div>
                )}
                {taskDetails.total_job_seconds !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">Total Duration</span>
                    <span className="text-sm text-white/90 font-mono">{taskDetails.total_job_seconds.toFixed(1)}s</span>
                  </div>
                )}
                {taskDetails.files_changed_count !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">Files Changed</span>
                    <span className="text-sm text-white/90 font-mono">{taskDetails.files_changed_count}</span>
                  </div>
                )}
                {taskDetails.iteration_count > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">Iterations</span>
                    <span className="text-sm text-white/90 font-mono">{taskDetails.iteration_count}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Result Actions */}
          {isCompleted && (
            <div className="glass-card p-5 animate-slide-up">
              <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-4">Result</h2>
              <div className="space-y-3">
                <button
                  onClick={() => navigate(`/diff/${taskDetails.task_id}`)}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-white/10 text-white/90 border border-white/20 font-semibold rounded-xl hover:bg-white/15 hover:border-white/30 transition-all"
                >
                  <DocumentTextIcon className="w-5 h-5" />
                  View Diff
                </button>
                {taskDetails.pull_request_link && (
                  <a
                    href={taskDetails.pull_request_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gradient-to-r from-vibe-blue to-vibe-purple text-white font-semibold rounded-xl hover:shadow-glow transition-all"
                  >
                    <ArrowTopRightOnSquareIcon className="w-5 h-5" />
                    View Pull Request
                  </a>
                )}
                {taskDetails.preview_url && (
                  <a
                    href={`http://localhost:3001${taskDetails.preview_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gradient-to-r from-vibe-purple to-vibe-pink text-white font-semibold rounded-xl hover:shadow-glow transition-all"
                  >
                    <ArrowTopRightOnSquareIcon className="w-5 h-5" />
                    View Preview
                  </a>
                )}
                {!taskDetails.pull_request_link && !taskDetails.preview_url && (
                  <p className="text-center text-white/40 text-sm py-2">
                    Completed without PR or preview
                  </p>
                )}
              </div>
            </div>
          )}

          {isFailed && (
            <div className="glass-card p-5 border-red-500/20 animate-slide-up">
              <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wide mb-3">Task Failed</h2>
              <p className="text-sm text-white/50 mb-4">
                Check the logs for error details.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => navigate(`/diff/${taskDetails.task_id}`)}
                  className="w-full px-4 py-2.5 bg-white/5 text-white/70 border border-white/10 rounded-xl font-medium hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <DocumentTextIcon className="w-5 h-5" />
                  View Diff
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full px-4 py-2.5 bg-white/5 text-white/70 border border-white/10 rounded-xl font-medium hover:bg-white/10 transition-all"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Live Logs & Preview */}
        <div className="glass-card flex flex-col h-[calc(100vh-120px)] min-h-[500px] animate-slide-in-right">
          {/* Tab Navigation */}
          <div className="flex items-center border-b border-white/10">
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex-1 px-5 py-3 text-sm font-semibold uppercase tracking-wide transition-all ${
                activeTab === 'logs'
                  ? 'text-white border-b-2 border-vibe-blue bg-white/5'
                  : 'text-white/40 hover:text-white/60 hover:bg-white/5'
              }`}
            >
              Live Logs
              <span className="ml-2 text-xs text-white/30 font-mono">{logs.length} events</span>
            </button>
            {taskDetails?.preview_url && (
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex-1 px-5 py-3 text-sm font-semibold uppercase tracking-wide transition-all ${
                  activeTab === 'preview'
                    ? 'text-white border-b-2 border-vibe-purple bg-white/5'
                    : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                }`}
              >
                Preview
              </button>
            )}
          </div>

          {/* Tab Content: Logs */}
          {activeTab === 'logs' && (
            <>
              {logsError && (
                <div className="px-5 py-2 bg-red-500/10 border-b border-red-500/20">
                  <span className="text-xs text-red-400">{logsError}</span>
                </div>
              )}
              <div
                ref={logContainerRef}
                className="flex-1 overflow-y-auto p-2 bg-black/20"
              >
                {logs.length === 0 && !logsError && (
                  <div className="flex items-center justify-center h-full">
                    <div className="flex items-center gap-2 text-white/30">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="text-sm">Waiting for logs...</span>
                    </div>
                  </div>
                )}
                {logs.map((log) => (
                  <LogEntry
                    key={log.event_id}
                    timestamp={new Date(log.event_time).toLocaleTimeString()}
                    message={log.event_message}
                    severity={log.severity}
                  />
                ))}
              </div>
            </>
          )}

          {/* Tab Content: Preview */}
          {activeTab === 'preview' && taskDetails?.preview_url && (
            <div className="flex-1 flex flex-col bg-black/20">
              {/* Preview Header with Open Link */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-black/10">
                <span className="text-xs text-white/50">Preview URL:</span>
                <a
                  href={taskDetails.preview_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 text-xs bg-white/10 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-all border border-white/10"
                >
                  <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                  Open Preview
                </a>
              </div>
              {/* Preview Iframe */}
              <div className="flex-1 relative">
                <iframe
                  src={`${taskDetails.preview_url}?t=${taskDetails.initiated_at}`}
                  className="absolute inset-0 w-full h-full border-0"
                  title="Preview"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
