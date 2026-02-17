import { BellIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onCreateProject?: () => void;
  onImportProject?: () => void;
}

export default function Header({ onCreateProject, onImportProject }: HeaderProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
      <div className="flex items-center gap-3">
        {onCreateProject && (
          <button
            onClick={onCreateProject}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-xl transition-all"
          >
            New Project
          </button>
        )}
        {onImportProject && (
          <button
            onClick={onImportProject}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-xl transition-all"
          >
            Import
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/history')}
          title="Job History"
          className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-all"
        >
          <BellIcon className="w-5 h-5" />
        </button>
        {user ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 hidden sm:inline">{user.name}</span>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-all"
              title="Sign out"
            >
              <UserCircleIcon className="w-6 h-6" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-all"
            title="Sign in"
          >
            <UserCircleIcon className="w-6 h-6" />
          </button>
        )}
      </div>
    </header>
  );
}
