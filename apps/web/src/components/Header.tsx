import { Bars3Icon, BellIcon } from '@heroicons/react/24/outline';
import { SparklesIcon } from '@heroicons/react/24/solid';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  return (
    <header className="h-14 border-b border-border bg-surface flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-md hover:bg-surface-alt transition-colors lg:hidden"
        >
          <Bars3Icon className="h-5 w-5 text-text-muted" />
        </button>

        <div className="flex items-center gap-2">
          <SparklesIcon className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold tracking-tight text-text">
            VIBE
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="p-2 rounded-md hover:bg-surface-alt transition-colors relative">
          <BellIcon className="h-5 w-5 text-text-muted" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
        </button>

        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary-light">
          V
        </div>
      </div>
    </header>
  );
}
