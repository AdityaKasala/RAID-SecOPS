import type { PipelineStatus } from '../types'

export const mockPipeline: PipelineStatus = {
  splunkConnected: true,
  sentinelConnected: true,
  lastIngestionTime: '2026-03-18T09:40:01Z',
  totalAlertsReceived: 2091,
  preprocessingStatus: 'healthy',
  isolationForestStatus: 'loaded',
  randomForestStatus: 'loaded',
  pipelineHealth: 'healthy',
  isoParams: 'contamination=0.1 · 100 estimators · max_samples=256',
  rfParams: '200 estimators · max_depth=12 · class_weight=balanced',
}
