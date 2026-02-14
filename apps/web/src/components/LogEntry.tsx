interface LogEntryProps {
  timestamp: string;
  message: string;
  severity: 'info' | 'error' | 'success' | 'warning';
}

export default function LogEntry({ timestamp, message, severity }: LogEntryProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return '#f44336';
      case 'success':
        return '#4caf50';
      case 'warning':
        return '#ff9800';
      case 'info':
      default:
        return '#2196f3';
    }
  };

  return (
    <div style={{ 
      padding: '0.5rem', 
      marginBottom: '0.25rem',
      borderLeft: `3px solid ${getSeverityColor(severity)}`,
      backgroundColor: '#f9f9f9',
      fontFamily: 'monospace',
      fontSize: '0.875rem'
    }}>
      <span style={{ color: '#666', marginRight: '0.5rem' }}>
        {timestamp}
      </span>
      <span style={{ color: getSeverityColor(severity) }}>
        [{severity.toUpperCase()}]
      </span>
      <span style={{ marginLeft: '0.5rem' }}>
        {message}
      </span>
    </div>
  );
}
