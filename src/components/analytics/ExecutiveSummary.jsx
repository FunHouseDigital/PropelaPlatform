import { useMemo, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { TrendingUp, Users, Clock, DollarSign, Target, Activity, Filter } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { PIPELINE_STAGES_ORDER, EXIT_STATES } from '../../lib/constants';

const DATE_RANGES = [
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
  { label: 'Last 6 months', value: 180 },
  { label: 'All Time', value: null },
];

const FUNNEL_COLORS = ['#5B2D8E', '#7C3AED', '#8B5CF6', '#A78BFA', '#10B981'];

function StatCard({ icon: Icon, label, value, subtext, color, bgColor, sparkData }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center`}>
          <Icon size={20} className={color} />
        </div>
        <div className="flex-1">
          <p className="text-xs text-gray-500">{label}</p>
          <p className={`text-xl font-bold ${color}`}>{value}</p>
          {subtext && <p className="text-xs text-gray-400 mt-0.5">{subtext}</p>}
        </div>
      </div>
      {sparkData && sparkData.length > 0 && (
        <div className="mt-3">
          <div className="h-10">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData}>
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke="#5B2D8E"
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-gray-400 italic mt-0.5">Illustrative</p>
        </div>
      )}
    </div>
  );
}

export default function ExecutiveSummary() {
  const { nurses, cohorts, placements } = useAppContext();
  const [dateRange, setDateRange] = useState(null); // null = All Time

  // Filter nurses by submittedAt date range
  const filteredNurses = useMemo(() => {
    if (!dateRange) return nurses;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - dateRange);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return nurses.filter((n) => n.submittedAt >= cutoffStr);
  }, [nurses, dateRange]);

  // Filter placements by stageHistory dates
  const filteredPlacements = useMemo(() => {
    if (!dateRange) return placements;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - dateRange);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return placements.filter((p) => {
      if (p.stageHistory && p.stageHistory.length > 0) {
        return p.stageHistory[0].enteredAt >= cutoffStr;
      }
      return true;
    });
  }, [placements, dateRange]);

  // KPI computations
  const kpis = useMemo(() => {
    const inPipeline = filteredNurses.filter((n) => !EXIT_STATES.includes(n.pipelineStage));
    const totalInPipeline = inPipeline.length;

    // Conversion funnel counts
    const applied = filteredNurses.filter((n) =>
      PIPELINE_STAGES_ORDER.indexOf(n.pipelineStage) >= 0
    ).length;
    const shortlisted = filteredNurses.filter((n) =>
      PIPELINE_STAGES_ORDER.indexOf(n.pipelineStage) >= PIPELINE_STAGES_ORDER.indexOf('Shortlisted - Yes')
    ).length;
    const selectedForCohort = filteredNurses.filter((n) => {
      const idx = PIPELINE_STAGES_ORDER.indexOf(n.pipelineStage);
      return idx >= PIPELINE_STAGES_ORDER.indexOf('Selected for Cohort');
    }).length;
    const oetPassed = filteredNurses.filter((n) => {
      const idx = PIPELINE_STAGES_ORDER.indexOf(n.pipelineStage);
      return idx >= PIPELINE_STAGES_ORDER.indexOf('OET Passed') && n.pipelineStage !== 'OET Failed';
    }).length;
    const placed = filteredNurses.filter((n) => n.pipelineStage === 'Placed').length;

    // Revenue
    const revenue = placed * 5000;
    const revenueTarget = totalInPipeline * 5000;

    // Cohort health score
    const cohort = cohorts[0];
    const oetPassRate = cohort ? cohort.outcomes.oetPassRateTarget : 80;
    const placementRate = cohort ? cohort.outcomes.placementRateTarget : 70;
    const budgetEfficiency = cohort
      ? Math.round(
          ((cohort.budget.totalBudget - cohort.budget.trainingCostActual - cohort.budget.oetExamCostActual - cohort.budget.otherCosts) /
            cohort.budget.totalBudget) *
            100
        )
      : 50;
    const healthScore = Math.round((oetPassRate + placementRate + budgetEfficiency) / 3);

    // Time-to-placement average (from placement stageHistory)
    let avgTimeToPlacement = 0;
    const placedPlacements = filteredPlacements.filter(
      (p) => p.currentStage === 'Placed' || p.currentStage === 'Settled'
    );
    if (placedPlacements.length > 0) {
      const totalDays = placedPlacements.reduce((sum, p) => {
        if (p.stageHistory && p.stageHistory.length >= 2) {
          const first = new Date(p.stageHistory[0].enteredAt);
          const last = new Date(p.stageHistory[p.stageHistory.length - 1].enteredAt);
          return sum + Math.abs(Math.round((last - first) / (1000 * 60 * 60 * 24)));
        }
        return sum + p.daysInStage;
      }, 0);
      avgTimeToPlacement = Math.round(totalDays / placedPlacements.length);
    }

    // Conversion rate
    const conversionRate = applied > 0 ? Math.round((placed / applied) * 100) : 0;

    return {
      totalInPipeline,
      conversionRate,
      revenue,
      revenueTarget,
      healthScore,
      avgTimeToPlacement,
      funnel: { applied, shortlisted, selectedForCohort, oetPassed, placed },
    };
  }, [filteredNurses, filteredPlacements, cohorts]);

  // Sparkline data (simulated trend over 6 data points)
  const sparklines = useMemo(() => {
    const pipelineSpark = [
      { v: Math.round(kpis.totalInPipeline * 0.6) },
      { v: Math.round(kpis.totalInPipeline * 0.7) },
      { v: Math.round(kpis.totalInPipeline * 0.75) },
      { v: Math.round(kpis.totalInPipeline * 0.85) },
      { v: Math.round(kpis.totalInPipeline * 0.92) },
      { v: kpis.totalInPipeline },
    ];
    const conversionSpark = [
      { v: Math.max(0, kpis.conversionRate - 3) },
      { v: Math.max(0, kpis.conversionRate - 2) },
      { v: Math.max(0, kpis.conversionRate - 1) },
      { v: kpis.conversionRate },
      { v: kpis.conversionRate },
      { v: kpis.conversionRate },
    ];
    const revenueSpark = [
      { v: Math.round(kpis.revenue * 0.2) },
      { v: Math.round(kpis.revenue * 0.4) },
      { v: Math.round(kpis.revenue * 0.55) },
      { v: Math.round(kpis.revenue * 0.7) },
      { v: Math.round(kpis.revenue * 0.85) },
      { v: kpis.revenue },
    ];
    const timeSpark = [
      { v: kpis.avgTimeToPlacement + 10 },
      { v: kpis.avgTimeToPlacement + 7 },
      { v: kpis.avgTimeToPlacement + 5 },
      { v: kpis.avgTimeToPlacement + 3 },
      { v: kpis.avgTimeToPlacement + 1 },
      { v: kpis.avgTimeToPlacement },
    ];
    return { pipelineSpark, conversionSpark, revenueSpark, timeSpark };
  }, [kpis]);

  // Funnel chart data
  const funnelData = useMemo(() => [
    { stage: 'Applied', count: kpis.funnel.applied },
    { stage: 'Shortlisted', count: kpis.funnel.shortlisted },
    { stage: 'Selected', count: kpis.funnel.selectedForCohort },
    { stage: 'OET Passed', count: kpis.funnel.oetPassed },
    { stage: 'Placed', count: kpis.funnel.placed },
  ], [kpis.funnel]);

  return (
    <div className="space-y-6">
      {/* Header with Date Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Executive Summary</h2>
          <p className="text-sm text-gray-500">High-level KPIs and performance overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <select
            value={dateRange === null ? '' : dateRange}
            onChange={(e) => setDateRange(e.target.value === '' ? null : Number(e.target.value))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
          >
            {DATE_RANGES.map((r) => (
              <option key={r.label} value={r.value === null ? '' : r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Nurses in Pipeline"
          value={kpis.totalInPipeline}
          subtext="Active candidates"
          color="text-[#5B2D8E]"
          bgColor="bg-[#5B2D8E]/5"
          sparkData={sparklines.pipelineSpark}
        />
        <StatCard
          icon={TrendingUp}
          label="Conversion Rate"
          value={`${kpis.conversionRate}%`}
          subtext="Applied to Placed"
          color="text-green-600"
          bgColor="bg-green-50"
          sparkData={sparklines.conversionSpark}
        />
        <StatCard
          icon={DollarSign}
          label="Revenue (GBP)"
          value={`${kpis.revenue.toLocaleString()}`}
          subtext={`Target: ${kpis.revenueTarget.toLocaleString()}`}
          color="text-blue-600"
          bgColor="bg-blue-50"
          sparkData={sparklines.revenueSpark}
        />
        <StatCard
          icon={Clock}
          label="Avg Time to Placement"
          value={`${kpis.avgTimeToPlacement} days`}
          subtext="From first stage"
          color="text-amber-600"
          bgColor="bg-amber-50"
          sparkData={sparklines.timeSpark}
        />
      </div>

      {/* Second Row KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-[#5B2D8E]/5 flex items-center justify-center">
              <Target size={20} className="text-[#5B2D8E]" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Cohort Health Score</p>
              <p className="text-xl font-bold text-[#5B2D8E]">{kpis.healthScore}%</p>
            </div>
          </div>
          <div className="mt-2 flex gap-4 text-xs text-gray-500">
            <span>OET Pass Target: {cohorts[0]?.outcomes?.oetPassRateTarget || 80}%</span>
            <span>Placement Target: {cohorts[0]?.outcomes?.placementRateTarget || 70}%</span>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <Activity size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Funnel Summary</p>
              <p className="text-xl font-bold text-green-600">{kpis.funnel.placed} Placed</p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
            <span>Applied: {kpis.funnel.applied}</span>
            <span>Shortlisted: {kpis.funnel.shortlisted}</span>
            <span>Selected: {kpis.funnel.selectedForCohort}</span>
            <span>OET Passed: {kpis.funnel.oetPassed}</span>
          </div>
        </div>
      </div>

      {/* Conversion Funnel Visualization */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Conversion Funnel</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={funnelData} layout="vertical" barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis dataKey="stage" type="category" tick={{ fontSize: 12 }} width={90} />
            <Tooltip
              formatter={(value) => [value, 'Nurses']}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {funnelData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={FUNNEL_COLORS[index % FUNNEL_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
