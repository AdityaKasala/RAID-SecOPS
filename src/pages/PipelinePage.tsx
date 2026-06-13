import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { fetchPipelineStatus } from '../lib/api'
import type { PipelineStatusData } from '../lib/api'
import { fmtTs } from '../lib/utils'
import { Card } from '../components/shared/Card'
import { HealthBadge } from '../components/shared/StatusBadge'
import { PipelineStages } from '../components/pipeline/PipelineStages'
import { usePageTitle } from '../lib/usePageTitle'

export default function PipelinePage() {
  const { role } = useApp()
  usePageTitle('Pipeline Status')
  const isEngineer = role === 'engineer'

  const [data,    setData]    = useState<PipelineStatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  const load = () => {
    setLoading(true)
    setError('')
    fetchPipelineStatus()
      .then((d) => { setData(d); setLoading(false) })
      .catch((err: Error) => { setError(err.message); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3">
        <svg className="animate-spin w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <span className="text-[13px] text-gray-400">Loading pipeline status…</span>
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="text-red-500 text-[13px] font-medium">⚠ Failed to load pipeline status</div>
        <div className="text-gray-400 text-[12px]">{error}</div>
        <button className="text-[12px] text-blue-500 hover:underline" onClick={load}>
          Retry
        </button>
      </div>
    )
  }

  // ── Health banner styles ───────────────────────────────────
  const healthStyles: Record<string, { banner: string; dotColor: string; textColor: string; label: string }> = {
    healthy:  { banner: 'bg-green-50 border border-green-200', dotColor: 'bg-green-500',  textColor: 'text-green-700',  label: 'All Systems Operational' },
    degraded: { banner: 'bg-amber-50 border border-amber-200', dotColor: 'bg-amber-500',  textColor: 'text-amber-700',  label: 'Pipeline Degraded' },
    down:     { banner: 'bg-red-50   border border-red-200',   dotColor: 'bg-red-500',    textColor: 'text-red-700',    label: 'Pipeline Down' },
  }
  const hs = healthStyles[data.pipelineHealth] ?? healthStyles.healthy

  return (
    <div>
      {/* Page header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-[16px] font-bold text-gray-900">
            Pipeline / Integration Status
          </h1>
          <p className="text-[12px] text-gray-400 mt-0.5">
            Live SIEM connections, model status, and pipeline health
          </p>
        </div>
        {/* Refresh button */}
        <button
          onClick={load}
          className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] text-gray-500 bg-white hover:bg-gray-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4v5h5M20 20v-5h-5" />
            <path d="M4 9a9 9 0 0115.5-4.5M20 15a9 9 0 01-15.5 4.5" />
          </svg>
          Refresh
        </button>
      </div>

      <div className="max-w-[760px] flex flex-col gap-4">

        {/* ── Health banner ── */}
        <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${hs.banner}`}>
          <span className={`w-2.5 h-2.5 rounded-full live-dot ${hs.dotColor}`} />
          <span className={`text-[13px] font-semibold ${hs.textColor}`}>
            {hs.label}
          </span>
          <span className="ml-auto text-[10px] text-gray-400">
            Last updated: {fmtTs(data.lastUpdated)}
          </span>
        </div>

        {/* ── SIEM Connections ── */}
        <Card>
          <h3 className="text-[13px] font-semibold text-gray-900 mb-4">
            SIEM Connections
          </h3>
          <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            {[
              { name: 'Splunk',               info: data.splunk },
              { name: 'Microsoft Sentinel',   info: data.sentinel },
            ].map((siem) => (
              <div
                key={siem.name}
                className="border border-gray-200 rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[13px] font-semibold text-gray-900">
                    {siem.name}
                  </span>
                  {siem.info.connected ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 live-dot" />
                      Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      Disconnected
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-0.5">
                      Last Ingestion Time
                    </div>
                    <div className="text-[12px] font-semibold text-gray-900">
                      {siem.info.lastIngestionTime === 'No data yet'
                        ? 'No data yet'
                        : fmtTs(siem.info.lastIngestionTime)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-0.5">
                      Total Alerts Received
                    </div>
                    <div className="text-[12px] font-semibold text-gray-900">
                      {siem.info.totalAlertsReceived.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Model & Processing Status ── */}
        <Card>
          <h3 className="text-[13px] font-semibold text-gray-900 mb-4">
            Model & Processing Status
          </h3>
          <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-2">
            <div>
              <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">
                Preprocessing Status
              </div>
              <HealthBadge status={data.preprocessingStatus} />
            </div>
            <div>
              <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">
                Isolation Forest Status
              </div>
              <HealthBadge status={data.isolationForestStatus} />
            </div>
            <div>
              <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">
                Random Forest Status
              </div>
              <HealthBadge status={data.randomForestStatus} />
            </div>
          </div>

          {/* Total alerts in DB */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-0.5">
                Total Alerts in Database
              </div>
              <div className="text-[13px] font-bold text-gray-900">
                {data.totalAlertsInDb.toLocaleString()}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 live-dot" />
              Live count from PostgreSQL
            </div>
          </div>

          {/* Engineer-only: model params */}
          {isEngineer && (
            <>
              <div className="border-t border-gray-100 mt-4 pt-4" />
              <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                <div>
                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">
                    Isolation Forest Params
                  </div>
                  <div className="font-mono text-[10px] font-medium text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                    {data.isoParams}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">
                    Random Forest Params
                  </div>
                  <div className="font-mono text-[10px] font-medium text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                    {data.rfParams}
                  </div>
                </div>
              </div>
            </>
          )}
        </Card>

        {/* ── Pipeline Stages ── */}
        <Card>
          <h3 className="text-[13px] font-semibold text-gray-900 mb-5">
            Pipeline Stages
          </h3>
          <PipelineStages
            isoParams={data.isoParams}
            rfParams={data.rfParams}
          />
        </Card>

      </div>
    </div>
  )
}
