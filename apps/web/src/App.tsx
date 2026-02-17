import { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import { TaskView } from './pages/TaskView';

function App() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={(section) => {
          setActiveSection(section);
          if (section === 'dashboard') setActiveTaskId(null);
        }}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={setSidebarCollapsed}
      />

      <div
        className={`flex flex-col flex-1 min-w-0 bg-white transition-all duration-300 ${
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        <Header />

        <main className="flex-1 overflow-y-auto">
          {activeSection === 'dashboard' && <Home />}
          {activeSection === 'tasks' && activeTaskId && (
            <TaskView />
          )}
          {activeSection === 'tasks' && !activeTaskId && (
            <div className="max-w-4xl mx-auto text-center py-20 text-gray-400 text-sm">
              No active task. Go to the Dashboard and run a task.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
