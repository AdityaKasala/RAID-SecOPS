import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { roleLabel, fmtTs, pct } from '../lib/utils'
import { fetchDashboardSummary } from '../lib/api'
import { usePageTitle } from '../lib/usePageTitle'
import type { DashboardSummary } from '../lib/api'
import { StatCard } from '../components/shared/StatCard'
import { Card } from '../components/shared/Card'
import {
  StatusBadge,
  ConfBadge,
  InvStatusBadge,
  RoleBadge,
} from '../components/shared/StatusBadge'

export default function DashboardPage() {
  const { role } = useApp()
  const navigate  = useNavigate()
  usePageTitle('Dashboard')

  const [data,    setData]    = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    setLoading(true)
    fetchDashboardSummary()
      .then((d) => { setData(d); setLoading(false) })
      .catch((err: Error) => { setError(err.message); setLoading(false) })
  }, [])

  // Navigate directly by sampleId — AlertDetailPage fetches full data itself
  const openAlert = (sampleId: string) => navigate(`/alerts/${sampleId}`)

  // ── Loading ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3">
        <svg className="animate-spin w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <span className="text-[13px] text-gray-400">Loading dashboard…</span>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="text-red-500 text-[13px] font-medium">⚠ Failed to load dashboard</div>
        <div className="text-gray-400 text-[12px]">{error}</div>
        <button className="text-[12px] text-blue-500 hover:underline" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    )
  }

  if (!data) return null

  const isGRC       = role === 'grc'
  const escalations = data.recentAlerts.filter((a) => a.investigationStatus === 'escalated')

  return (
    <div>
      {/* Page header */}
      <div className="mb-5">
        <h1 className="text-[16px] font-bold text-gray-900">Dashboard</h1>
        <p className="text-[12px] text-gray-400 mt-0.5">
          Logged in as:{' '}
          <strong className="text-gray-600">{role ? roleLabel(role) : '—'}</strong>
          {' · '}Live data from RAID-SecOps ML pipeline
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-5 gap-3.5 mb-5 max-xl:grid-cols-3 max-sm:grid-cols-2">
        <StatCard
          label="Total Alerts Processed"
          value={data.totalAlertsProcessed.toLocaleString()}
          sub="Scored by ML pipeline"
        />
        <StatCard
          label="Predicted Attacks"
          value={data.predictedAttacks}
          sub="Random Forest classification"
          valueColor="#dc2626"
        />
        <StatCard
          label="Flagged for Human Review"
          value={data.humanReviewAlerts}
          sub="deferToHuman = true"
          valueColor="#d97706"
        />
        <StatCard
          label="Connected SIEM Sources"
          value={data.connectedSources}
          sub="Splunk · Microsoft Sentinel"
        />
        <StatCard
          label="Open Escalations"
          value={data.openEscalations}
          sub="Require human review"
          valueColor="#7c3aed"
        />
      </div>

      {/* ── CISO escalation panel ── */}
      {isGRC && escalations.length > 0 && (
        <Card className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-semibold text-gray-900">
              Open Escalations — Business Risk Summary
            </h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-violet-50 text-violet-700 border border-violet-200">
              {escalations.length} escalated
            </span>
          </div>
          <div>
            {escalations.map((a) => (
              <div
                key={a.sampleId}
                className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 rounded-lg px-1 transition-colors"
                onClick={() => openAlert(a.sampleId)}
              >
                <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[10px] text-gray-400 mb-0.5">
                    {a.sampleId} · {a.sourceSiem} · {fmtTs(a.timestamp)}
                  </div>
                  <div className="text-[12px] font-medium text-gray-900">
                    {a.attackType} — {a.mitreTechnique}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    Confidence: {pct(a.confidence)} · Assigned to: {a.assignedTo ?? '—'}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200 shrink-0">
                  {pct(a.confidence)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Recent Scored Alerts table ── */}
      <Card flush>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-[13px] font-semibold text-gray-900">Recent Scored Alerts</h2>
          <button className="text-[11px] text-blue-500 hover:underline" onClick={() => navigate('/alerts')}>
            View all →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Sample ID','Timestamp','Source SIEM','Status','Confidence',
                  'Attack Type','MITRE Technique','Assigned Role','Inv. Status'].map((h) => (
                  <th key={h} className="text-left px-3.5 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.recentAlerts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-[12px] text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-2xl">📭</span>
                      <span>No alerts yet — waiting for ML pipeline to score events</span>
                    </div>
                  </td>
                </tr>
              ) : (
                data.recentAlerts.map((a) => (
                  <tr
                    key={a.sampleId}
                    className="border-t border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => openAlert(a.sampleId)}
                  >
                    <td className="px-3.5 py-2.5 font-mono text-[11px] text-gray-500">{a.sampleId}</td>
                    <td className="px-3.5 py-2.5 text-[11px] text-gray-400 whitespace-nowrap">{fmtTs(a.timestamp)}</td>
                    <td className="px-3.5 py-2.5 text-[12px] text-gray-700">{a.sourceSiem}</td>
                    <td className="px-3.5 py-2.5"><StatusBadge status={a.status} /></td>
                    <td className="px-3.5 py-2.5"><ConfBadge value={a.confidence} /></td>
                    <td className="px-3.5 py-2.5 text-[11px] text-gray-500">{a.attackType}</td>
                    <td className="px-3.5 py-2.5 text-[11px] text-gray-400 max-w-[140px] truncate" title={a.mitreTechnique}>
                      {a.mitreTechnique}
                    </td>
                    <td className="px-3.5 py-2.5"><RoleBadge role={a.assignedRole} /></td>
                    <td className="px-3.5 py-2.5"><InvStatusBadge status={a.investigationStatus} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Live footer */}
        <div className="px-5 py-2.5 border-t border-gray-100 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] text-gray-400">
            Live data · PostgreSQL · {data.recentAlerts.length} of {data.totalAlertsProcessed.toLocaleString()} alerts shown
          </span>
        </div>
      </Card>
    </div>
  )
}
