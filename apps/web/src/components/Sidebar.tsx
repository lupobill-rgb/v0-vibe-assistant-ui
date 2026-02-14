import {
  HomeIcon,
  FolderIcon,
  ClockIcon,
  Cog6ToothIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: (collapsed: boolean) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: HomeIcon },
  { id: 'projects', label: 'Projects', icon: FolderIcon },
  { id: 'history', label: 'Job History', icon: ClockIcon },
  { id: 'settings', label: 'Settings', icon: Cog6ToothIcon },
];

export default function Sidebar({ activeSection, onSectionChange, isCollapsed, onToggleCollapse }: SidebarProps) {
  return (
    <aside
      className={`fixed left-0 top-0 h-screen flex flex-col border-r border-white/10 bg-[#0d0d1f]/80 backdrop-blur-xl z-50 transition-all duration-300 ${
        isCollapsed ? 'w-[68px]' : 'w-[240px]'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-white/10">
        {!isCollapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-vibe-blue via-vibe-purple to-vibe-pink flex items-center justify-center">
              <span className="text-white font-bold text-xs">V</span>
            </div>
            <span className="text-lg font-bold text-white">VIBE</span>
          </div>
        )}
        <button
          onClick={() => onToggleCollapse(!isCollapsed)}
          className="p-1.5 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRightIcon className="w-4 h-4" />
          ) : (
            <ChevronLeftIcon className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onSectionChange(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-vibe-blue/20 to-vibe-purple/20 text-white border border-white/10'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                  } ${isCollapsed ? 'justify-center px-0' : ''}`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-vibe-blue' : ''}`} />
                  {!isCollapsed && <span>{item.label}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/10">
        {!isCollapsed && (
          <p className="text-white/30 text-xs text-center">v1.0.0</p>
        )}
      </div>
    </aside>
  );
}
