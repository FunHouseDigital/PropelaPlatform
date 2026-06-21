import { GraduationCap, Target, DollarSign, Calendar } from 'lucide-react';

function StatusBar({ items, total }) {
  if (total === 0) return null;

  return (
    <div className="flex w-full h-5 rounded-md overflow-hidden">
      {items.map((item, i) =>
        item.count > 0 ? (
          <div
            key={i}
            className="flex items-center justify-center text-[10px] font-medium text-white"
            style={{
              width: `${(item.count / total) * 100}%`,
              backgroundColor: item.color,
            }}
            title={`${item.label}: ${item.count}`}
          >
            {item.count > 0 && item.count}
          </div>
        ) : null
      )}
    </div>
  );
}

export default function CohortPulse({ cohortNurses }) {
  const cohortName = 'Cohort 1';
  const cohortStatus = 'Training';
  const target = 10;
  const enrolled = cohortNurses.length;

  // OET status distribution
  const oetCounts = {
    'Not Started': 0,
    'Studying': 0,
    'Registered': 0,
    'Passed': 0,
    'Failed': 0,
  };
  cohortNurses.forEach((n) => {
    const status = n.oetStatus || 'Not Started';
    if (status in oetCounts) {
      oetCounts[status]++;
    } else {
      oetCounts['Not Started']++;
    }
  });

  const oetItems = [
    { label: 'Not Started', count: oetCounts['Not Started'], color: '#9CA3AF' },
    { label: 'Studying', count: oetCounts['Studying'], color: '#F59E0B' },
    { label: 'Registered', count: oetCounts['Registered'], color: '#3B82F6' },
    { label: 'Passed', count: oetCounts['Passed'], color: '#10B981' },
    { label: 'Failed', count: oetCounts['Failed'], color: '#EF4444' },
  ];

  // Commitment fee distribution
  const feeCounts = { Paid: 0, Pending: 0, Overdue: 0 };
  cohortNurses.forEach((n) => {
    const status = n.commitmentFeeStatus || 'Not Due';
    if (status === 'Paid') feeCounts.Paid++;
    else if (status === 'Overdue') feeCounts.Overdue++;
    else if (status === 'Invoiced' || status === 'Not Due') feeCounts.Pending++;
  });

  const feeItems = [
    { label: 'Paid', count: feeCounts.Paid, color: '#10B981' },
    { label: 'Pending', count: feeCounts.Pending, color: '#F59E0B' },
    { label: 'Overdue', count: feeCounts.Overdue, color: '#EF4444' },
  ];
  const feeTotal = feeCounts.Paid + feeCounts.Pending + feeCounts.Overdue;

  // Budget: simulated for now
  const budgetSpent = 45000;
  const budgetTotal = 120000;
  const budgetPercent = Math.round((budgetSpent / budgetTotal) * 100);

  // Next milestone
  const nextMilestone = 'OET Exam Window';
  const daysRemaining = 42;

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <GraduationCap size={16} className="text-[#5B2D8E]" />
          Cohort Pulse
        </h3>
        <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-[#5B2D8E]/10 text-[#5B2D8E]">
          {cohortStatus}
        </span>
      </div>

      <div className="space-y-4">
        {/* Enrolled vs target */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 flex items-center gap-1.5">
            <Target size={14} className="text-gray-400" />
            {cohortName}
          </span>
          <span className="text-sm font-semibold text-gray-800">
            {enrolled}/{target} enrolled
          </span>
        </div>

        {/* OET Status */}
        <div>
          <p className="text-xs text-gray-500 mb-1.5">OET Status</p>
          <StatusBar items={oetItems} total={enrolled} />
          <div className="flex flex-wrap gap-2 mt-1.5">
            {oetItems.map(
              (item) =>
                item.count > 0 && (
                  <span key={item.label} className="text-[10px] text-gray-500 flex items-center gap-1">
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ backgroundColor: item.color }}
                    />
                    {item.label}
                  </span>
                )
            )}
          </div>
        </div>

        {/* Commitment Fees */}
        <div>
          <p className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
            <DollarSign size={12} className="text-gray-400" />
            Commitment Fees
          </p>
          <StatusBar items={feeItems} total={feeTotal} />
          <div className="flex flex-wrap gap-2 mt-1.5">
            {feeItems.map(
              (item) =>
                item.count > 0 && (
                  <span key={item.label} className="text-[10px] text-gray-500 flex items-center gap-1">
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ backgroundColor: item.color }}
                    />
                    {item.label}
                  </span>
                )
            )}
          </div>
        </div>

        {/* Next milestone */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Calendar size={12} className="text-gray-400" />
            Next milestone
          </span>
          <span className="text-xs font-medium text-gray-700">
            {nextMilestone} ({daysRemaining}d)
          </span>
        </div>

        {/* Budget */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Budget</span>
            <span className="text-xs text-gray-600">
              R{(budgetSpent / 1000).toFixed(0)}k / R{(budgetTotal / 1000).toFixed(0)}k
            </span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-[#5B2D8E]"
              style={{ width: `${budgetPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
