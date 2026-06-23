import { useMemo } from 'react';
import {
  LineChart, Line, PieChart, Pie, Cell, BarChart, Bar,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Clock, DollarSign, Users } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { ACCESSIBLE_CHART_COLORS } from '../../lib/chartAccessibility';

const COLORS = ACCESSIBLE_CHART_COLORS;
const PIE_COLORS = [ACCESSIBLE_CHART_COLORS[0], ACCESSIBLE_CHART_COLORS[2]];

export default function OutcomesDashboard() {
  const { placements } = useAppContext();

  const stats = useMemo(() => {
    const placed = placements.filter(
      (p) => p.currentStage === 'Placed' || p.currentStage === 'Settled'
    );
    const successRate = placements.length > 0
      ? Math.round((placed.length / placements.length) * 100)
      : 0;

    const avgDays = placements.length > 0
      ? Math.round(
          placements.reduce((sum, p) => sum + p.daysInStage, 0) / placements.length
        )
      : 0;

    // Revenue estimate (per placement approximately GBP 5,000 fee)
    const revenue = placed.length * 5000;
    const revenueTarget = placements.length * 5000;

    const pipelineTotal = placements.filter(
      (p) => p.currentStage !== 'Placed' && p.currentStage !== 'Settled'
    ).length;

    return { successRate, avgDays, revenue, revenueTarget, pipelineTotal, placedCount: placed.length };
  }, [placements]);

  // Monthly placements data (simulated over 6 months)
  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((month, idx) => ({
      month,
      placements: Math.max(0, Math.floor(stats.placedCount * (0.3 + idx * 0.15))),
      target: Math.ceil(placements.length * 0.2),
    }));
  }, [placements, stats.placedCount]);

  // UK vs Ireland distribution
  const countryData = useMemo(() => {
    const uk = placements.filter((p) => p.targetCountry === 'UK').length;
    const ireland = placements.filter((p) => p.targetCountry === 'Ireland').length;
    return [
      { name: 'UK', value: uk },
      { name: 'Ireland', value: ireland },
    ];
  }, [placements]);

  // Top facilities
  const facilityData = useMemo(() => {
    const counts = {};
    placements.forEach((p) => {
      counts[p.facilityName] = (counts[p.facilityName] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name: name.length > 20 ? name.slice(0, 20) + '...' : name, count }));
  }, [placements]);

  // Revenue vs target (area chart)
  const revenueData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((month, idx) => ({
      month,
      revenue: Math.floor(stats.revenue * (0.2 + idx * 0.18)),
      target: Math.floor(stats.revenueTarget * (0.15 + idx * 0.17)),
    }));
  }, [stats.revenue, stats.revenueTarget]);

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          label="Success Rate"
          value={`${stats.successRate}%`}
          color="text-green-600"
          bgColor="bg-green-50"
        />
        <StatCard
          icon={Clock}
          label="Avg Days in Pipeline"
          value={`${stats.avgDays}`}
          color="text-amber-600"
          bgColor="bg-amber-50"
        />
        <StatCard
          icon={DollarSign}
          label="Revenue (GBP)"
          value={`${stats.revenue.toLocaleString()}`}
          color="text-[#5B2D8E]"
          bgColor="bg-[#5B2D8E]/5"
        />
        <StatCard
          icon={Users}
          label="Pipeline Total"
          value={`${stats.pipelineTotal}`}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Placements - Line Chart */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Monthly Placements</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="placements"
                stroke="#5B2D8E"
                strokeWidth={2}
                dot={{ fill: '#5B2D8E' }}
              />
              <Line
                type="monotone"
                dataKey="target"
                stroke="#CBD5E1"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* UK vs Ireland - Pie Chart */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Placement Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={countryData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
              >
                {countryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Facilities - Bar Chart */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Top Facilities</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={facilityData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={140} />
              <Tooltip />
              <Bar dataKey="count" fill="#5B2D8E" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue vs Target - Area Chart */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Revenue vs Target</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#5B2D8E"
                fill="#5B2D8E"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="target"
                stroke="#10B981"
                fill="#10B981"
                fillOpacity={0.08}
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bgColor }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center`}>
          <Icon size={20} className={color} />
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className={`text-xl font-bold ${color}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}
