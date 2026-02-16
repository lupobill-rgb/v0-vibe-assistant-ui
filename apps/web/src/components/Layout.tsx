import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const sectionMap: Record<string, string> = {
    '/': 'dashboard',
    '/history': 'history',
    '/analytics': 'analytics',
    '/settings': 'settings',
  };

  const routeMap: Record<string, string> = {
    dashboard: '/',
    projects: '/',
    history: '/history',
    analytics: '/analytics',
    settings: '/settings',
  };

  const activeSection = sectionMap[location.pathname] || 'dashboard';

  const handleSectionChange = (section: string) => {
    const route = routeMap[section] || '/';
    navigate(route);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        isCollapsed={isCollapsed}
        onToggleCollapse={setIsCollapsed}
      />
      <div
        className={`flex-1 transition-all duration-300 ${
          isCollapsed ? 'ml-[68px]' : 'ml-[240px]'
        }`}
      >
        <Header />
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
