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
      className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-card cursor-pointer transition-all duration-200 group animate-fade-in"
      onClick={() => onClick?.(id)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-vibe-blue/10 to-vibe-purple/10 border border-gray-100 flex items-center justify-center">
          <FolderIcon className="w-5 h-5 text-vibe-blue" />
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar?.(id);
          }}
          className="text-gray-300 hover:text-amber-400 transition-colors p-1"
        >
          {isStarred ? (
            <StarSolid className="w-5 h-5 text-amber-400" />
          ) : (
            <StarOutline className="w-5 h-5" />
          )}
        </button>
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1 truncate">{name}</h3>
      {repositoryUrl && (
        <p className="text-xs text-gray-400 truncate mb-1">{repositoryUrl}</p>
      )}
      <p className="text-xs text-gray-400">Edited {lastEdited}</p>
    </div>
  );
}
