import { BellIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

interface HeaderProps {
  onCreateProject?: () => void;
  onImportProject?: () => void;
}

export default function Header({ onCreateProject, onImportProject }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4">
      <Link to="/" className="flex items-center gap-3 no-underline">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-vibe-blue via-vibe-purple to-vibe-pink flex items-center justify-center">
          <span className="text-white font-bold text-sm">V</span>
        </div>
        <span className="text-xl font-bold text-white tracking-tight">VIBE</span>
      </Link>

      <div className="flex items-center gap-2">
        {onCreateProject && (
          <button
            onClick={onCreateProject}
            className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-all"
          >
            New Project
          </button>
        )}
        {onImportProject && (
          <button
            onClick={onImportProject}
            className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-all"
          >
            Import
          </button>
        )}
        <button className="p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-xl transition-all">
          <BellIcon className="w-5 h-5" />
        </button>
        <button className="p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-xl transition-all">
          <UserCircleIcon className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
}
