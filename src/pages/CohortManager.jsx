import { GraduationCap } from 'lucide-react';

export default function CohortManager() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <GraduationCap size={24} className="text-propela-purple" />
        <h1 className="text-2xl font-semibold text-gray-900">Cohort Manager</h1>
      </div>
      <p className="text-gray-500 text-sm mb-8">
        Track each cohort as a discrete delivery project, from planning through to final placement outcomes and documented learnings.
      </p>
      <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
        <GraduationCap size={48} className="text-propela-purple/30 mx-auto mb-4" />
        <p className="text-gray-400 text-sm">
          Cohort management coming soon.
        </p>
      </div>
    </div>
  );
}
