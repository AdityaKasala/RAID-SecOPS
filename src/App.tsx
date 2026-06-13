import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { AppLayout } from './components/layout/AppLayout'
import { RequireAuth } from './routes'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AlertsQueuePage from './pages/AlertsQueuePage'
import AlertDetailPage from './pages/AlertDetailPage'
import PipelinePage from './pages/PipelinePage'
import UBPage from './pages/UBPage'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/alerts" element={<AlertsQueuePage />} />
              <Route path="/alerts/:sampleId" element={<AlertDetailPage />} />
              <Route path="/pipeline" element={<PipelinePage />} />
              <Route path="/ub" element={<UBPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
