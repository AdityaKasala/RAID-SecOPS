import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'

/**
 * Protects all app routes.
 * Checks both the React context (role) AND sessionStorage (raid_token).
 * This means if the user refreshes the page, they stay logged in
 * as long as the token is still in sessionStorage.
 * When they click Sign Out, both are cleared so they go back to login.
 */
export function RequireAuth() {
  const { role }    = useApp()
  const location    = useLocation()
  const token       = sessionStorage.getItem('raid_token')

  // Allow through if either context has role OR sessionStorage has token
  const isAuthenticated = !!role || !!token

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location }} />
  }

  return <Outlet />
}
