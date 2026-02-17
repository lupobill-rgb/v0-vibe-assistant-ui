import { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import { TaskView } from './pages/TaskView';

function App() {
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
      <div className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ${isCollapsed ? 'ml-[68px]' : 'ml-[240px]'}`}>
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {activeSection === 'dashboard' && <Home />}
          {activeSection === 'tasks' && <TaskView />}
        </main>
      </div>
    </div>
  );
}

export default App;
