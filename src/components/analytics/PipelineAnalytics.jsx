import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { AlertTriangle, Activity, TrendingDown } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { PIPELINE_STAGES_ORDER, EXIT_STATES } from '../../lib/constants';

const EXIT_STAGES = ['Not Selected', "Didn't Qualify", 'Deferred', 'Dropped Out', 'Recommended Pathway'];

// Thresholds for velocity status
const VELOCITY_THRESHOLDS = { green: 7, amber: 14 }; // days

function getVelocityStatus(avgDays) {
  if (avgDays <= VELOCITY_THRESHOLDS.green) return 'green';
  if (avgDays <= VELOCITY_THRESHOLDS.amber) return 'amber';
  return 'red';
}

function getStatusColor(status) {
  if (status === 'green') return 'bg-green-100 text-green-700';
  if (status === 'amber') return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

function getStatusLabel(status) {
  if (status === 'green') return 'On Track';
  if (status === 'amber') return 'Monitor';
  return 'Bottleneck';
}

const FUNNEL_GRADIENT = [
  '#5B2D8E', '#6D3FA0', '#7C3AED', '#8B5CF6', '#9B6DF7',
  '#A78BFA', '#B39DFB', '#C4B5FD', '#D8CCFE', '#E9E0FF',
  '#A78BFA', '#8B5CF6', '#7C3AED', '#5B2D8E', '#10B981',
];

export default function PipelineAnalytics() {
  const { nurses } = useAppContext();

  // Stage distribution: count nurses at each pipeline stage
  const stageDistribution = useMemo(() => {
    const counts = {};
    PIPELINE_STAGES_ORDER.forEach((stage) => { counts[stage] = 0; });
    nurses.forEach((n) => {
      if (PIPELINE_STAGES_ORDER.includes(n.pipelineStage)) {
        counts[n.pipelineStage]++;
      }
    });
    return PIPELINE_STAGES_ORDER.map((stage) => ({
      stage,
      shortLabel: stage.length > 16 ? stage.slice(0, 14) + '...' : stage,
      count: counts[stage],
    }));
  }, [nurses]);

  // Compute average days per stage using submittedAt and nextActionDueDate
  const stageVelocity = useMemo(() => {
    const stageData = {};
    PIPELINE_STAGES_ORDER.forEach((stage) => {
      stageData[stage] = { totalDays: 0, count: 0 };
    });

    nurses.forEach((n) => {
      if (!PIPELINE_STAGES_ORDER.includes(n.pipelineStage)) return;
      // Estimate days in current stage from submittedAt and nextActionDueDate
      if (n.submittedAt) {
        const submitted = new Date(n.submittedAt);
        const now = n.nextActionDueDate ? new Date(n.nextActionDueDate) : new Date();
        const stageIdx = PIPELINE_STAGES_ORDER.indexOf(n.pipelineStage);
        // Approximate days per stage by dividing total time by stages progressed
        const totalDays = Math.max(1, Math.round((now - submitted) / (1000 * 60 * 60 * 24)));
        const stagesProgressed = Math.max(1, stageIdx + 1);
        const avgPerStage = Math.round(totalDays / stagesProgressed);
        stageData[n.pipelineStage].totalDays += avgPerStage;
        stageData[n.pipelineStage].count++;
      }
    });

    return PIPELINE_STAGES_ORDER.map((stage) => {
      const data = stageData[stage];
      const avgDays = data.count > 0 ? Math.round(data.totalDays / data.count) : 0;
      const status = data.count > 0 ? getVelocityStatus(avgDays) : 'green';
      return {
        stage,
        count: stageDistribution.find((s) => s.stage === stage)?.count || 0,
        avgDays,
        status,
      };
    });
  }, [nurses, stageDistribution]);

  // Bottleneck detection: stages with highest count combined with longest duration
  const bottlenecks = useMemo(() => {
    return stageVelocity
      .filter((s) => s.count > 0)
      .map((s) => ({
        ...s,
        score: s.count * s.avgDays,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [stageVelocity]);

  // Drop-off analysis: nurses who exited at each approximate stage
  const dropOffData = useMemo(() => {
    // Map exit states to approximate stage where they exited
    const exitMapping = {
      'Not Selected': 'Under Review',
      "Didn't Qualify": 'CV + English Submitted',
      'Deferred': 'Selected for Cohort',
      'Dropped Out': 'Training Active',
      'Recommended Pathway': 'Under Review',
    };

    const exitCounts = {};
    PIPELINE_STAGES_ORDER.forEach((stage) => { exitCounts[stage] = 0; });

    nurses.forEach((n) => {
      if (EXIT_STAGES.includes(n.pipelineStage)) {
        const exitAt = exitMapping[n.pipelineStage] || 'Applied';
        if (exitCounts[exitAt] !== undefined) {
          exitCounts[exitAt]++;
        }
      }
    });

    return PIPELINE_STAGES_ORDER
      .map((stage) => ({
        stage,
        shortLabel: stage.length > 14 ? stage.slice(0, 12) + '...' : stage,
        exits: exitCounts[stage],
      }))
      .filter((d) => d.exits > 0);
  }, [nurses]);

  // Funnel visualization data (decreasing bars)
  const funnelData = useMemo(() => {
    // Cumulative count: at each stage, count nurses at that stage or beyond
    return PIPELINE_STAGES_ORDER.map((stage, idx) => {
      const count = nurses.filter((n) => {
        const nurseIdx = PIPELINE_STAGES_ORDER.indexOf(n.pipelineStage);
        return nurseIdx >= idx;
      }).length;
      return {
        stage,
        shortLabel: stage.length > 14 ? stage.slice(0, 12) + '...' : stage,
        count,
      };
    });
  }, [nurses]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Pipeline Analytics</h2>
        <p className="text-sm text-gray-500">Analyze pipeline flow, conversion rates, and bottlenecks</p>
      </div>

      {/* Bottleneck Alerts */}
      {bottlenecks.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-900">Bottleneck Detection</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {bottlenecks.map((b) => (
              <div
                key={b.stage}
                className={`rounded-lg p-3 border ${
                  b.status === 'red' ? 'border-red-200 bg-red-50' :
                  b.status === 'amber' ? 'border-amber-200 bg-amber-50' :
                  'border-green-200 bg-green-50'
                }`}
              >
                <p className="text-sm font-medium text-gray-900">{b.stage}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-600">{b.count} nurses</span>
                  <span className="text-xs text-gray-600">{b.avgDays} avg days</span>
                </div>
                <span className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(b.status)}`}>
                  {getStatusLabel(b.status)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Funnel Visualization */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={16} className="text-[#5B2D8E]" />
          <h3 className="text-sm font-semibold text-gray-900">Pipeline Funnel</h3>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={funnelData} layout="vertical" barCategoryGap="12%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis dataKey="shortLabel" type="category" tick={{ fontSize: 11 }} width={110} />
            <Tooltip
              formatter={(value) => [value, 'Nurses at or beyond stage']}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {funnelData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={FUNNEL_GRADIENT[index % FUNNEL_GRADIENT.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stage Velocity Table */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={16} className="text-[#5B2D8E]" />
          <h3 className="text-sm font-semibold text-gray-900">Stage Velocity</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Stage</th>
                <th className="text-center py-2 px-3 text-xs font-medium text-gray-500 uppercase">Nurses</th>
                <th className="text-center py-2 px-3 text-xs font-medium text-gray-500 uppercase">Avg Days</th>
                <th className="text-center py-2 px-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {stageVelocity.map((row) => (
                <tr key={row.stage} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="py-2 px-3 text-gray-900 font-medium">{row.stage}</td>
                  <td className="py-2 px-3 text-center text-gray-700">{row.count}</td>
                  <td className="py-2 px-3 text-center text-gray-700">{row.avgDays}</td>
                  <td className="py-2 px-3 text-center">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(row.status)}`}>
                      {getStatusLabel(row.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drop-off Analysis Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown size={16} className="text-red-500" />
          <h3 className="text-sm font-semibold text-gray-900">Drop-off Analysis</h3>
          <span className="text-xs text-gray-400 ml-2">Exits at each pipeline stage</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={dropOffData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="shortLabel" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              formatter={(value) => [value, 'Exits']}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
            />
            <Bar dataKey="exits" fill="#EF4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
