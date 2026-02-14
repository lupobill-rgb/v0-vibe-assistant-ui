import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import StatusPipeline from '../components/StatusPipeline';
import LogEntry from '../components/LogEntry';
import Button from '../components/Button';
import { DocumentIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Log {
  timestamp: string;
  message: string;
  severity: 'info' | 'error' | 'success' | 'warning';
}

export default function TaskView() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [taskStatus, setTaskStatus] = useState<string>('idle');
  const [taskId, setTaskId] = useState<string>('');
  const [showDetails, setShowDetails] = useState<boolean>(true);

  // Sample effect to simulate log streaming
  useEffect(() => {
    // This is a placeholder - in a real implementation,
    // this would connect to the actual log streaming service
    const sampleLogs: Log[] = [
      {
        timestamp: new Date().toISOString(),
        message: 'Task initialized',
        severity: 'info'
      }
    ];
    setLogs(sampleLogs);
    setTaskStatus('running');
  }, []);

  const handleClearLogs = () => {
    setLogs([]);
  };

  const handleExportLogs = () => {
    const logText = logs.map(log => 
      `[${log.timestamp}] [${log.severity.toUpperCase()}] ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `task-logs-${taskId || 'unknown'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header title="Task View" />
      
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar>
          <h3 style={{ marginTop: 0 }}>Task Details</h3>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 'bold' }}>
              Task ID
            </label>
            <input
              type="text"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              placeholder="Enter task ID"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <Button onClick={() => setShowDetails(!showDetails)}>
              {showDetails ? 'Hide Details' : 'Show Details'}
            </Button>
          </div>
        </Sidebar>

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid #ddd' }}>
            <StatusPipeline status={taskStatus} />
            
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <Button onClick={handleExportLogs} variant="secondary">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <DocumentIcon style={{ width: '1rem', height: '1rem' }} />
                  Export Logs
                </div>
              </Button>
              <Button onClick={handleClearLogs} variant="danger">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <XMarkIcon style={{ width: '1rem', height: '1rem' }} />
                  Clear Logs
                </div>
              </Button>
            </div>
          </div>

          <div style={{ 
            flex: 1, 
            overflow: 'auto', 
            padding: '1rem',
            backgroundColor: '#fff'
          }}>
            <h2 style={{ marginTop: 0 }}>Logs</h2>
            {logs.length === 0 ? (
              <p style={{ color: '#666', fontStyle: 'italic' }}>No logs available</p>
            ) : (
              <div>
                {logs.map((log, index) => (
                  <LogEntry
                    key={index}
                    timestamp={log.timestamp}
                    message={log.message}
                    severity={log.severity}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
