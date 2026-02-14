import { useState } from 'react';
import './Sidebar.css';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'projects', label: 'Projects', icon: '📁' },
    { id: 'history', label: 'Job History', icon: '📜' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          {!isCollapsed && <span className="logo-text">VIBE</span>}
        </div>
        <button
          className="sidebar-toggle"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>

      <nav className="sidebar-nav">
        <ul className="nav-list">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
                onClick={() => onSectionChange(item.id)}
                title={isCollapsed ? item.label : undefined}
              >
                <span className="nav-icon">{item.icon}</span>
                {!isCollapsed && <span className="nav-label">{item.label}</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        {!isCollapsed && (
          <div className="sidebar-footer-content">
            <p className="footer-text">v1.0.0</p>
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
