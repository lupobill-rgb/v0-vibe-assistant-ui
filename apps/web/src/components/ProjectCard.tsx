import { FolderIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import type { Project } from '../api/client';

interface ProjectCardProps {
  project: Project;
  selected: boolean;
  onSelect: (id: string) => void;
}

export default function ProjectCard({
  project,
  selected,
  onSelect,
}: ProjectCardProps) {
  const synced = project.last_synced
    ? new Date(project.last_synced).toLocaleDateString()
    : 'Never';

  return (
    <button
      onClick={() => onSelect(project.id)}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-150 ${
        selected
          ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
          : 'border-border bg-surface hover:border-primary/40 hover:bg-surface-hover'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`p-2 rounded-lg ${selected ? 'bg-primary/20' : 'bg-surface-alt'}`}
        >
          <FolderIcon
            className={`h-5 w-5 ${selected ? 'text-primary-light' : 'text-text-muted'}`}
          />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text truncate">
            {project.name}
          </h3>

          <div className="mt-1 flex items-center gap-1.5 text-xs text-text-muted">
            <ArrowPathIcon className="h-3 w-3" />
            <span>Synced: {synced}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
