import {
  HomeIcon,
  QueueListIcon,
  FolderIcon,
  Cog6ToothIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

type Page = 'home' | 'tasks';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  open: boolean;
  onClose: () => void;
}

const navItems: { id: Page; label: string; icon: typeof HomeIcon }[] = [
  { id: 'home', label: 'Dashboard', icon: HomeIcon },
  { id: 'tasks', label: 'Tasks', icon: QueueListIcon },
];

export default function Sidebar({
  currentPage,
  onNavigate,
  open,
  onClose,
}: SidebarProps) {
  return (
    <>
      {/* Overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-60 bg-surface border-r border-border flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile close button */}
        <div className="flex items-center justify-between p-4 lg:hidden">
          <span className="font-bold text-text">Menu</span>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-surface-alt"
          >
            <XMarkIcon className="h-5 w-5 text-text-muted" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary/10 text-primary-light'
                    : 'text-text-muted hover:text-text hover:bg-surface-alt'
                }`}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-border px-3 py-3">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-muted hover:text-text hover:bg-surface-alt transition-colors">
            <Cog6ToothIcon className="h-5 w-5 shrink-0" />
            Settings
          </button>

          <div className="mt-3 mx-3">
            <div className="flex items-center gap-2">
              <FolderIcon className="h-4 w-4 text-text-muted" />
              <span className="text-xs text-text-muted truncate">
                Projects
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
