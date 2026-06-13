/**
 * RAID-SecOps API Service
 * All calls to the FastAPI backend go through this file.
 * Swap API_BASE in .env when deploying to production.
 */

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

// ── Auth header helper ────────────────────────────────────────
function authHeaders(): HeadersInit {
  const token = sessionStorage.getItem('raid_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

// ── Generic fetch wrapper ─────────────────────────────────────
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...authHeaders(),
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? `API error ${res.status}`)
  }

  return res.json() as Promise<T>
}

// ════════════════════════════════════════════════════════════
// TYPES  (mirrors FastAPI response schemas)
// ════════════════════════════════════════════════════════════

export type AlertStatus        = 'ATTACK' | 'NORMAL'
export type InvestigationStatus = 'new' | 'under_investigation' | 'escalated' | 'closed'
export type UserRole           = 'analyst' | 'engineer' | 'grc'
export type SourceSiem         = 'Splunk' | 'Sentinel' | 'Mock'

export interface AlertRow {
  sampleId:            string
  siemEventId?:        string
  timestamp:           string
  sourceSiem:          SourceSiem
  status:              AlertStatus
  confidence:          number
  attackType:          string
  mitreTechnique:      string
  deferToHuman:        boolean
  investigationStatus: InvestigationStatus
  assignedRole:        UserRole
  assignedTo?:         string
  modelsAgree:         boolean
}

export interface ModelScores {
  isolationForestScore?:   number
  randomForestConfidence?: number
  finalPrediction?:        AlertStatus
  modelsAgree:             boolean
}

export interface Recommendations {
  analyst?:  string
  engineer?: string
  grc?:      string
}

export interface AlertNote {
  id:        number
  author:    string
  role:      UserRole
  text:      string
  createdAt: string
}

export interface AlertDetail extends AlertRow {
  modelScores:     ModelScores
  recommendations: Recommendations
  rawLog?:         string
  notes:           AlertNote[]
}

export interface DashboardSummary {
  totalAlertsProcessed: number
  predictedAttacks:     number
  humanReviewAlerts:    number
  connectedSources:     number
  openEscalations:      number
  recentAlerts:         AlertRow[]
}

// ════════════════════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════════════════════

export interface LoginPayload {
  username: string
  password: string
  role:     UserRole
}

export interface LoginResponse {
  access_token: string
  token_type:   string
  user: {
    id:        number
    username:  string
    role:      string
    full_name: string
    email?:    string
  }
}

export async function apiLogin(payload: LoginPayload): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// ════════════════════════════════════════════════════════════
// ALERTS
// ════════════════════════════════════════════════════════════

/** Dashboard summary — stat cards + recent alerts table */
export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  return apiFetch<DashboardSummary>('/alerts/summary')
}

/** Alerts Queue — all alerts with optional filters */
export async function fetchAlerts(params?: {
  status?:      string
  source_siem?: string
  defer?:       boolean
  search?:      string
}): Promise<AlertRow[]> {
  const qs = new URLSearchParams()
  if (params?.status)                        qs.set('status',      params.status)
  if (params?.source_siem)                   qs.set('source_siem', params.source_siem)
  if (params?.defer !== undefined)           qs.set('defer',       String(params.defer))
  if (params?.search)                        qs.set('search',      params.search)

  const query = qs.toString() ? `?${qs.toString()}` : ''
  return apiFetch<AlertRow[]>(`/alerts${query}`)
}

/** Alert Detail — single alert with notes and recommendations */
export async function fetchAlert(sampleId: string): Promise<AlertDetail> {
  return apiFetch<AlertDetail>(`/alerts/${sampleId}`)
}

/** Update investigation status */
export async function updateAlertStatus(
  sampleId: string,
  investigationStatus: InvestigationStatus
): Promise<AlertDetail> {
  return apiFetch<AlertDetail>(`/alerts/${sampleId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ investigationStatus }),
  })
}

/** Add a note to an alert */
export async function addAlertNote(
  sampleId: string,
  note: { author: string; role: UserRole; text: string }
): Promise<AlertNote> {
  return apiFetch<AlertNote>(`/alerts/${sampleId}/notes`, {
    method: 'POST',
    body: JSON.stringify(note),
  })
}

// ════════════════════════════════════════════════════════════
// PIPELINE
// ════════════════════════════════════════════════════════════

export interface SiemStatus {
  connected:           boolean
  lastIngestionTime:   string
  totalAlertsReceived: number
}

export interface PipelineStatusData {
  splunk:                  SiemStatus
  sentinel:                SiemStatus
  preprocessingStatus:     'healthy' | 'warning' | 'error'
  isolationForestStatus:   'loaded'  | 'not_loaded' | 'error'
  randomForestStatus:      'loaded'  | 'not_loaded' | 'error'
  pipelineHealth:          'healthy' | 'degraded' | 'down'
  isoParams:               string
  rfParams:                string
  totalAlertsInDb:         number
  lastUpdated:             string
}

/** Pipeline status — SIEM connections, model status, health */
export async function fetchPipelineStatus(): Promise<PipelineStatusData> {
  return apiFetch<PipelineStatusData>('/pipeline/status')
}
