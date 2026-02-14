interface StatusPipelineProps {
  status?: string;
}

export default function StatusPipeline({ status = 'idle' }: StatusPipelineProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return '#4caf50';
      case 'failed':
      case 'error':
        return '#f44336';
      case 'running':
      case 'in_progress':
        return '#2196f3';
      default:
        return '#9e9e9e';
    }
  };

  return (
    <div style={{ 
      padding: '1rem', 
      backgroundColor: '#fff',
      borderRadius: '4px',
      marginBottom: '1rem',
      border: '1px solid #ddd'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontWeight: 'bold' }}>Status:</span>
        <span style={{ 
          color: getStatusColor(status),
          textTransform: 'capitalize'
        }}>
          {status}
        </span>
      </div>
    </div>
  );
}
