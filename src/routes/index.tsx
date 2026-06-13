import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'

/** Redirect to login if no role is selected */
export function RequireAuth() {
  const { role } = useApp()
  const location = useLocation()

  if (!role) {
    return <Navigate to="/" replace state={{ from: location }} />
  }

  return <Outlet />
}
