import { clsx, type ClassValue } from 'clsx'
import type { UserRole, AlertStatus, InvestigationStatus } from '../types'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function fmtTs(iso: string): string {
  const d = new Date(iso)
  return (
    d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
    ' ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  )
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

export const ROLE_LABELS: Record<UserRole, string> = {
  analyst: 'SOC Analyst',
  engineer: 'Security Engineer',
  grc: 'CISO / GRC',
}

export function roleLabel(r: UserRole): string {
  return ROLE_LABELS[r] ?? r
}

export function confColorClass(v: number): string {
  const p = Math.round(v * 100)
  if (p >= 90) return 'bg-red-50 text-red-700 border-red-200'
  if (p >= 75) return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-blue-50 text-blue-700 border-blue-200'
}

export function confBarColor(v: number): string {
  const p = Math.round(v * 100)
  if (p >= 90) return '#dc2626'
  if (p >= 75) return '#d97706'
  return '#2563eb'
}

export const STATUS_STYLES: Record<AlertStatus, string> = {
  ATTACK: 'bg-red-50 text-red-700 border-red-200',
  NORMAL: 'bg-green-50 text-green-700 border-green-200',
}

export const INV_STATUS_STYLES: Record<InvestigationStatus, string> = {
  new: 'bg-slate-100 text-slate-600 border-slate-200',
  under_investigation: 'bg-blue-50 text-blue-700 border-blue-200',
  escalated: 'bg-violet-50 text-violet-700 border-violet-200',
  closed: 'bg-green-50 text-green-700 border-green-200',
}

export const INV_STATUS_LABELS: Record<InvestigationStatus, string> = {
  new: 'New',
  under_investigation: 'Investigating',
  escalated: 'Escalated',
  closed: 'Closed',
}
