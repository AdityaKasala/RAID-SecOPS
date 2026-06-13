import type { AlertDetail } from '../../lib/api'
import { pct, confBarColor } from '../../lib/utils'
import { StatusBadge, DeferBadge, ModelsAgreeBadge } from '../shared/StatusBadge'

export function ModelOutputPanel({ alert }: { alert: AlertDetail }) {
  const ms       = alert.modelScores
  const barColor = confBarColor(ms.randomForestConfidence ?? 0)
  const ifScore  = ms.isolationForestScore
  const ifAnomaly = ifScore !== null && ifScore !== undefined && ifScore < 0

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <h3 className="text-[13px] font-semibold text-gray-900 mb-4">
        ML Model Output
      </h3>

      {/* Isolation Forest Score */}
      <div className="py-2.5 border-b border-gray-100">
        <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
          Isolation Forest Score
        </div>
        {ifScore !== null && ifScore !== undefined ? (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[18px] font-bold font-mono text-gray-900">
              {ifScore.toFixed(3)}
            </span>
            <span className={`text-[10px] font-semibold ${ifAnomaly ? 'text-red-600' : 'text-green-600'}`}>
              {ifAnomaly ? '▲ Anomalous' : '✓ Normal'}
            </span>
          </div>
        ) : (
          <span className="text-[12px] text-gray-400 mt-1 block">—</span>
        )}
        <div className="text-[10px] text-gray-400 mt-1">
          {ifAnomaly
            ? 'Deviates from normal traffic baseline'
            : 'Within normal traffic baseline'}
        </div>
      </div>

      {/* Random Forest Confidence */}
      <div className="py-2.5 border-b border-gray-100">
        <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
          Random Forest Confidence
        </div>
        {ms.randomForestConfidence !== null && ms.randomForestConfidence !== undefined ? (
          <>
            <div className="text-[18px] font-bold font-mono text-gray-900 mt-1">
              {pct(ms.randomForestConfidence)}
            </div>
            <div className="conf-band mt-1.5">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.round(ms.randomForestConfidence * 100)}%`,
                  background: barColor,
                }}
              />
            </div>
            <div className="text-[10px] text-gray-400 mt-1">Confidence band</div>
          </>
        ) : (
          <span className="text-[12px] text-gray-400 mt-1 block">—</span>
        )}
      </div>

      {/* Final Prediction */}
      <div className="py-2.5 border-b border-gray-100">
        <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">
          Final Prediction
        </div>
        {ms.finalPrediction ? (
          <StatusBadge status={ms.finalPrediction} />
        ) : (
          <span className="text-[12px] text-gray-400">—</span>
        )}
      </div>

      {/* Models Agreement */}
      <div className="py-2.5 border-b border-gray-100">
        <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">
          Models Agreement
        </div>
        <ModelsAgreeBadge agree={ms.modelsAgree} />
        {!ms.modelsAgree && (
          <p className="text-[10px] text-amber-600 mt-1.5 leading-relaxed">
            IF and RF disagree — routed for human review
          </p>
        )}
      </div>

      {/* Defer to Human */}
      <div className="pt-2.5">
        <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">
          Defer to Human
        </div>
        <DeferBadge value={alert.deferToHuman} />
        {alert.deferToHuman && (
          <p className="text-[10px] text-amber-600 mt-1.5 leading-relaxed">
            Low confidence or model disagreement — human review required before action
          </p>
        )}
      </div>
    </div>
  )
}
