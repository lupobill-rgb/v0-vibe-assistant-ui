import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useJobLogs } from '../hooks/useJobLogs';
import './TaskView.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface TaskDetails {
  task_id: string;
  prompt: string;
  execution_state: string;
  pull_request_link?: string;
  created_at: number;
  completed_at?: number;
  project_id?: string;
  repo_url?: string;
  base_branch?: string;
  target_branch?: string;
}

// TODO: Add FileChange interface when API endpoint is available
// interface FileChange {
//   path: string;
//   additions: number;
//   deletions: number;
//   status: 'added' | 'modified' | 'deleted';
// }

export function TaskView() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [taskDetails, setTaskDetails] = useState<TaskDetails | null>(null);
  const [loadingTask, setLoadingTask] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Use the existing useJobLogs hook for live logs
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

    const fetchTaskDetails = async () => {
      try {
        const response = await fetch(`${API_URL}/jobs/${taskId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch task details');
        }
        const data = await response.json();
        setTaskDetails(data);
        setLoadingTask(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoadingTask(false);
      }
    };

    fetchTaskDetails();
    
    // Poll for updates until task is complete
    const interval = setInterval(fetchTaskDetails, 3000);
    
    return () => clearInterval(interval);
  }, [taskId]);

  // TODO: Fetch file changes from API when endpoint is available
  // For now, file changes section will be hidden until API endpoint is implemented

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, string> = {
      queued: '#aaa',
      completed: '#6ee7b7',
      failed: '#f87171',
    };
    // All in-progress statuses use the same color
    return statusMap[status] || '#7da3e0';
  };

  const getStatusLabel = (status: string) => {
    return status.replace(/_/g, ' ').toUpperCase();
  };

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

  const getCurrentStageIndex = (status: string) => {
    const index = pipelineStages.findIndex(stage => stage.id === status);
    return index >= 0 ? index : 0;
  };

  if (loadingTask) {
    return (
      <div className="task-view">
        <div className="loading">Loading task details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="task-view">
        <div className="error-message">Error: {error}</div>
        <button className="back-button" onClick={() => navigate('/')}>
          ← Back to Home
        </button>
      </div>
    );
  }

  if (!taskDetails) {
    return (
      <div className="task-view">
        <div className="error-message">Task not found</div>
        <button className="back-button" onClick={() => navigate('/')}>
          ← Back to Home
        </button>
      </div>
    );
  }

  const currentStageIndex = getCurrentStageIndex(taskDetails.execution_state);

  return (
    <div className="task-view">
      <header className="task-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← Back to Home
        </button>
        <h1>Task Execution</h1>
      </header>

      <div className="task-container">
        {/* Left: Task Details & Status Pipeline */}
        <div className="task-details-section">
          {/* Task Info */}
          <div className="task-info-card">
            <h2>Task Details</h2>
            <div className="task-info-item">
              <span className="info-label">Task ID:</span>
              <span className="info-value">{taskDetails.task_id}</span>
            </div>
            <div className="task-info-item">
              <span className="info-label">Status:</span>
              <span 
                className="status-badge" 
                style={{ backgroundColor: getStatusColor(taskDetails.execution_state) }}
              >
                {getStatusLabel(taskDetails.execution_state)}
              </span>
            </div>
            <div className="task-info-item">
              <span className="info-label">Prompt:</span>
              <div className="info-value prompt-text">{taskDetails.prompt}</div>
            </div>
            {taskDetails.repo_url && (
              <div className="task-info-item">
                <span className="info-label">Repository:</span>
                <span className="info-value">{taskDetails.repo_url}</span>
              </div>
            )}
            {taskDetails.base_branch && (
              <div className="task-info-item">
                <span className="info-label">Base Branch:</span>
                <span className="info-value">{taskDetails.base_branch}</span>
              </div>
            )}
            {taskDetails.target_branch && (
              <div className="task-info-item">
                <span className="info-label">Target Branch:</span>
                <span className="info-value">{taskDetails.target_branch}</span>
              </div>
            )}
          </div>

          {/* Status Pipeline */}
          <div className="status-pipeline-card">
            <h2>Execution Pipeline</h2>
            <div className="pipeline-stages">
              {pipelineStages.map((stage, index) => {
                const isActive = index === currentStageIndex;
                const isFailed = taskDetails.execution_state === 'failed' && index === currentStageIndex;
                // Only mark as completed if: 1) index is before current stage, OR 2) task is completed (not failed)
                const isCompleted = index < currentStageIndex || 
                                   (taskDetails.execution_state === 'completed' && index <= currentStageIndex);
                
                return (
                  <div 
                    key={stage.id} 
                    className={`pipeline-stage ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isFailed ? 'failed' : ''}`}
                  >
                    <div className="stage-indicator">
                      {isCompleted ? '✓' : isActive ? '●' : '○'}
                    </div>
                    <div className="stage-label">{stage.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* File Changes (if completed) */}
          {/* TODO: Add file changes display when API endpoint is available */}
          {/* {taskDetails.execution_state === 'completed' && fileChanges.length > 0 && (
            <div className="file-changes-card">
              <h2>File Changes</h2>
              <div className="file-list">
                {fileChanges.map((file, index) => (
                  <div key={index} className="file-item">
                    <div className="file-path">
                      <span className={`file-status-icon status-${file.status}`}>
                        {file.status === 'added' && '+'}
                        {file.status === 'modified' && 'M'}
                        {file.status === 'deleted' && '-'}
                      </span>
                      {file.path}
                    </div>
                    <div className="file-stats">
                      <span className="additions">+{file.additions}</span>
                      <span className="deletions">-{file.deletions}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )} */}

          {/* Result Actions */}
          {taskDetails.execution_state === 'completed' && (
            <div className="result-actions-card">
              <h2>Actions</h2>
              {taskDetails.pull_request_link ? (
                <a 
                  href={taskDetails.pull_request_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="action-button pr-button"
                >
                  View Pull Request →
                </a>
              ) : (
                <div className="info-message">No pull request created</div>
              )}
            </div>
          )}
        </div>

        {/* Right: Live Logs */}
        <div className="logs-section">
          <div className="logs-card">
            <h2>Live Logs</h2>
            {logsError && (
              <div className="error-message">{logsError}</div>
            )}
            <div className="log-console" ref={logContainerRef}>
              {logs.length === 0 && !logsError && (
                <div className="log-empty">Waiting for logs...</div>
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
          </div>
        </div>
      </div>
    </div>
  );
}
