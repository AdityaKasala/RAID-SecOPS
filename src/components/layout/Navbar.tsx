import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { roleLabel } from '../../lib/utils'

export function Navbar() {
  const { role, currentUser, logout } = useApp()
  const navigate = useNavigate()
  const [time, setTime] = useState('')
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }))
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [])

  // Close menu when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('#user-menu')) setShowMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => {
    setShowMenu(false)
    logout()
    navigate('/')
  }

  // Get initials from full name or username
  const initials = currentUser?.full_name
    ? currentUser.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : currentUser?.username?.slice(0, 2).toUpperCase() ?? '??'

  return (
    <header className="h-[52px] bg-white border-b border-gray-200 flex items-center px-5 gap-3 shrink-0 shadow-sm z-50 relative">

      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 bg-[#3b82f6] rounded-lg flex items-center justify-center text-white text-[12px] font-bold shadow">
          R
        </div>
        <div>
          <div className="text-[13px] font-bold text-gray-900 leading-none">RAID-SecOps</div>
          <div className="text-[10px] text-gray-400 leading-none mt-0.5">AI Decision Support</div>
        </div>
      </div>

      <div className="w-px h-5 bg-gray-200 mx-1" />

      {/* Live indicator */}
      <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 live-dot" />
        Pipeline live
      </div>

      <div className="flex-1" />

      {/* Time */}
      <span className="text-[11px] text-gray-400 hidden sm:block">{time}</span>

      {/* Role pill */}
      {role && (
        <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1 text-[11px] font-semibold text-blue-700">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          {roleLabel(role)}
        </div>
      )}

      {/* User menu */}
      {currentUser && (
        <div id="user-menu" className="relative">
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {/* Avatar */}
            <div className="w-7 h-7 rounded-full bg-[#0e1726] text-white text-[11px] font-bold flex items-center justify-center">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-[11px] font-semibold text-gray-800 leading-none">
                {currentUser.full_name}
              </div>
              <div className="text-[10px] text-gray-400 leading-none mt-0.5 font-mono">
                {currentUser.username}
              </div>
            </div>
            {/* Chevron */}
            <svg
              className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showMenu ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {/* Dropdown */}
          {showMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50">

              {/* User info */}
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="text-[12px] font-semibold text-gray-900">
                  {currentUser.full_name}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5 font-mono">
                  {currentUser.username}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {currentUser.email ?? '—'}
                </div>
                <div className="mt-1.5">
                  <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    {role ? roleLabel(role) : '—'}
                  </span>
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] text-red-600 hover:bg-red-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign out
              </button>

            </div>
          )}
        </div>
      )}
    </header>
  )
}
