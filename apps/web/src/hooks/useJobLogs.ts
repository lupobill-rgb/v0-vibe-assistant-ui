import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface LogEvent {
  event_id: number;
  event_message: string;
  severity: 'info' | 'error' | 'success' | 'warning';
  event_time: number;
}

interface UseJobLogsReturn {
  logs: LogEvent[];
  isComplete: boolean;
  taskStatus: string;
}

export function useJobLogs(jobId: string | null): UseJobLogsReturn {
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [taskStatus, setTaskStatus] = useState('');

  useEffect(() => {
    if (!jobId) {
      // Reset state when jobId is null
      setLogs([]);
      setIsComplete(false);
      setTaskStatus('');
      return;
    }

    const eventSource = new EventSource(`${API_URL}/jobs/${jobId}/logs`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'complete') {
          setTaskStatus(data.state);
          setIsComplete(true);
          eventSource.close();
        } else {
          setLogs((prev) => [...prev, data]);
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      setIsComplete(true);
    };

    return () => {
      eventSource.close();
    };
  }, [jobId]);

  return { logs, isComplete, taskStatus };
}
