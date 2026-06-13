import { useState } from 'react'
import type { AlertDetail, UserRole } from '../../lib/api'
import { useApp } from '../../context/AppContext'
import { cn } from '../../lib/utils'

const TABS: { key: UserRole; label: string }[] = [
  { key: 'analyst',  label: 'SOC Analyst' },
  { key: 'engineer', label: 'Security Engineer' },
  { key: 'grc',      label: 'CISO / GRC' },
]

export function RecommendationPanel({ alert }: { alert: AlertDetail }) {
  const { role } = useApp()
  const [activeTab, setActiveTab] = useState<UserRole>(role ?? 'analyst')

  const rec = alert.recommendations[activeTab]

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <h3 className="text-[13px] font-semibold text-gray-900 mb-3">
        Role-Aware Recommendation
      </h3>

      {/* Tabs */}
      <div className="flex gap-1.5 border-b border-gray-100 pb-3 mb-3">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors border',
              activeTab === tab.key
                ? 'bg-[#0e1726] text-white border-[#0e1726]'
                : 'text-gray-500 border-transparent hover:bg-gray-100 hover:text-gray-700'
            )}
          >
            {tab.label}
            {/* Highlight current user's role */}
            {tab.key === role && activeTab !== tab.key && (
              <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
            )}
          </button>
        ))}
      </div>

      {/* Recommendation text */}
      {rec ? (
        <p className="text-[12px] text-gray-600 leading-relaxed whitespace-pre-wrap">
          {rec}
        </p>
      ) : (
        <p className="text-[12px] text-gray-400 italic">
          No recommendation available for this role.
        </p>
      )}
    </div>
  )
}
