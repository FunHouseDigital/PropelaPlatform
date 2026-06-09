import { Building2 } from 'lucide-react'

export default function AcquisitionHub() {
  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <Building2 className="w-7 h-7 text-purple" />
        <h1 className="text-2xl font-semibold text-dark">Acquisition Hub</h1>
      </div>
      <div className="bg-white rounded-2xl border border-border p-12 text-center">
        <p className="text-grey text-lg">Acquisition Hub coming soon</p>
      </div>
    </div>
  )
}
