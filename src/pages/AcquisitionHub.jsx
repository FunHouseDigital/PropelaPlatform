import { Building2 } from 'lucide-react';

export default function AcquisitionHub() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Building2 size={24} className="text-propela-purple" />
        <h1 className="text-2xl font-semibold text-gray-900">Nurse Acquisition Hub</h1>
      </div>
      <p className="text-gray-500 text-sm mb-8">
        Track every channel through which Propela finds nurses. Four tracks: Organisations, Referral Network, Community Channels, and Events.
      </p>
      <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
        <Building2 size={48} className="text-propela-purple/30 mx-auto mb-4" />
        <p className="text-gray-400 text-sm">
          Acquisition hub coming soon. 108 health facilities seeded and ready.
        </p>
      </div>
    </div>
  );
}
