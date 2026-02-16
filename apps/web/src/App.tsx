import { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import TaskView from './pages/TaskView';

type Page = 'home' | 'tasks';

function App() {
  const [page, setPage] = useState<Page>('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const handleTaskCreated = (taskId: string) => {
    setActiveTaskId(taskId);
    setPage('tasks');
  };

  const handleBack = () => {
    setActiveTaskId(null);
    setPage('home');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        currentPage={page}
        onNavigate={(p) => {
          setPage(p);
          if (p === 'home') setActiveTaskId(null);
        }}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-col flex-1 min-w-0">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 overflow-y-auto p-6">
          {page === 'home' && <Home onTaskCreated={handleTaskCreated} />}
          {page === 'tasks' && activeTaskId && (
            <TaskView taskId={activeTaskId} onBack={handleBack} />
          )}
          {page === 'tasks' && !activeTaskId && (
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
