export type UserRole = 'analyst' | 'engineer' | 'grc'

export type InvestigationStatus = 'new' | 'under_investigation' | 'escalated' | 'closed'

export type AlertStatus = 'ATTACK' | 'NORMAL'

export type SourceSiem = 'Splunk' | 'Sentinel' | 'Mock'

export interface ModelScores {
  isolationForestScore: number
  randomForestConfidence: number
  finalPrediction: AlertStatus
  modelsAgree: boolean
}

export interface RoleRecommendations {
  analyst: string
  engineer: string
  grc: string
}

export interface AlertNote {
  id: string
  author: string
  role: UserRole
  createdAt: string
  text: string
}

export interface AlertRecord {
  sampleId: string
  siemEventId?: string
  timestamp: string
  sourceSiem: SourceSiem
  status: AlertStatus
  confidence: number
  attackType: string
  mitreTechnique: string
  deferToHuman: boolean
  investigationStatus: InvestigationStatus
  assignedRole: UserRole
  assignedTo?: string
  modelScores: ModelScores
  recommendations: RoleRecommendations
  rawLog: string
  notes: AlertNote[]
}

export interface DashboardSummary {
  totalAlertsProcessed: number
  predictedAttacks: number
  humanReviewAlerts: number
  connectedSources: number
  openEscalations: number
  recentAlerts: AlertRecord[]
}

export interface PipelineStatus {
  splunkConnected: boolean
  sentinelConnected: boolean
  lastIngestionTime: string
  totalAlertsReceived: number
  preprocessingStatus: 'healthy' | 'warning' | 'error'
  isolationForestStatus: 'loaded' | 'not_loaded' | 'error'
  randomForestStatus: 'loaded' | 'not_loaded' | 'error'
  pipelineHealth: 'healthy' | 'degraded' | 'down'
  isoParams: string
  rfParams: string
}
