import { Mail } from 'lucide-react';

export default function OutreachLog() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Mail size={24} className="text-propela-purple" />
        <h1 className="text-2xl font-semibold text-gray-900">Outreach Log + Templates</h1>
      </div>
      <p className="text-gray-500 text-sm mb-8">
        Aggregated log across all acquisition tracks with a template library for common communications.
      </p>
      <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
        <Mail size={48} className="text-propela-purple/30 mx-auto mb-4" />
        <p className="text-gray-400 text-sm">
          Outreach log and template library coming soon.
        </p>
      </div>
    </div>
  );
}
