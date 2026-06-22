import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Cell,
} from 'recharts';
import { useAppContext } from '../../context/AppContext';

const PURPLE = '#5B2D8E';
const PURPLE_LIGHT = '#8B5DC0';
const PURPLE_LIGHTER = '#B794D4';
const CHART_COLORS = ['#5B2D8E', '#8B5DC0', '#B794D4', '#D4B8E8', '#F3EDF9'];

export default function ChannelPerformance() {
  const { facilities, referrers, communityChannels, events, outreachTemplates } = useAppContext();

  const analytics = useMemo(() => {
    // Gather all outreach entries
    const allEntries = [];

    facilities.forEach((f) => {
      (f.outreachLog || []).forEach((entry) => {
        allEntries.push({ ...entry, track: 'Organisations', nursesSourced: f.nursesSourced || 0 });
      });
    });

    referrers.forEach((r) => {
      (r.outreachLog || []).forEach((entry) => {
        allEntries.push({ ...entry, track: 'Referral Network', nursesSourced: r.nursesReferred || 0 });
      });
    });

    communityChannels.forEach((c) => {
      (c.outreachLog || []).forEach((entry) => {
        allEntries.push({ ...entry, track: 'Community Channels', nursesSourced: c.nursesSourced || 0 });
      });
    });

    events.forEach((ev) => {
      (ev.outreachLog || []).forEach((entry) => {
        allEntries.push({ ...entry, track: 'Events', nursesSourced: ev.nursesSourced || 0 });
      });
    });

    // Chart 1: Outreach attempts by channel
    const channelCounts = {};
    const channelResponses = {};
    allEntries.forEach((e) => {
      const ch = e.channel || 'Other';
      channelCounts[ch] = (channelCounts[ch] || 0) + 1;
      if (e.outcome && e.outcome !== 'No response' && e.outcome !== 'Bounced') {
        channelResponses[ch] = (channelResponses[ch] || 0) + 1;
      }
    });

    const channelAttempts = Object.entries(channelCounts)
      .map(([channel, count]) => ({ channel, count }))
      .sort((a, b) => b.count - a.count);

    // Chart 2: Response rate by channel
    const channelResponseRate = Object.entries(channelCounts).map(([channel, count]) => ({
      channel,
      rate: count > 0 ? Math.round(((channelResponses[channel] || 0) / count) * 100) : 0,
    })).sort((a, b) => b.rate - a.rate);

    // Chart 3: Top 5 templates by response rate
    const topTemplates = [...outreachTemplates]
      .filter((t) => t.status === 'Active' && t.timesUsed > 0)
      .sort((a, b) => (b.responseRate || 0) - (a.responseRate || 0))
      .slice(0, 5)
      .map((t) => ({ name: t.name.length > 30 ? t.name.slice(0, 30) + '...' : t.name, rate: t.responseRate || 0 }));

    // Chart 4: Nurses sourced by acquisition track
    const trackNurses = {};
    facilities.forEach((f) => { trackNurses['Organisations'] = (trackNurses['Organisations'] || 0) + (f.nursesSourced || 0); });
    referrers.forEach((r) => { trackNurses['Referral Network'] = (trackNurses['Referral Network'] || 0) + (r.nursesReferred || 0); });
    communityChannels.forEach((c) => { trackNurses['Community Channels'] = (trackNurses['Community Channels'] || 0) + (c.nursesSourced || 0); });
    events.forEach((ev) => { trackNurses['Events'] = (trackNurses['Events'] || 0) + (ev.nursesSourced || 0); });

    const nursesByTrack = Object.entries(trackNurses).map(([track, count]) => ({ track, count }));

    // Chart 5: Monthly outreach volume (last 6 months)
    const now = new Date();
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      const count = allEntries.filter((e) => e.date && e.date.startsWith(yearMonth)).length;
      monthlyData.push({ month: label, count });
    }

    // Summary metrics
    const totalAttempts = allEntries.length;
    const totalResponses = allEntries.filter((e) => e.outcome && e.outcome !== 'No response' && e.outcome !== 'Bounced').length;
    const overallResponseRate = totalAttempts > 0 ? Math.round((totalResponses / totalAttempts) * 100) : 0;
    const totalTemplates = outreachTemplates.filter((t) => t.status === 'Active').length;

    return {
      channelAttempts,
      channelResponseRate,
      topTemplates,
      nursesByTrack,
      monthlyData,
      totalAttempts,
      overallResponseRate,
      totalTemplates,
    };
  }, [facilities, referrers, communityChannels, events, outreachTemplates]);

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Total Outreach Attempts</p>
          <p className="text-2xl font-bold text-gray-900">{analytics.totalAttempts}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Overall Response Rate</p>
          <p className="text-2xl font-bold text-propela-purple">{analytics.overallResponseRate}%</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Active Templates</p>
          <p className="text-2xl font-bold text-gray-900">{analytics.totalTemplates}</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Outreach Attempts by Channel */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Outreach Attempts by Channel</h3>
          {analytics.channelAttempts.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.channelAttempts} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="channel" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill={PURPLE} radius={[4, 4, 0, 0]} name="Attempts" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-gray-400 text-center py-8">No outreach data available</p>
          )}
        </div>

        {/* Chart 2: Response Rate by Channel */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Response Rate by Channel (%)</h3>
          {analytics.channelResponseRate.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.channelResponseRate} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="channel" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Bar dataKey="rate" fill={PURPLE_LIGHT} radius={[4, 4, 0, 0]} name="Response Rate" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-gray-400 text-center py-8">No outreach data available</p>
          )}
        </div>

        {/* Chart 3: Top 5 Templates by Response Rate */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Templates by Response Rate</h3>
          {analytics.topTemplates.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.topTemplates} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={120} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Bar dataKey="rate" name="Response Rate" radius={[0, 4, 4, 0]}>
                  {analytics.topTemplates.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-gray-400 text-center py-8">No template data available</p>
          )}
        </div>

        {/* Chart 4: Nurses Sourced by Track */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Nurses Sourced by Acquisition Track</h3>
          {analytics.nursesByTrack.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.nursesByTrack} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="track" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill={PURPLE} radius={[4, 4, 0, 0]} name="Nurses">
                  {analytics.nursesByTrack.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-gray-400 text-center py-8">No data available</p>
          )}
        </div>

        {/* Chart 5: Monthly Outreach Volume */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Outreach Volume (Last 6 Months)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={analytics.monthlyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                stroke={PURPLE}
                strokeWidth={2}
                dot={{ fill: PURPLE, r: 4 }}
                activeDot={{ r: 6 }}
                name="Entries"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
