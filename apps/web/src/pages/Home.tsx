import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightIcon, PlusIcon, ArrowDownTrayIcon, XMarkIcon } from '@heroicons/react/24/solid';
import Header from '../components/Header';
import ProjectCard from '../components/ProjectCard';
import LogEntry from '../components/LogEntry';

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

type Tab = 'recent' | 'starred';

function Home() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [baseBranch, setBaseBranch] = useState('main');
  const [targetBranch, setTargetBranch] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<string>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('recent');
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [importRepoUrl, setImportRepoUrl] = useState('');

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

  useEffect(() => {
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

  // Poll for task status
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
    if (!newProjectName.trim()) return;
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
      }
    } catch (error) {
      console.error('Create project error:', error);
    }
  };

  const handleImportProject = async () => {
    if (!importRepoUrl.trim()) return;
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
      }
    } catch (error) {
      console.error('Import project error:', error);
    }
  };

  const handleRun = async () => {
    if (!prompt.trim() || !selectedProject) return;

    setIsRunning(true);
    setLogs([]);
    setPrUrl(null);
    setTaskId(null);
    setTaskStatus('');

    try {
      const response = await fetch(`${API_URL}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          project_id: selectedProject,
          base_branch: baseBranch || 'main',
          target_branch: targetBranch || undefined,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setTaskId(data.task_id);
      } else {
        setIsRunning(false);
      }
    } catch (error) {
      console.error('Run error:', error);
      setIsRunning(false);
    }
  };

  const toggleStar = (id: string) => {
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredProjects =
    activeTab === 'starred'
      ? projects.filter((p) => starredIds.has(p.id))
      : projects;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'recent', label: 'Recent' },
    { id: 'starred', label: 'Starred' },
  ];

  return (
    <div className="min-h-screen">
      <Header
        onCreateProject={() => setShowCreateModal(true)}
        onImportProject={() => setShowImportModal(true)}
      />

      {/* Hero Section */}
      <div className="max-w-3xl mx-auto px-6 pt-16 pb-8 text-center">
        <h1 className="text-5xl font-bold mb-4">
          <span className="bg-gradient-to-r from-vibe-blue via-vibe-purple to-vibe-pink bg-clip-text text-transparent">
            What do you want to build?
          </span>
        </h1>
        <p className="text-white/50 text-lg mb-10">
          Describe your changes in natural language. VIBE generates diffs, runs preflight, and opens PRs.
        </p>

        {/* Prompt Input Card */}
        <div className="glass-card p-2 shadow-glow-lg">
          <div className="flex items-center gap-2 mb-2 px-2 pt-1">
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              disabled={isRunning}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-white/80 outline-none focus:border-vibe-blue/50 transition-colors appearance-none cursor-pointer"
            >
              <option value="" className="bg-gray-900">Select project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-gray-900">
                  {p.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-white/40 hover:text-white/70 transition-colors px-2 py-1"
            >
              {showAdvanced ? 'Hide options' : 'Options'}
            </button>
          </div>

          {showAdvanced && (
            <div className="flex gap-2 px-2 mb-2 animate-fade-in">
              <input
                type="text"
                value={baseBranch}
                onChange={(e) => setBaseBranch(e.target.value)}
                placeholder="Base branch (main)"
                disabled={isRunning}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-white placeholder-white/30 outline-none focus:border-vibe-blue/50 transition-colors"
              />
              <input
                type="text"
                value={targetBranch}
                onChange={(e) => setTargetBranch(e.target.value)}
                placeholder="Target branch (auto)"
                disabled={isRunning}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-white placeholder-white/30 outline-none focus:border-vibe-blue/50 transition-colors"
              />
            </div>
          )}

          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the code changes you want to make..."
              rows={3}
              disabled={isRunning}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleRun();
                }
              }}
              className="w-full bg-transparent text-white placeholder-white/30 px-4 py-3 text-base outline-none resize-none"
            />
            <div className="flex items-center justify-end px-2 pb-2">
              <button
                onClick={handleRun}
                disabled={isRunning || !prompt.trim() || !selectedProject}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-vibe-blue to-vibe-purple text-white font-semibold rounded-3xl hover:shadow-glow transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
              >
                {isRunning ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Running...
                  </>
                ) : (
                  <>
                    Run
                    <ArrowRightIcon className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Live Logs (visible when running or has logs) */}
      {(logs.length > 0 || isRunning) && (
        <div className="max-w-3xl mx-auto px-6 mb-8 animate-slide-up">
          <div className="glass-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-white/80">Live Output</h3>
                {taskStatus && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                      taskStatus === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : taskStatus === 'failed'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-vibe-blue/20 text-vibe-blue'
                    }`}
                  >
                    {taskStatus.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
              {taskId && (
                <button
                  onClick={() => navigate(`/task/${taskId}`)}
                  className="text-xs text-vibe-blue hover:text-vibe-purple transition-colors font-medium"
                >
                  View Details
                </button>
              )}
            </div>
            <div
              ref={logContainerRef}
              className="max-h-64 overflow-y-auto p-2 bg-black/30"
            >
              {logs.map((log) => (
                <LogEntry
                  key={log.event_id}
                  timestamp={new Date(log.event_time).toLocaleTimeString()}
                  message={log.event_message}
                  severity={log.severity}
                />
              ))}
            </div>
            {prUrl && (
              <div className="px-5 py-3 border-t border-white/10 bg-emerald-500/5">
                <a
                  href={prUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                >
                  View Pull Request &rarr;
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Projects Section */}
      <div className="max-w-5xl mx-auto px-6 pb-16">
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-1 bg-white/5 rounded-xl p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white/10 text-white'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all"
            >
              <PlusIcon className="w-4 h-4" />
              Create
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Import
            </button>
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-white/30 text-lg mb-4">
              {activeTab === 'starred' ? 'No starred projects yet' : 'No projects yet'}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-vibe-blue to-vibe-purple text-white font-semibold rounded-3xl hover:shadow-glow transition-all"
            >
              Create your first project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                id={project.id}
                name={project.name}
                lastEdited={
                  project.last_synced
                    ? new Date(project.last_synced).toLocaleDateString()
                    : new Date(project.created_at).toLocaleDateString()
                }
                isStarred={starredIds.has(project.id)}
                repositoryUrl={project.repository_url}
                onToggleStar={toggleStar}
                onClick={(id) => {
                  setSelectedProject(id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="glass-card p-8 w-full max-w-md mx-4 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Create New Project</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-white/60 mb-2">
                Project Name
              </label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="my-awesome-project"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-vibe-blue/50 transition-colors"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2.5 bg-white/5 text-white/70 border border-white/10 rounded-3xl font-medium hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-vibe-blue to-vibe-purple text-white font-semibold rounded-3xl hover:shadow-glow transition-all disabled:opacity-40"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Project Modal */}
      {showImportModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
          onClick={() => setShowImportModal(false)}
        >
          <div
            className="glass-card p-8 w-full max-w-md mx-4 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Import from GitHub</h2>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-white/60 mb-2">
                Repository URL
              </label>
              <input
                type="text"
                value={importRepoUrl}
                onChange={(e) => setImportRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                onKeyDown={(e) => e.key === 'Enter' && handleImportProject()}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-vibe-blue/50 transition-colors"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowImportModal(false)}
                className="flex-1 px-4 py-2.5 bg-white/5 text-white/70 border border-white/10 rounded-3xl font-medium hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleImportProject}
                disabled={!importRepoUrl.trim()}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-vibe-blue to-vibe-purple text-white font-semibold rounded-3xl hover:shadow-glow transition-all disabled:opacity-40"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
