import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { roleLabel, cn } from '../../lib/utils'
import { fetchAlerts } from '../../lib/api'

interface NavItem {
  path:  string
  label: string
  icon:  string
  key:   string
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', path: '/dashboard', label: 'Dashboard',      icon: '▦' },
  { key: 'alerts',    path: '/alerts',    label: 'Alerts Queue',   icon: '⚡' },
  { key: 'pipeline',  path: '/pipeline',  label: 'Pipeline Status', icon: '⚙' },
  { key: 'ub',        path: '/ub',        label: 'UB Assistant',   icon: '✦' },
]

export function Sidebar() {
  const { role }      = useApp()
  const navigate      = useNavigate()
  const { pathname }  = useLocation()
  const [attackCount, setAttackCount] = useState(0)

  // Fetch live attack count from DB — not mock data
  useEffect(() => {
    fetchAlerts({ status: 'ATTACK' })
      .then((alerts) => {
        const open = alerts.filter((a) => a.investigationStatus !== 'closed').length
        setAttackCount(open)
      })
      .catch(() => setAttackCount(0))
  }, [pathname]) // re-fetch when page changes so badge stays current

  return (
    <aside className="w-[220px] bg-[#0e1726] flex flex-col shrink-0 overflow-y-auto">

      {/* Role identity */}
      <div className="px-4 py-3.5 border-b border-white/[0.07]">
        <div className="text-[9px] font-medium text-white/30 uppercase tracking-widest mb-1">
          Logged in as
        </div>
        <div className="text-[12px] font-semibold text-white/80">
          {role ? roleLabel(role) : '—'}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-3 flex flex-col gap-0.5">
        <div className="text-[9px] font-medium text-white/22 uppercase tracking-widest px-2 py-1.5 mt-1">
          Navigation
        </div>

        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.path ||
            (item.path !== '/dashboard' && pathname.startsWith(item.path))

          return (
            <button
              key={item.key}
              onClick={() => navigate(item.path)}
              className={cn(
                'relative flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-[12px] text-left transition-colors',
                active
                  ? 'bg-blue-500/15 text-blue-300 font-semibold sb-active-bar'
                  : 'text-white/45 hover:text-white/80 hover:bg-white/[0.055]'
              )}
            >
              <span className="text-[13px] w-4 text-center shrink-0">{item.icon}</span>
              <span className="flex-1">{item.label}</span>

              {/* Live attack badge — from real DB */}
              {item.key === 'alerts' && attackCount > 0 && (
                <span className="bg-red-500/25 text-red-300 rounded-full px-1.5 text-[10px] font-bold leading-5">
                  {attackCount}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer — live status */}
      <div className="px-4 py-3 border-t border-white/[0.07] flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 live-dot shrink-0" />
        <p className="text-[10px] text-white/30">Live · PostgreSQL</p>
      </div>

    </aside>
  )
}
