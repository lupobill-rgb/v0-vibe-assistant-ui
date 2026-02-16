import { StarIcon as StarOutline } from '@heroicons/react/24/outline';
import { StarIcon as StarSolid, FolderIcon } from '@heroicons/react/24/solid';

interface ProjectCardProps {
  id: string;
  name: string;
  lastEdited: string;
  isStarred: boolean;
  repositoryUrl?: string;
  onToggleStar?: (id: string) => void;
  onClick?: (id: string) => void;
}

export default function ProjectCard({
  id,
  name,
  lastEdited,
  isStarred,
  repositoryUrl,
  onToggleStar,
  onClick,
}: ProjectCardProps) {
  return (
    <div
      className="glass-card p-5 hover:bg-white/[0.09] hover:border-white/20 hover:shadow-card-hover cursor-pointer transition-all duration-200 group animate-fade-in"
      onClick={() => onClick?.(id)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-vibe-blue/20 to-vibe-purple/20 border border-white/10 flex items-center justify-center">
          <FolderIcon className="w-5 h-5 text-vibe-blue" />
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar?.(id);
          }}
          className="text-white/30 hover:text-amber-400 transition-colors p-1"
        >
          {isStarred ? (
            <StarSolid className="w-5 h-5 text-amber-400" />
          ) : (
            <StarOutline className="w-5 h-5" />
          )}
        </button>
      </div>
      <h3 className="text-base font-semibold text-white mb-1 truncate">{name}</h3>
      {repositoryUrl && (
        <p className="text-xs text-white/30 truncate mb-1">{repositoryUrl}</p>
      )}
      <p className="text-xs text-white/40">Edited {lastEdited}</p>
    </div>
  );
}
