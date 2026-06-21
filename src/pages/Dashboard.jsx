import { LayoutDashboard } from 'lucide-react';

export default function Dashboard() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <LayoutDashboard size={24} className="text-propela-purple" />
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      </div>
      <p className="text-gray-500 text-sm mb-8">
        Your operational overview. Actions needed, cohort pulse, and acquisition follow-ups at a glance.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Actions Needed</p>
          <p className="text-3xl font-bold text-propela-purple mt-1">0</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Active Nurses</p>
          <p className="text-3xl font-bold text-propela-purple mt-1">67</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Cohort Status</p>
          <p className="text-3xl font-bold text-propela-purple mt-1">Active</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Hub Follow-ups</p>
          <p className="text-3xl font-bold text-propela-purple mt-1">0</p>
        </div>
      </div>
    </div>
  );
}
