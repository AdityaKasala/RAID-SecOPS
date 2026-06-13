import { cn } from '../../lib/utils'

interface Stage {
  n: number
  name: string
  detail: string
  tag?: string
}

const STAGES: Stage[] = [
  { n: 1, name: 'Alert Ingestion', detail: 'Polling every 30 s · 2 active SIEM sources' },
  { n: 2, name: 'Preprocessing', detail: 'Feature extraction · normalisation · one-hot encoding', tag: 'Template-based' },
  { n: 3, name: 'Isolation Forest — Anomaly Detection', detail: '', tag: 'Model' },
  { n: 4, name: 'Random Forest — Attack Classification', detail: '', tag: 'Model' },
  { n: 5, name: 'Role-Aware Recommendation Layer', detail: 'Template/rule-based role output · SOC Analyst / Sec. Eng. / CISO', tag: 'Rule-based' },
]

export function PipelineStages({
  isoParams,
  rfParams,
}: {
  isoParams: string
  rfParams: string
}) {
  const stages = STAGES.map((s) => ({
    ...s,
    detail:
      s.n === 3 ? isoParams : s.n === 4 ? rfParams : s.detail,
  }))

  return (
    <div className="space-y-0">
      {stages.map((stage, i) => (
        <div key={stage.n} className="flex items-start gap-3">
          {/* Spine */}
          <div className="flex flex-col items-center shrink-0">
            <div className="w-6 h-6 rounded-full bg-green-50 border border-green-200 text-green-700 text-[10px] font-bold flex items-center justify-center">
              {stage.n}
            </div>
            {i < stages.length - 1 && (
              <div className="w-px flex-1 bg-gray-200 min-h-[20px] mt-0.5" />
            )}
          </div>

          {/* Body */}
          <div className={cn('flex-1', i < stages.length - 1 ? 'pb-5' : '')}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[12px] font-semibold text-gray-900">{stage.name}</span>
              <div className="flex items-center gap-2">
                {stage.tag && (
                  <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5 font-medium">
                    {stage.tag}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Active
                </span>
              </div>
            </div>
            <p className="text-[11px] text-gray-400">{stage.detail}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
