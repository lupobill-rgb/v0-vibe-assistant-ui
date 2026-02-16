import type { LogEvent } from '../api/client';

interface LogEntryProps {
  log: LogEvent;
}

const severityStyles: Record<LogEvent['severity'], string> = {
  info: 'border-l-info/50',
  success: 'border-l-success/50',
  warning: 'border-l-warning/50',
  error: 'border-l-error/50',
};

const severityDot: Record<LogEvent['severity'], string> = {
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
};

export default function LogEntry({ log }: LogEntryProps) {
  const time = new Date(log.event_time).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div
      className={`flex items-start gap-3 px-3 py-2 border-l-2 hover:bg-surface-alt/50 transition-colors ${severityStyles[log.severity]}`}
    >
      <span
        className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${severityDot[log.severity]}`}
      />

      <span className="text-xs text-text-muted font-mono shrink-0 mt-0.5">
        {time}
      </span>

      <span className="text-sm text-text break-all leading-relaxed">
        {log.event_message}
      </span>
    </div>
  );
}
