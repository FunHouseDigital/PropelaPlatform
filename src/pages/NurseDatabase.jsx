import { Users } from 'lucide-react';

export default function NurseDatabase() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Users size={24} className="text-propela-purple" />
        <h1 className="text-2xl font-semibold text-gray-900">Nurse Database</h1>
      </div>
      <p className="text-gray-500 text-sm mb-8">
        Master record for every nurse Propela has ever engaged. Gallery, pipeline kanban, and cohort views.
      </p>
      <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
        <Users size={48} className="text-propela-purple/30 mx-auto mb-4" />
        <p className="text-gray-400 text-sm">
          Nurse gallery view coming soon. 67 nurses seeded and ready.
        </p>
      </div>
    </div>
  );
}
