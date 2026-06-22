import { useMemo, useState } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import { Target, TrendingUp, Users, DollarSign, Clock } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const BRAND_COLOR = '#5B2D8E';
const TARGET_COLOR = '#10B981';

export default function CohortComparison() {
  const { cohorts, nurses, placements } = useAppContext();
  const [selectedCohortId, setSelectedCohortId] = useState(cohorts[0]?.id || '');

  const selectedCohort = useMemo(
    () => cohorts.find((c) => c.id === selectedCohortId) || cohorts[0],
    [cohorts, selectedCohortId]
  );

  const metrics = useMemo(() => {
    if (!selectedCohort) return null;

    // Get nurses in this cohort
    const cohortNurses = nurses.filter(
      (n) => n.cohortAssigned === 'Cohort 1' || n.cohortAssigned === selectedCohort.name
    );
    const totalInCohort = cohortNurses.length || 1;

    // OET pass rate
    const oetPassed = cohortNurses.filter((n) => n.oetStatus === 'Passed').length;
    const oetPassRate = Math.round((oetPassed / totalInCohort) * 100);

    // Placement rate
    const placedNurses = cohortNurses.filter((n) => n.pipelineStage === 'Placed').length;
    const placementRate = Math.round((placedNurses / totalInCohort) * 100);

    // Average final score
    const scoresArr = cohortNurses.filter((n) => n.finalScore > 0).map((n) => n.finalScore);
    const avgScore = scoresArr.length > 0
      ? Math.round(scoresArr.reduce((a, b) => a + b, 0) / scoresArr.length)
      : 0;

    // Budget efficiency (cost per successful placement)
    const totalBudget = selectedCohort.budget?.totalBudget || 0;
    const costPerPlacement = placedNurses > 0
      ? Math.round(totalBudget / placedNurses)
      : totalBudget;
    // Normalize: lower cost = better, express as % of ideal (budget / targetNurses)
    const idealCost = totalBudget / (selectedCohort.targetNurses || 10);
    const budgetEfficiency = costPerPlacement > 0
      ? Math.min(100, Math.round((idealCost / costPerPlacement) * 100))
      : 0;

    // Timeline adherence (simplified: % of training period completed vs plan)
    const trainingStart = selectedCohort.trainingStart
      ? new Date(selectedCohort.trainingStart)
      : null;
    const trainingEnd = selectedCohort.trainingEnd
      ? new Date(selectedCohort.trainingEnd)
      : null;
    let timelineAdherence = 75; // default
    if (trainingStart && trainingEnd) {
      const now = new Date();
      const totalDuration = trainingEnd - trainingStart;
      const elapsed = now - trainingStart;
      const progressPct = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
      // If on track, adherence is high
      timelineAdherence = Math.min(100, progressPct > 0 ? Math.round(75 + progressPct * 0.2) : 50);
    }

    // Targets from cohort outcomes
    const oetTarget = selectedCohort.outcomes?.oetPassRateTarget || 80;
    const placementTarget = selectedCohort.outcomes?.placementRateTarget || 70;

    return {
      oetPassRate,
      placementRate,
      avgScore,
      budgetEfficiency,
      timelineAdherence,
      oetTarget,
      placementTarget,
      totalInCohort,
      oetPassed,
      placedNurses,
      totalBudget,
      costPerPlacement,
    };
  }, [selectedCohort, nurses, placements]);

  const radarData = useMemo(() => {
    if (!metrics) return [];
    return [
      { dimension: 'OET Pass Rate', actual: metrics.oetPassRate, target: metrics.oetTarget },
      { dimension: 'Placement Rate', actual: metrics.placementRate, target: metrics.placementTarget },
      { dimension: 'Avg Score', actual: metrics.avgScore, target: 75 },
      { dimension: 'Budget Efficiency', actual: metrics.budgetEfficiency, target: 80 },
      { dimension: 'Timeline', actual: metrics.timelineAdherence, target: 85 },
    ];
  }, [metrics]);

  const barData = useMemo(() => {
    if (!metrics) return [];
    return [
      { metric: 'OET Pass Rate (%)', actual: metrics.oetPassRate, target: metrics.oetTarget },
      { metric: 'Placement Rate (%)', actual: metrics.placementRate, target: metrics.placementTarget },
      { metric: 'Avg Score', actual: metrics.avgScore, target: 75 },
      { metric: 'Budget Eff. (%)', actual: metrics.budgetEfficiency, target: 80 },
      { metric: 'Timeline Adh. (%)', actual: metrics.timelineAdherence, target: 85 },
    ];
  }, [metrics]);

  if (!selectedCohort || !metrics) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
        No cohort data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cohort Selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Cohort Comparison</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Performance metrics vs targets
            </p>
          </div>
          <select
            value={selectedCohortId}
            onChange={(e) => setSelectedCohortId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
          >
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <KpiCard
          icon={Target}
          label="OET Pass Rate"
          value={`${metrics.oetPassRate}%`}
          target={`Target: ${metrics.oetTarget}%`}
          isAboveTarget={metrics.oetPassRate >= metrics.oetTarget}
        />
        <KpiCard
          icon={Users}
          label="Placement Rate"
          value={`${metrics.placementRate}%`}
          target={`Target: ${metrics.placementTarget}%`}
          isAboveTarget={metrics.placementRate >= metrics.placementTarget}
        />
        <KpiCard
          icon={TrendingUp}
          label="Avg Score"
          value={`${metrics.avgScore}`}
          target="Target: 75"
          isAboveTarget={metrics.avgScore >= 75}
        />
        <KpiCard
          icon={DollarSign}
          label="Cost/Placement"
          value={`R${metrics.costPerPlacement.toLocaleString()}`}
          target={`Budget: R${metrics.totalBudget.toLocaleString()}`}
          isAboveTarget={metrics.budgetEfficiency >= 80}
        />
        <KpiCard
          icon={Clock}
          label="Timeline"
          value={`${metrics.timelineAdherence}%`}
          target="Target: 85%"
          isAboveTarget={metrics.timelineAdherence >= 85}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Multi-Dimension Performance
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar
                name="Actual"
                dataKey="actual"
                stroke={BRAND_COLOR}
                fill={BRAND_COLOR}
                fillOpacity={0.25}
                strokeWidth={2}
              />
              <Radar
                name="Target"
                dataKey="target"
                stroke={TARGET_COLOR}
                fill={TARGET_COLOR}
                fillOpacity={0.1}
                strokeWidth={2}
                strokeDasharray="5 5"
              />
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Actual vs Target Comparison
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="metric" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="actual" name="Actual" fill={BRAND_COLOR} radius={[4, 4, 0, 0]} />
              <Bar dataKey="target" name="Target" fill={TARGET_COLOR} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detail Table */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Cohort Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Metric</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Actual</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Target</th>
                <th className="text-right py-2 px-3 text-gray-500 font-medium">Variance</th>
              </tr>
            </thead>
            <tbody>
              {barData.map((row, idx) => {
                const variance = row.actual - row.target;
                return (
                  <tr key={row.metric} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="py-2 px-3 text-gray-900">{row.metric}</td>
                    <td className="py-2 px-3 text-right font-medium">{row.actual}</td>
                    <td className="py-2 px-3 text-right text-gray-500">{row.target}</td>
                    <td className={`py-2 px-3 text-right font-medium ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {variance >= 0 ? '+' : ''}{variance}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, target, isAboveTarget }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isAboveTarget ? 'bg-green-50' : 'bg-amber-50'}`}>
          <Icon size={16} className={isAboveTarget ? 'text-green-600' : 'text-amber-600'} />
        </div>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className={`text-xs mt-1 ${isAboveTarget ? 'text-green-600' : 'text-amber-600'}`}>
        {target}
      </p>
    </div>
  );
}
