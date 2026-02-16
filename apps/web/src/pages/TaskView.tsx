import { useEffect, useRef, useState } from 'react';
import { ArrowLeftIcon, LinkIcon } from '@heroicons/react/24/outline';
import Button from '../components/Button';
import StatusPipeline, {
  type PipelineStage,
} from '../components/StatusPipeline';
import LogEntry from '../components/LogEntry';
import { fetchJob, subscribeToLogs, type LogEvent } from '../api/client';

interface TaskViewProps {
  taskId: string;
  onBack: () => void;
}

export default function TaskView({ taskId, onBack }: TaskViewProps) {
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [stage, setStage] = useState<PipelineStage>('queued');
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop =
        logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Subscribe to SSE logs
  useEffect(() => {
    setStage('running');

    const cleanup = subscribeToLogs(
      taskId,
      (log) => setLogs((prev) => [...prev, log]),
      (state) => {
        setStage(state === 'completed' ? 'completed' : 'failed');
      },
      () => setStage('failed'),
    );

    return cleanup;
  }, [taskId]);

  // Poll for PR link
  useEffect(() => {
    if (stage !== 'running') return;

    const interval = setInterval(async () => {
      const task = await fetchJob(taskId);
      if (task.pull_request_link) {
        setPrUrl(task.pull_request_link);
      }
      if (
        task.execution_state === 'completed' ||
        task.execution_state === 'failed'
      ) {
        setStage(
          task.execution_state === 'completed' ? 'completed' : 'failed',
        );
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [taskId, stage]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeftIcon className="h-4 w-4" />}
          onClick={onBack}
        >
          Back
        </Button>

        <span className="text-xs text-text-muted font-mono">{taskId}</span>
      </div>

      {/* Status pipeline */}
      <div className="bg-surface rounded-2xl border border-border p-5 shadow-lg shadow-black/20">
        <h2 className="text-sm font-semibold text-text mb-4">Task Progress</h2>
        <StatusPipeline stage={stage} />
      </div>

      {/* PR link */}
      {prUrl && (
        <div className="bg-success/5 border border-success/20 rounded-xl p-4 flex items-center gap-3">
          <LinkIcon className="h-5 w-5 text-success shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-success font-medium mb-0.5">
              Pull Request Created
            </p>
            <a
              href={prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-success underline underline-offset-2 truncate block"
            >
              {prUrl}
            </a>
          </div>
        </div>
      )}

      {/* Log console */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-lg shadow-black/20">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">Live Logs</h2>
          <span className="text-xs text-text-muted">
            {logs.length} event{logs.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div
          ref={logContainerRef}
          className="h-[420px] overflow-y-auto divide-y divide-border/50"
        >
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-text-muted">
              Waiting for logs...
            </div>
          ) : (
            logs.map((log) => <LogEntry key={log.event_id} log={log} />)
          )}
        </div>
      </div>
    </div>
  );
}
