import { useState, useEffect, useRef } from 'react';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface LogEvent {
  event_id: number;
  event_message: string;
  severity: 'info' | 'error' | 'success' | 'warning';
  event_time: number;
}

function App() {
  const [prompt, setPrompt] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [baseBranch, setBaseBranch] = useState('main');
  const [targetBranch, setTargetBranch] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<string>('');
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Stream logs via SSE
  useEffect(() => {
    if (!taskId) return;

    const eventSource = new EventSource(`${API_URL}/jobs/${taskId}/logs`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'complete') {
          setTaskStatus(data.state);
          setIsRunning(false);
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
      setIsRunning(false);
    };

    return () => {
      eventSource.close();
    };
  }, [taskId]);

  // Poll for task status and PR URL
  useEffect(() => {
    if (!taskId || !isRunning) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${API_URL}/jobs/${taskId}`);
        const task = await response.json();
        
        if (task.pull_request_link && !prUrl) {
          setPrUrl(task.pull_request_link);
        }

        if (task.execution_state === 'completed' || task.execution_state === 'failed') {
          setTaskStatus(task.execution_state);
          setIsRunning(false);
        }
      } catch (error) {
        console.error('Error polling task status:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [taskId, isRunning, prUrl]);

  const handleRun = async () => {
    if (!prompt.trim() || !repoUrl.trim()) {
      alert('Please provide a prompt and repository URL');
      return;
    }

    setIsRunning(true);
    setLogs([]);
    setPrUrl(null);
    setTaskId(null);
    setTaskStatus('');

    try {
      const response = await fetch(`${API_URL}/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          repo_url: repoUrl,
          base_branch: baseBranch || 'main',
          target_branch: targetBranch || undefined,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setTaskId(data.task_id);
      } else {
        alert(`Error: ${data.error || 'Failed to create task'}`);
        setIsRunning(false);
      }
    } catch (error) {
      alert(`Error: ${error}`);
      setIsRunning(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>VIBE</h1>
        <p className="subtitle">Vibe-coding prompt box that generates diffs, runs CI-parity preflight, and opens GitHub PRs</p>
      </header>

      <div className="container">
        <div className="input-section">
          <div className="form-group">
            <label htmlFor="prompt">Prompt</label>
            <textarea
              id="prompt"
              className="prompt-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the code changes you want to make..."
              rows={6}
              disabled={isRunning}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="repoUrl">Repository URL</label>
              <input
                id="repoUrl"
                type="text"
                className="text-input"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                disabled={isRunning}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="baseBranch">Base Branch</label>
              <input
                id="baseBranch"
                type="text"
                className="text-input"
                value={baseBranch}
                onChange={(e) => setBaseBranch(e.target.value)}
                placeholder="main"
                disabled={isRunning}
              />
            </div>

            <div className="form-group">
              <label htmlFor="targetBranch">Target Branch (optional)</label>
              <input
                id="targetBranch"
                type="text"
                className="text-input"
                value={targetBranch}
                onChange={(e) => setTargetBranch(e.target.value)}
                placeholder="Auto-generated if empty"
                disabled={isRunning}
              />
            </div>
          </div>

          <button
            className="run-button"
            onClick={handleRun}
            disabled={isRunning || !prompt.trim() || !repoUrl.trim()}
          >
            {isRunning ? 'Running...' : 'Run'}
          </button>
        </div>

        <div className="output-section">
          <div className="log-header">
            <h2>Live Log Console</h2>
            {taskStatus && (
              <span className={`status status-${taskStatus}`}>
                {taskStatus}
              </span>
            )}
          </div>
          
          <div className="log-console" ref={logContainerRef}>
            {logs.length === 0 && !isRunning && (
              <div className="log-empty">No logs yet. Submit a task to see live output.</div>
            )}
            {logs.map((log) => (
              <div key={log.event_id} className={`log-entry log-${log.severity}`}>
                <span className="log-time">
                  {new Date(log.event_time).toLocaleTimeString()}
                </span>
                <span className="log-message">{log.event_message}</span>
              </div>
            ))}
          </div>

          {prUrl && (
            <div className="pr-link-section">
              <h3>Pull Request Created</h3>
              <a href={prUrl} target="_blank" rel="noopener noreferrer" className="pr-link">
                {prUrl}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
