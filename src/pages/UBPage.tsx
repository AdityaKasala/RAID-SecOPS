import { useApp } from '../context/AppContext'
import { UBChat } from '../components/ub/UBChat'
import { usePageTitle } from '../lib/usePageTitle'
import type { AlertDetail } from '../lib/api'

export default function UBPage() {
  usePageTitle('UB Assistant')
  const { selectedAlert } = useApp()
  const alert = selectedAlert as AlertDetail | null

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-[16px] font-bold text-gray-900">UB Assistant</h1>
        <p className="text-[12px] text-gray-400 mt-0.5">
          Decision support for alerts, MITRE mappings, and role-based recommendations
        </p>
      </div>
      <UBChat />
    </div>
  )
}
