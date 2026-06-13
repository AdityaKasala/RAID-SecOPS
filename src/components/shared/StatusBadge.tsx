import { Badge } from './Badge'
import type { AlertStatus, InvestigationStatus, UserRole } from '../../types'
import {
  STATUS_STYLES,
  INV_STATUS_STYLES,
  INV_STATUS_LABELS,
  confColorClass,
  pct,
  roleLabel,
  ROLE_LABELS,
} from '../../lib/utils'

export function StatusBadge({ status }: { status: AlertStatus }) {
  return (
    <Badge className={STATUS_STYLES[status]}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </Badge>
  )
}

export function ConfBadge({ value }: { value: number }) {
  return <Badge className={confColorClass(value)}>{pct(value)}</Badge>
}

export function DeferBadge({ value }: { value: boolean }) {
  return value ? (
    <Badge className="bg-amber-50 text-amber-700 border-amber-200">⚑ Human Review</Badge>
  ) : (
    <Badge className="bg-slate-100 text-slate-600 border-slate-200">Auto</Badge>
  )
}

export function InvStatusBadge({ status }: { status: InvestigationStatus }) {
  return (
    <Badge className={INV_STATUS_STYLES[status]}>{INV_STATUS_LABELS[status]}</Badge>
  )
}

export function RoleBadge({ role }: { role: UserRole }) {
  return (
    <Badge className="bg-slate-100 text-slate-600 border-slate-200">{ROLE_LABELS[role]}</Badge>
  )
}

export function ModelsAgreeBadge({ agree }: { agree: boolean }) {
  return agree ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-green-50 text-green-700 border border-green-200">
      ✓ Models Agree
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
      ⚠ Models Disagree
    </span>
  )
}

export function HealthBadge({
  status,
}: {
  status: 'healthy' | 'warning' | 'error' | 'loaded' | 'not_loaded'
}) {
  const map: Record<string, string> = {
    healthy: 'bg-green-50 text-green-700 border-green-200',
    loaded: 'bg-blue-50 text-blue-700 border-blue-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    error: 'bg-red-50 text-red-700 border-red-200',
    not_loaded: 'bg-red-50 text-red-700 border-red-200',
  }
  const lbl: Record<string, string> = {
    healthy: 'Healthy',
    loaded: 'Loaded',
    warning: 'Warning',
    error: 'Error',
    not_loaded: 'Not Loaded',
  }
  return (
    <Badge className={map[status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {lbl[status] ?? status}
    </Badge>
  )
}

export { roleLabel }
