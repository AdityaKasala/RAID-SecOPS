import { useEffect, useState, useCallback } from 'react'
import { fetchAlerts } from '../lib/api'
import type { AlertRow } from '../lib/api'
import { AlertsTable } from '../components/alerts/AlertsTable'
import { usePageTitle } from '../lib/usePageTitle'

export default function AlertsQueuePage() {
  usePageTitle('Alerts Queue')
  const [alerts, setAlerts]   = useState<AlertRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  // Filter state
  const [search,      setSearch]      = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [filterSiem,   setFilterSiem]   = useState('ALL')
  const [filterDefer,  setFilterDefer]  = useState('ALL')

  // Debounce search so we don't call API on every keystroke
  const [searchDebounced, setSearchDebounced] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 350)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch alerts from FastAPI whenever filters change
  const loadAlerts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params: Record<string, string | boolean> = {}
      if (filterStatus !== 'ALL')  params.status      = filterStatus
      if (filterSiem   !== 'ALL')  params.source_siem = filterSiem
      if (filterDefer  === 'YES')  params.defer       = true
      if (filterDefer  === 'NO')   params.defer       = false
      if (searchDebounced.trim())  params.search      = searchDebounced.trim()

      const data = await fetchAlerts(params as never)
      setAlerts(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts')
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterSiem, filterDefer, searchDebounced])

  useEffect(() => {
    void loadAlerts()
  }, [loadAlerts])

  return (
    <div>
      {/* Page header */}
      <div className="mb-5">
        <h1 className="text-[16px] font-bold text-gray-900">Alerts Queue</h1>
        <p className="text-[12px] text-gray-400 mt-0.5">
          All alerts scored by the RAID-SecOps ML pipeline ·{' '}
          {loading ? 'Loading…' : `${alerts.length} result${alerts.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        {/* Search */}
        <input
          className="flex-1 min-w-[220px] border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-white"
          placeholder="Search sample ID, attack type, MITRE, SIEM…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Status filter */}
        <select
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] outline-none bg-white text-gray-600 focus:border-blue-400"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="ALL">All statuses</option>
          <option value="ATTACK">ATTACK only</option>
          <option value="NORMAL">NORMAL only</option>
        </select>

        {/* SIEM filter */}
        <select
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] outline-none bg-white text-gray-600 focus:border-blue-400"
          value={filterSiem}
          onChange={(e) => setFilterSiem(e.target.value)}
        >
          <option value="ALL">All SIEMs</option>
          <option value="Splunk">Splunk</option>
          <option value="Sentinel">Sentinel</option>
        </select>

        {/* Defer filter */}
        <select
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] outline-none bg-white text-gray-600 focus:border-blue-400"
          value={filterDefer}
          onChange={(e) => setFilterDefer(e.target.value)}
        >
          <option value="ALL">All defer flags</option>
          <option value="YES">Defer: Human Review</option>
          <option value="NO">Defer: Auto</option>
        </select>

        {/* Refresh button */}
        <button
          onClick={() => void loadAlerts()}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] text-gray-500 bg-white hover:bg-gray-50 transition-colors flex items-center gap-1.5"
          title="Refresh alerts"
        >
          <svg
            className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M4 4v5h5M20 20v-5h-5" />
            <path d="M4 9a9 9 0 0115.5-4.5M20 15a9 9 0 01-15.5 4.5" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          <span className="text-red-500 text-[13px]">⚠</span>
          <span className="text-[12px] text-red-600">{error}</span>
          <button
            className="ml-auto text-[11px] text-red-500 hover:underline"
            onClick={() => void loadAlerts()}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['Sample ID','Timestamp','Source','Status','Confidence',
                    'Attack Type','MITRE','Defer','Role','Status','Action'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-3.5 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4].map((n) => (
                  <tr key={n} className="border-t border-gray-50">
                    {Array.from({ length: 11 }).map((_, i) => (
                      <td key={i} className="px-3.5 py-3">
                        <div className="h-3 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <AlertsTable data={alerts} />
      )}

      {/* Footer */}
      {!loading && !error && (
        <div className="flex items-center gap-2 mt-3">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] text-gray-400">
            Live data · PostgreSQL · Filters applied server-side
          </span>
        </div>
      )}
    </div>
  )
}
