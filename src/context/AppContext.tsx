import React, { createContext, useContext, useState } from 'react'
import type { UserRole, AlertRecord } from '../types'

interface StoredUser {
  id:        number
  username:  string
  role:      string
  full_name: string
  email?:    string
}

interface AppContextValue {
  role:             UserRole | null
  currentUser:      StoredUser | null
  setRole:          (r: UserRole) => void
  selectedAlert:    AlertRecord | null
  setSelectedAlert: (a: AlertRecord | null) => void
  logout:           () => void
}

const AppContext = createContext<AppContextValue>({
  role:             null,
  currentUser:      null,
  setRole:          () => {},
  selectedAlert:    null,
  setSelectedAlert: () => {},
  logout:           () => {},
})

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [role,          setRole]          = useState<UserRole | null>(null)
  const [selectedAlert, setSelectedAlert] = useState<AlertRecord | null>(null)
  const [currentUser,   setCurrentUser]   = useState<StoredUser | null>(() => {
    // Restore user from sessionStorage on page refresh
    try {
      const stored = sessionStorage.getItem('raid_user')
      return stored ? (JSON.parse(stored) as StoredUser) : null
    } catch {
      return null
    }
  })

  const handleSetRole = (r: UserRole) => {
    setRole(r)
    // Also read the user from sessionStorage when role is set
    try {
      const stored = sessionStorage.getItem('raid_user')
      if (stored) setCurrentUser(JSON.parse(stored) as StoredUser)
    } catch {
      // ignore
    }
  }

  const logout = () => {
    // Clear all session data
    sessionStorage.removeItem('raid_token')
    sessionStorage.removeItem('raid_user')
    // Reset context state
    setRole(null)
    setCurrentUser(null)
    setSelectedAlert(null)
  }

  return (
    <AppContext.Provider
      value={{
        role,
        currentUser,
        setRole: handleSetRole,
        selectedAlert,
        setSelectedAlert,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}
