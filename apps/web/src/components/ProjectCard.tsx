import { StarIcon as StarOutline } from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';

interface ProjectCardProps {
  id: string;
  name: string;
  lastEdited: string;
  isStarred: boolean;
  onToggleStar?: (id: string) => void;
  onClick?: (id: string) => void;
}

export default function ProjectCard({
  id,
  name,
  lastEdited,
  isStarred,
  onToggleStar,
  onClick
}: ProjectCardProps) {
  return (
    <div 
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onClick?.(id)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{name}</h3>
          <p className="text-sm text-gray-500">Edited {lastEdited}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar?.(id);
          }}
          className="text-gray-400 hover:text-yellow-500 transition-colors"
        >
          {isStarred ? (
            <StarSolid className="w-5 h-5 text-yellow-500" />
          ) : (
            <StarOutline className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
}
