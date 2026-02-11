import { useState, useEffect, useRef } from 'react';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface LogEvent {
  event_id: number;
  event_message: string;
  severity: 'info' | 'error' | 'success' | 'warning';
  event_time: number;
}

interface Project {
  id: string;
  name: string;
  repository_url: string;
  local_path: string;
  last_synced?: number;
  created_at: number;
}

function App() {
  const [prompt, setPrompt] = useState('');
  const [projectId, setProjectId] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [useLegacyMode, setUseLegacyMode] = useState(false);
  const [baseBranch, setBaseBranch] = useState('main');
  const [targetBranch, setTargetBranch] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<string>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);
  
  // Project modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [importRepoUrl, setImportRepoUrl] = useState('');
  const [useLegacyMode, setUseLegacyMode] = useState(false);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await fetch(`${API_URL}/projects`);
      const data = await response.json();
      setProjects(data);
      if (data.length > 0 && !selectedProject) {
        setSelectedProject(data[0].id);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  // Load projects on mount
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await fetch(`${API_URL}/projects`);
        if (response.ok) {
          const data = await response.json();
          setProjects(data);
        }
      } catch (error) {
        console.error('Error loading projects:', error);
      }
    };
    loadProjects();
  }, []);

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

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      alert('Please provide a project name');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName }),
      });

      if (response.ok) {
        const project = await response.json();
        setNewProjectName('');
        setShowCreateModal(false);
        await loadProjects();
        setSelectedProject(project.id);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to create project'}`);
      }
    } catch (error) {
      alert(`Error: ${error}`);
    }
  };

  const handleImportProject = async () => {
    if (!importRepoUrl.trim()) {
      alert('Please provide a repository URL');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/projects/import/github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: importRepoUrl }),
      });

      if (response.ok) {
        const project = await response.json();
        setImportRepoUrl('');
        setShowImportModal(false);
        await loadProjects();
        setSelectedProject(project.id);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to import project'}`);
      }
    } catch (error) {
      alert(`Error: ${error}`);
    }
  };

  const handleRun = async () => {
    // Validate inputs based on mode
    if (!prompt.trim()) {
      alert('Please provide a prompt');
      return;
    }

    if (useLegacyMode) {
      if (!repoUrl.trim()) {
        alert('Please provide a repository URL');
        return;
      }
    } else {
      if (!projectId) {
        alert('Please select a project');
        return;
      }
    }

    setIsRunning(true);
    setLogs([]);
    setPrUrl(null);
    setTaskId(null);
    setTaskStatus('');

    try {
      const body: any = {
        prompt,
        base_branch: baseBranch || 'main',
        target_branch: targetBranch || undefined,
      };

      if (useLegacyMode) {
        body.repo_url = repoUrl;
      } else {
        body.project_id = projectId;
      }

      const response = await fetch(`${API_URL}/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
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

          {!useLegacyMode ? (
            <>
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="project">Project</label>
                  <select
                    id="project"
                    className="text-input"
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    disabled={isRunning}
                  >
                    <option value="">Select a project...</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setShowCreateModal(true)}
                    disabled={isRunning}
                  >
                    Create Project
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setShowImportModal(true)}
                    disabled={isRunning}
                  >
                    Import from GitHub
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="repoUrl">Repository URL (Legacy Mode B)</label>
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
          )}

          <div className="form-row">
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={useLegacyMode}
                  onChange={(e) => setUseLegacyMode(e.target.checked)}
                  disabled={isRunning}
                />
                {' '}Use Legacy Mode (Repository URL)
              </label>
            </div>
          </div>

          {!useLegacyMode ? (
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="projectId">Project</label>
                <select
                  id="projectId"
                  className="text-input"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  disabled={isRunning}
                >
                  <option value="">Select a project...</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="repoUrl">Repository URL (Deprecated)</label>
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
          )}

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
            disabled={isRunning || !prompt.trim() || (useLegacyMode ? !repoUrl.trim() : !projectId)}
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

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Project</h2>
            <div className="form-group">
              <label htmlFor="newProjectName">Project Name</label>
              <input
                id="newProjectName"
                type="text"
                className="text-input"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="my-awesome-project"
              />
            </div>
            <div className="modal-buttons">
              <button className="secondary-button" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button className="run-button" onClick={handleCreateProject}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Project Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Import from GitHub</h2>
            <div className="form-group">
              <label htmlFor="importRepoUrl">Repository URL</label>
              <input
                id="importRepoUrl"
                type="text"
                className="text-input"
                value={importRepoUrl}
                onChange={(e) => setImportRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
              />
            </div>
            <div className="modal-buttons">
              <button className="secondary-button" onClick={() => setShowImportModal(false)}>
                Cancel
              </button>
              <button className="run-button" onClick={handleImportProject}>
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
