import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.tsx'
import { TaskView } from './pages/TaskView.tsx'
import './index.css'

// Simple router based on URL hash
const Router = () => {
  const [view, setView] = React.useState(window.location.hash.slice(1) || 'app');
  
  React.useEffect(() => {
    const handleHashChange = () => {
      setView(window.location.hash.slice(1) || 'app');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <>
      {view === 'home' ? <Home /> : <App />}
    </>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/task/:taskId" element={<TaskView />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
