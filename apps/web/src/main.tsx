import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import Home from './pages/Home.tsx'
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
    <Router />
  </React.StrictMode>,
)
