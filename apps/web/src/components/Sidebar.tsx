import {
  HomeIcon,
  ClockIcon,
  Cog6ToothIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: (collapsed: boolean) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: HomeIcon },
  { id: 'history', label: 'History', icon: ClockIcon },
  { id: 'analytics', label: 'Analytics', icon: ChartBarIcon },
  { id: 'settings', label: 'Settings', icon: Cog6ToothIcon },
];

export default function Sidebar({ activeSection, onSectionChange, isCollapsed, onToggleCollapse }: SidebarProps) {
  return (
    <aside
      className={`fixed left-0 top-0 h-screen flex flex-col bg-[#0F0F0F] z-50 transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-white/[0.06]">
        {!isCollapsed && (
          <button onClick={() => onSectionChange('dashboard')} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-vibe-blue via-vibe-purple to-vibe-pink flex items-center justify-center">
              <span className="text-white font-bold text-[10px]">V</span>
            </div>
            <span className="text-sm font-semibold text-white tracking-wide">VIBE</span>
          </button>
        )}
        {isCollapsed && (
          <button onClick={() => onSectionChange('dashboard')} className="mx-auto">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-vibe-blue via-vibe-purple to-vibe-pink flex items-center justify-center">
              <span className="text-white font-bold text-[10px]">V</span>
            </div>
          </button>
        )}
        {!isCollapsed && (
          <button
            onClick={() => onToggleCollapse(!isCollapsed)}
            className="p-1 text-white/30 hover:text-white/60 rounded transition-colors"
            aria-label="Collapse sidebar"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className={`space-y-1 ${isCollapsed ? 'px-1.5' : 'px-2'}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <li key={item.id}>
                {isCollapsed ? (
                  <button
                    onClick={() => onSectionChange(item.id)}
                    title={item.label}
                    className={`w-full flex flex-col items-center gap-0.5 py-2 rounded-lg text-[10px] font-medium transition-all ${
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="leading-none">{item.label}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onSectionChange(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Expand toggle at bottom when collapsed */}
      {isCollapsed && (
        <div className="px-2 py-3 border-t border-white/[0.06]">
          <button
            onClick={() => onToggleCollapse(false)}
            className="w-full flex justify-center p-1.5 text-white/30 hover:text-white/60 rounded transition-colors"
            aria-label="Expand sidebar"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Footer */}
      {!isCollapsed && (
        <div className="px-3 py-3 border-t border-white/[0.06]">
          <p className="text-white/20 text-[10px] text-center">v1.0.0</p>
        </div>
      )}
    </aside>
  );
}
