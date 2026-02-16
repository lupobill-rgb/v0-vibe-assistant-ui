import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import { TaskView } from './pages/TaskView'
import DiffView from './pages/DiffView'
import HistoryPage from './pages/HistoryPage'
import AnalyticsDashboard from './pages/AnalyticsDashboard'
import SettingsPage from './pages/SettingsPage'
import LoginPage from './pages/LoginPage'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/analytics" element={<AnalyticsDashboard />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="/task/:taskId" element={<TaskView />} />
          <Route path="/diff/:taskId" element={<DiffView />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>,
)
