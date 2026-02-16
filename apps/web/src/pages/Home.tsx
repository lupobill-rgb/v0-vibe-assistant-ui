import { useEffect, useState } from 'react';
import {
  PlusIcon,
  PaperAirplaneIcon,
  CommandLineIcon,
} from '@heroicons/react/24/outline';
import Button from '../components/Button';
import ProjectCard from '../components/ProjectCard';
import { fetchProjects, createProject, createJob, type Project } from '../api/client';

interface HomeProps {
  onTaskCreated: (taskId: string) => void;
}

export default function Home({ onTaskCreated }: HomeProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [prompt, setPrompt] = useState('');
  const [baseBranch, setBaseBranch] = useState('main');
  const [targetBranch, setTargetBranch] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [showAddProject, setShowAddProject] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [addingProject, setAddingProject] = useState(false);

  const loadProjects = async () => {
    const data = await fetchProjects();
    setProjects(data);
    if (data.length > 0 && !selectedProject) {
      setSelectedProject(data[0].id);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleAddProject = async () => {
    const name = newProjectName.trim();
    if (!name) return;
    setAddingProject(true);
    const result = await createProject(name);
    setAddingProject(false);
    if (result.id) {
      setNewProjectName('');
      setShowAddProject(false);
      await loadProjects();
      setSelectedProject(result.id);
    }
  };

  const handleSubmit = async () => {
    if (!prompt.trim() || !selectedProject) return;
    setSubmitting(true);
    const result = await createJob({
      prompt: prompt.trim(),
      project_id: selectedProject,
      base_branch: baseBranch || 'main',
      target_branch: targetBranch || undefined,
    });
    setSubmitting(false);
    if (result.task_id) {
      onTaskCreated(result.task_id);
      setPrompt('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Hero */}
      <div className="text-center space-y-2 pt-4">
        <h1 className="text-3xl font-bold text-text">
          What do you want to build?
        </h1>
        <p className="text-text-muted text-sm max-w-lg mx-auto">
          Describe the code changes you want. VIBE generates diffs, runs
          CI-parity preflight, and opens a GitHub PR.
        </p>
      </div>

      {/* Prompt area */}
      <div className="bg-surface rounded-2xl border border-border p-5 space-y-4 shadow-lg shadow-black/20">
        <div className="relative">
          <CommandLineIcon className="absolute left-3 top-3 h-5 w-5 text-text-muted pointer-events-none" />
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the code changes you want to make..."
            rows={5}
            disabled={submitting}
            className="w-full bg-surface-alt rounded-xl border border-border pl-10 pr-4 py-3 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
          />
        </div>

        {/* Branch inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              Base Branch
            </label>
            <input
              type="text"
              value={baseBranch}
              onChange={(e) => setBaseBranch(e.target.value)}
              placeholder="main"
              disabled={submitting}
              className="w-full bg-surface-alt rounded-lg border border-border px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              Target Branch{' '}
              <span className="text-text-muted/60">(optional)</span>
            </label>
            <input
              type="text"
              value={targetBranch}
              onChange={(e) => setTargetBranch(e.target.value)}
              placeholder="Auto-generated if empty"
              disabled={submitting}
              className="w-full bg-surface-alt rounded-lg border border-border px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            variant="primary"
            size="lg"
            icon={<PaperAirplaneIcon className="h-4 w-4" />}
            loading={submitting}
            disabled={!prompt.trim() || !selectedProject}
            onClick={handleSubmit}
          >
            Run Task
          </Button>
        </div>
      </div>

      {/* Projects */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">Projects</h2>
          <Button
            variant="ghost"
            size="sm"
            icon={<PlusIcon className="h-4 w-4" />}
            onClick={() => setShowAddProject(!showAddProject)}
          >
            Add
          </Button>
        </div>

        {showAddProject && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Project name"
              disabled={addingProject}
              className="flex-1 bg-surface-alt rounded-lg border border-border px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
              onKeyDown={(e) => e.key === 'Enter' && handleAddProject()}
            />
            <Button
              variant="secondary"
              size="md"
              loading={addingProject}
              onClick={handleAddProject}
            >
              Create
            </Button>
          </div>
        )}

        {projects.length === 0 ? (
          <div className="text-center py-12 text-text-muted text-sm">
            No projects yet. Add one to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                selected={selectedProject === project.id}
                onSelect={setSelectedProject}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
