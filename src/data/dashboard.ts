import type { DashboardSummary } from '../types'
import { mockAlerts } from './alerts'

export const mockDashboard: DashboardSummary = {
  totalAlertsProcessed: 2091,
  predictedAttacks: mockAlerts.filter((a) => a.status === 'ATTACK').length,
  humanReviewAlerts: mockAlerts.filter((a) => a.deferToHuman).length,
  connectedSources: 2,
  openEscalations: mockAlerts.filter((a) => a.investigationStatus === 'escalated').length,
  recentAlerts: mockAlerts.slice(0, 5),
}
