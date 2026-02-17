import { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import { TaskView } from './pages/TaskView';

function App() {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {activeSection === 'dashboard' && <Home />}
          {activeSection === 'tasks' && activeTaskId && <TaskView />}
          {activeSection === 'tasks' && !activeTaskId && (
            <div className="max-w-4xl mx-auto text-center py-20 text-text-muted text-sm">
              No active task. Go to the Dashboard and run a task.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
