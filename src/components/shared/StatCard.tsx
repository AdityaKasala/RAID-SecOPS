interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  valueColor?: string
}

export function StatCard({ label, value, sub, valueColor }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{label}</div>
      <div
        className="text-3xl font-bold mt-1 leading-none"
        style={{ color: valueColor ?? '#111827' }}
      >
        {value}
      </div>
      {sub && <div className="text-[11px] text-gray-400 mt-1.5">{sub}</div>}
    </div>
  )
}
