import React from 'react'
import type { AlertDetail } from '../../lib/api'
import { fmtTs } from '../../lib/utils'
import { DeferBadge, RoleBadge, InvStatusBadge } from '../shared/StatusBadge'

export function AlertMetaPanel({ alert }: { alert: AlertDetail }) {
  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label: 'MITRE Technique',
      value: (
        <span className="font-mono text-[10px] text-right leading-relaxed">
          {alert.mitreTechnique}
        </span>
      ),
    },
    { label: 'Source SIEM',  value: alert.sourceSiem },
    {
      label: 'SIEM Event ID',
      value: (
        <span className="font-mono text-[10px]">{alert.siemEventId ?? '—'}</span>
      ),
    },
    {
      label: 'Assigned To',
      value: (
        <span className="font-mono text-[11px]">{alert.assignedTo ?? '—'}</span>
      ),
    },
    { label: 'Assigned Role',   value: <RoleBadge role={alert.assignedRole} /> },
    { label: 'Defer to Human',  value: <DeferBadge value={alert.deferToHuman} /> },
    { label: 'Inv. Status',     value: <InvStatusBadge status={alert.investigationStatus} /> },
    {
      label: 'Timestamp',
      value: (
        <span className="text-[11px]">{fmtTs(alert.timestamp)}</span>
      ),
    },
  ]

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <h3 className="text-[13px] font-semibold text-gray-900 mb-3">
        Alert Metadata
      </h3>
      <div className="flex flex-col gap-2.5">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-start justify-between gap-2"
          >
            <span className="text-[11px] text-gray-400 shrink-0">{r.label}</span>
            <span className="text-[12px] font-medium text-gray-800 text-right">
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
