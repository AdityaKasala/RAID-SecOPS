import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchAlert, updateAlertStatus } from '../lib/api'
import type { AlertDetail, AlertNote, InvestigationStatus } from '../lib/api'
import { fmtTs, roleLabel } from '../lib/utils'
import { useApp } from '../context/AppContext'
import {
  StatusBadge,
  ConfBadge,
  DeferBadge,
  InvStatusBadge,
  RoleBadge,
} from '../components/shared/StatusBadge'
import { ModelOutputPanel }    from '../components/alerts/ModelOutputPanel'
import { RecommendationPanel } from '../components/alerts/RecommendationPanel'
import { AlertMetaPanel }      from '../components/alerts/AlertMetaPanel'
import { NotesPanel }          from '../components/alerts/NotesPanel'
import { Card }                from '../components/shared/Card'
import { Button }              from '../components/shared/Button'
import { ChevronLeft }         from 'lucide-react'
import { usePageTitle } from '../lib/usePageTitle'

export default function AlertDetailPage() {
  const { sampleId } = useParams<{ sampleId: string }>()
  const navigate      = useNavigate()
  const { role }      = useApp()
  usePageTitle(sampleId ? `Alert ${sampleId}` : 'Alert Detail')

  const [alert,         setAlert]         = useState<AlertDetail | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Fetch full alert detail from DB
  useEffect(() => {
    if (!sampleId) return
    setLoading(true)
    fetchAlert(sampleId)
      .then((data) => { setAlert(data); setLoading(false) })
      .catch((err: Error) => { setError(err.message); setLoading(false) })
  }, [sampleId])

  // ── Role permission check ──────────────────────────────────
  // True only if the logged-in role matches the alert's assigned role
  const canAction = role !== null && alert !== null && role === alert.assignedRole

  // ── Action button handler ──────────────────────────────────
  const handleAction = async (newStatus: InvestigationStatus, label: string) => {
    if (!alert || !canAction) return
    setActionLoading(label)
    setError('')
    try {
      const updated = await updateAlertStatus(alert.sampleId, newStatus)
      setAlert(updated)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActionLoading(null)
    }
  }

  // ── Note added — update local state without refetch ─────────
  const handleNoteAdded = (note: AlertNote) => {
    setAlert((prev) =>
      prev ? { ...prev, notes: [...prev.notes, note] } : prev
    )
  }

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3">
        <svg className="animate-spin w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <span className="text-[13px] text-gray-400">Loading alert…</span>
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────
  if (error || !alert) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="text-red-500 text-[13px] font-medium">
          ⚠ {error || 'Alert not found'}
        </div>
        <Button onClick={() => navigate('/alerts')}>← Back to Alerts Queue</Button>
      </div>
    )
  }

  // ── Role restriction banner ────────────────────────────────
  // Shown when logged-in role doesn't match the alert's assigned role
  const showRoleBanner = !canAction && role !== null

  return (
    <div>
      {/* Back */}
      <button
        className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-700 mb-4 transition-colors"
        onClick={() => navigate('/alerts')}
      >
        <ChevronLeft size={13} />
        Alerts Queue
      </button>

      {/* ── Role restriction banner ── */}
      {showRoleBanner && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
          <span className="text-amber-500 text-[15px] shrink-0 mt-0.5">⚑</span>
          <div>
            <div className="text-[12px] font-semibold text-amber-800">
              Read-only view — action restricted
            </div>
            <div className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
              This alert is assigned to{' '}
              <strong>{roleLabel(alert.assignedRole)}</strong>.
              You are logged in as <strong>{roleLabel(role!)}</strong>.
              Only the assigned role can update the investigation status.
              You can still view all details, recommendations, and add notes.
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start gap-2.5 mb-5 pb-4 border-b border-gray-200">
        <div>
          <div className="text-[16px] font-bold font-mono text-gray-900">
            {alert.sampleId}
          </div>
          <div className="text-[10px] font-mono text-gray-400 mt-0.5">
            SIEM Event: {alert.siemEventId ?? '—'} · {alert.sourceSiem} · {fmtTs(alert.timestamp)}
          </div>
        </div>

        <StatusBadge status={alert.status} />
        <ConfBadge value={alert.confidence} />
        <DeferBadge value={alert.deferToHuman} />
        <InvStatusBadge status={alert.investigationStatus} />

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap ml-auto">

          {/* Open */}
          <div className="relative group">
            <Button
              size="sm"
              disabled={
                !!actionLoading ||
                !canAction ||
                alert.investigationStatus === 'open'
              }
              onClick={() => void handleAction('open', 'Open')}
            >
              {actionLoading === 'Open' ? 'Updating…' : 'Open'}
            </Button>
            {!canAction && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 text-white text-[10px] rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                Assigned to {roleLabel(alert.assignedRole)}
              </div>
            )}
          </div>

          {/* Investigate */}
          <div className="relative group">
            <Button
              size="sm"
              disabled={
                !!actionLoading ||
                !canAction ||
                alert.investigationStatus === 'investigating'
              }
              onClick={() => void handleAction('investigating', 'Investigate')}
            >
              {actionLoading === 'Investigate' ? 'Updating…' : 'Investigate'}
            </Button>
            {!canAction && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 text-white text-[10px] rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                Assigned to {roleLabel(alert.assignedRole)}
              </div>
            )}
          </div>

          {/* Escalate */}
          <div className="relative group">
            <Button
              variant="amber"
              size="sm"
              disabled={
                !!actionLoading ||
                !canAction ||
                alert.investigationStatus === 'escalated'
              }
              onClick={() => void handleAction('escalated', 'Escalate')}
            >
              {actionLoading === 'Escalate' ? 'Updating…' : 'Escalate'}
            </Button>
            {!canAction && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 text-white text-[10px] rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                Assigned to {roleLabel(alert.assignedRole)}
              </div>
            )}
          </div>

          {/* Send to Human Review — only if deferToHuman is true */}
          {alert.deferToHuman && (
            <div className="relative group">
              <Button
                variant="violet"
                size="sm"
                disabled={!!actionLoading || !canAction}
                onClick={() => void handleAction('escalated', 'Human Review')}
              >
                {actionLoading === 'Human Review' ? 'Updating…' : 'Send to Human Review'}
              </Button>
              {!canAction && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 text-white text-[10px] rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  Assigned to {roleLabel(alert.assignedRole)}
                </div>
              )}
            </div>
          )}

          {/* Close Alert */}
          <div className="relative group">
            <Button
              variant="danger"
              size="sm"
              disabled={
                !!actionLoading ||
                !canAction ||
                alert.investigationStatus === 'closed'
              }
              onClick={() => void handleAction('closed', 'Close')}
            >
              {actionLoading === 'Close' ? 'Closing…' : 'Close Alert'}
            </Button>
            {!canAction && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 text-white text-[10px] rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                Assigned to {roleLabel(alert.assignedRole)}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* API error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 mb-4">
          <span className="text-red-500 text-[12px]">⚠</span>
          <span className="text-[12px] text-red-600">{error}</span>
        </div>
      )}

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-[1fr_290px] gap-4 items-start max-lg:grid-cols-1">

        {/* LEFT column */}
        <div className="flex flex-col gap-4">

          {/* Alert Summary */}
          <Card>
            <h3 className="text-[13px] font-semibold text-gray-900 mb-4">
              Alert Summary
            </h3>
            <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-2">
              {[
                { label: 'Sample ID',     value: <span className="font-mono text-[11px]">{alert.sampleId}</span> },
                { label: 'SIEM Event ID', value: <span className="font-mono text-[11px]">{alert.siemEventId ?? '—'}</span> },
                { label: 'Source SIEM',   value: alert.sourceSiem },
                { label: 'Timestamp',     value: fmtTs(alert.timestamp) },
                { label: 'Status',        value: <StatusBadge status={alert.status} /> },
                { label: 'Attack Type',   value: alert.attackType },
                { label: 'MITRE Technique', value: <span className="font-mono text-[11px]">{alert.mitreTechnique}</span> },
                { label: 'Assigned Role', value: <RoleBadge role={alert.assignedRole} /> },
                { label: 'Investigation Status', value: <InvStatusBadge status={alert.investigationStatus} /> },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">
                    {label}
                  </div>
                  <div className="text-[12px] font-semibold text-gray-900">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Role-Aware Recommendation */}
          <RecommendationPanel alert={alert} />

          {/* Raw Event / Log */}
          <Card>
            <h3 className="text-[13px] font-semibold text-gray-900 mb-2">
              Raw Event / Log
            </h3>
            <p className="text-[10px] text-gray-400 mb-3">
              Source: {alert.sourceSiem} · SIEM Event ID: {alert.siemEventId ?? '—'}
            </p>
            {alert.rawLog ? (
              <pre className="raw-log-block">{alert.rawLog}</pre>
            ) : (
              <div className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 text-[12px] text-gray-400">
                No raw log available.
              </div>
            )}
          </Card>

          {/* Notes — all roles can read and add notes */}
          <NotesPanel alert={alert} onNoteAdded={handleNoteAdded} />

        </div>

        {/* RIGHT column */}
        <div className="flex flex-col gap-4">
          <ModelOutputPanel alert={alert} />
          <AlertMetaPanel   alert={alert} />
        </div>

      </div>
    </div>
  )
}
