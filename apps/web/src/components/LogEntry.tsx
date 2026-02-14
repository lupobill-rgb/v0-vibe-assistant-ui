interface LogEntryProps {
  timestamp: string;
  message: string;
  severity: 'info' | 'error' | 'success' | 'warning';
}

export default function LogEntry({ timestamp, message, severity }: LogEntryProps) {
  const icons = {
    info: '●',
    error: '✗',
    success: '✓',
    warning: '⚠'
  };

  return (
    <div className={`log-entry log-${severity}`}>
      <span className="log-icon">{icons[severity]}</span>
      <span className="log-time">{timestamp}</span>
      <span className="log-message">{message}</span>
    </div>
  );
}
