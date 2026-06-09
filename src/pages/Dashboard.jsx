import { LayoutDashboard } from 'lucide-react'

export default function Dashboard() {
  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <LayoutDashboard className="w-7 h-7 text-purple" />
        <h1 className="text-2xl font-semibold text-dark">Dashboard</h1>
      </div>
      <div className="bg-white rounded-2xl border border-border p-12 text-center">
        <p className="text-grey text-lg">Dashboard overview coming soon</p>
      </div>
    </div>
  )
}
