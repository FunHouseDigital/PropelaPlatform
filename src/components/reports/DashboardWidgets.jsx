import { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  GripVertical, Plus, Save, Maximize2, Minimize2,
  LayoutGrid, Activity, TrendingUp, Table2,
  ChevronDown, ChevronRight, X,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const BRAND_COLOR = '#5B2D8E';
const CHART_COLORS = ['#5B2D8E', '#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE', '#EDE9FE'];

const WIDGET_LIBRARY = [
  { type: 'kpi', title: 'KPI Card', description: 'Single metric with trend indicator', icon: TrendingUp },
  { type: 'chart', title: 'Chart', description: 'Bar, line, or pie chart visualization', icon: BarChart },
  { type: 'table', title: 'Table', description: 'Compact data table', icon: Table2 },
  { type: 'activity', title: 'Recent Activity', description: 'Activity feed from communications', icon: Activity },
];

const DEFAULT_WIDGETS = [
  { widgetId: 'default-1', type: 'kpi', title: 'Total Nurses', size: 'small', position: 0, config: { metric: 'totalNurses' } },
  { widgetId: 'default-2', type: 'chart', title: 'Pipeline Stage Distribution', size: 'medium', position: 1, config: { chartType: 'bar', dataSource: 'pipelineStages' } },
  { widgetId: 'default-3', type: 'kpi', title: 'Active Placements', size: 'small', position: 2, config: { metric: 'activePlacements' } },
  { widgetId: 'default-4', type: 'activity', title: 'Recent Activity', size: 'large', position: 3, config: {} },
];

// Sortable Widget Wrapper
function SortableWidget({ widget, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.widgetId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const sizeClass = widget.size === 'large' ? 'col-span-3' : widget.size === 'medium' ? 'col-span-2' : 'col-span-1';

  return (
    <div ref={setNodeRef} style={style} className={sizeClass}>
      {children({ attributes, listeners })}
    </div>
  );
}

// KPI Widget Content
function KPIContent({ widget, nurses, placements }) {
  const { metric } = widget.config || {};

  const { value, label } = useMemo(() => {
    if (metric === 'totalNurses') {
      const total = nurses.length;
      return { value: total, label: 'Total Nurses' };
    }
    if (metric === 'activePlacements') {
      const active = placements.filter((p) => p.currentStage !== 'Completed' && p.currentStage !== 'Withdrawn').length;
      return { value: active, label: 'Active Placements' };
    }
    if (metric === 'placedNurses') {
      const placed = nurses.filter((n) => n.pipelineStage === 'Placed').length;
      return { value: placed, label: 'Placed Nurses' };
    }
    if (metric === 'complianceRate') {
      const compliant = nurses.filter((n) => n.oetStatus === 'Passed').length;
      const rate = nurses.length > 0 ? Math.round((compliant / nurses.length) * 100) : 0;
      return { value: `${rate}%`, label: 'Compliance Rate' };
    }
    return { value: 0, label: 'Metric' };
  }, [metric, nurses, placements]);

  return (
    <div className="flex flex-col items-center justify-center h-full py-4">
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

// Chart Widget Content
function ChartContent({ widget, nurses, placements }) {
  const { chartType = 'bar', dataSource = 'pipelineStages' } = widget.config || {};

  const chartData = useMemo(() => {
    if (dataSource === 'pipelineStages') {
      const stages = {};
      nurses.forEach((n) => {
        const stage = n.pipelineStage || 'Unknown';
        stages[stage] = (stages[stage] || 0) + 1;
      });
      return Object.entries(stages).map(([name, count]) => ({ name, count }));
    }
    if (dataSource === 'placementsByMonth') {
      const months = {};
      placements.forEach((p) => {
        const date = p.matchedAt || p.createdAt || '';
        const month = date.slice(0, 7);
        if (month) months[month] = (months[month] || 0) + 1;
      });
      return Object.entries(months)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([name, count]) => ({ name, count }));
    }
    if (dataSource === 'nursesBySpecialty') {
      const specialties = {};
      nurses.forEach((n) => {
        const spec = n.primaryClinicalSpecialty || 'Unspecified';
        specialties[spec] = (specialties[spec] || 0) + 1;
      });
      return Object.entries(specialties)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name, count]) => ({ name, count }));
    }
    return [];
  }, [dataSource, nurses, placements]);

  if (chartData.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">No data available</p>;
  }

  if (chartType === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={chartData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ name }) => name.slice(0, 10)}>
            {chartData.map((_, idx) => (
              <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Line type="monotone" dataKey="count" stroke={BRAND_COLOR} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip />
        <Bar dataKey="count" fill={BRAND_COLOR} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Table Widget Content
function TableContent({ nurses }) {
  const rows = useMemo(() => {
    return nurses.slice(0, 8).map((n) => ({
      name: n.fullName,
      stage: n.pipelineStage || 'N/A',
      score: n.finalScore || 0,
    }));
  }, [nurses]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-1.5 px-2 text-gray-500 font-medium">Name</th>
            <th className="text-left py-1.5 px-2 text-gray-500 font-medium">Stage</th>
            <th className="text-right py-1.5 px-2 text-gray-500 font-medium">Score</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
              <td className="py-1.5 px-2 text-gray-700 truncate max-w-[120px]">{row.name}</td>
              <td className="py-1.5 px-2 text-gray-600">{row.stage}</td>
              <td className="py-1.5 px-2 text-gray-700 text-right">{row.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Activity Widget Content
function ActivityContent({ communications, notifications }) {
  const items = useMemo(() => {
    const comms = (communications || []).slice(0, 5).map((c) => ({
      id: c.id,
      text: c.subject || c.type || 'Communication',
      time: c.sentAt || c.createdAt || '',
      type: 'comm',
    }));
    const notifs = (notifications || []).slice(0, 5).map((n) => ({
      id: n.id,
      text: n.message || n.title || 'Notification',
      time: n.createdAt || '',
      type: 'notif',
    }));
    return [...comms, ...notifs]
      .sort((a, b) => (b.time || '').localeCompare(a.time || ''))
      .slice(0, 8);
  }, [communications, notifications]);

  if (items.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-4">No recent activity</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-start gap-2 py-1.5 border-b border-gray-100 last:border-0">
          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${item.type === 'comm' ? 'bg-[#5B2D8E]' : 'bg-blue-400'}`} />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-700 truncate">{item.text}</p>
            {item.time && (
              <p className="text-[10px] text-gray-400 mt-0.5">{new Date(item.time).toLocaleDateString()}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Widget Card wrapper
function WidgetCard({ widget, onRemove, onResize, dragHandleProps }) {
  const { nurses, placements, communications, notifications } = useAppContext();

  const sizeOptions = ['small', 'medium', 'large'];
  const currentIdx = sizeOptions.indexOf(widget.size);
  const nextSize = sizeOptions[(currentIdx + 1) % sizeOptions.length];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-full flex flex-col">
      {/* Widget Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 min-w-0">
          <button {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
            <GripVertical size={14} />
          </button>
          <h4 className="text-sm font-medium text-gray-900 truncate">{widget.title}</h4>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onResize(widget.widgetId, nextSize)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
            title={`Resize to ${nextSize}`}
          >
            {widget.size === 'small' ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
          </button>
          <button
            onClick={() => onRemove(widget.widgetId)}
            className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
            title="Remove widget"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Widget Content */}
      <div className="flex-1 px-4 py-2 overflow-hidden">
        {widget.type === 'kpi' && <KPIContent widget={widget} nurses={nurses} placements={placements} />}
        {widget.type === 'chart' && <ChartContent widget={widget} nurses={nurses} placements={placements} />}
        {widget.type === 'table' && <TableContent nurses={nurses} />}
        {widget.type === 'activity' && <ActivityContent communications={communications} notifications={notifications} />}
      </div>

      {/* Widget Footer */}
      <div className="px-4 py-2 border-t border-gray-100">
        <span className="text-[10px] text-gray-400 uppercase tracking-wide">
          {widget.size} &middot; {widget.type}
        </span>
      </div>
    </div>
  );
}

export default function DashboardWidgets() {
  const {
    dashboardLayouts,
    activeDashboardLayout,
    updateDashboardLayouts,
    updateActiveDashboardLayout,
  } = useAppContext();

  // Initialize widgets from active layout or defaults
  const [widgets, setWidgets] = useState(() => {
    // activeDashboardLayout might be a full layout object or just an ID string
    if (activeDashboardLayout && typeof activeDashboardLayout === 'object' && activeDashboardLayout.widgets) {
      return activeDashboardLayout.widgets;
    }
    // If it's an ID string, resolve from layouts
    if (activeDashboardLayout && typeof activeDashboardLayout === 'string') {
      const found = dashboardLayouts.find((l) => l.id === activeDashboardLayout);
      if (found && found.widgets) return found.widgets;
    }
    // Fallback: use first layout or defaults
    if (dashboardLayouts.length > 0 && dashboardLayouts[0].widgets) {
      return dashboardLayouts[0].widgets;
    }
    return DEFAULT_WIDGETS;
  });

  const [showLibrary, setShowLibrary] = useState(false);
  const [layoutName, setLayoutName] = useState('');
  const [selectedLayoutId, setSelectedLayoutId] = useState(() => {
    if (activeDashboardLayout && typeof activeDashboardLayout === 'object') return activeDashboardLayout.id || '';
    if (activeDashboardLayout && typeof activeDashboardLayout === 'string') return activeDashboardLayout;
    return '';
  });
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  // Drag handlers
  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((w) => w.widgetId === active.id);
        const newIndex = items.findIndex((w) => w.widgetId === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  // Add widget from library
  const addWidget = useCallback((libraryItem) => {
    const newWidget = {
      widgetId: `widget-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: libraryItem.type,
      title: libraryItem.type === 'kpi' ? 'New KPI' : libraryItem.type === 'chart' ? 'New Chart' : libraryItem.type === 'table' ? 'Data Table' : 'Recent Activity',
      size: 'small',
      position: widgets.length,
      config: getDefaultConfig(libraryItem.type),
    };
    setWidgets((prev) => [...prev, newWidget]);
  }, [widgets.length]);

  // Remove widget
  const removeWidget = useCallback((widgetId) => {
    setWidgets((prev) => prev.filter((w) => w.widgetId !== widgetId));
  }, []);

  // Resize widget
  const resizeWidget = useCallback((widgetId, newSize) => {
    setWidgets((prev) =>
      prev.map((w) => (w.widgetId === widgetId ? { ...w, size: newSize } : w))
    );
  }, []);

  // Save current layout
  const saveLayout = useCallback(() => {
    const layout = {
      id: activeDashboardLayout?.id || `layout-${Date.now()}`,
      name: activeDashboardLayout?.name || 'My Dashboard',
      widgets: widgets.map((w, idx) => ({ ...w, position: idx })),
    };
    updateActiveDashboardLayout(layout);

    // Update in layouts array if exists
    const existingIdx = dashboardLayouts.findIndex((l) => l.id === layout.id);
    if (existingIdx >= 0) {
      const updated = [...dashboardLayouts];
      updated[existingIdx] = layout;
      updateDashboardLayouts(updated);
    }
  }, [widgets, activeDashboardLayout, dashboardLayouts, updateActiveDashboardLayout, updateDashboardLayouts]);

  // Save as new layout
  const saveAsNewLayout = useCallback(() => {
    if (!layoutName.trim()) return;
    const newLayout = {
      id: `layout-${Date.now()}`,
      name: layoutName.trim(),
      widgets: widgets.map((w, idx) => ({ ...w, position: idx })),
    };
    updateDashboardLayouts([...dashboardLayouts, newLayout]);
    updateActiveDashboardLayout(newLayout);
    setSelectedLayoutId(newLayout.id);
    setLayoutName('');
  }, [layoutName, widgets, dashboardLayouts, updateDashboardLayouts, updateActiveDashboardLayout]);

  // Load layout
  const loadLayout = useCallback((layoutId) => {
    const layout = dashboardLayouts.find((l) => l.id === layoutId);
    if (layout) {
      setWidgets(layout.widgets || []);
      updateActiveDashboardLayout(layout);
      setSelectedLayoutId(layoutId);
    }
  }, [dashboardLayouts, updateActiveDashboardLayout]);

  const activeWidget = activeId ? widgets.find((w) => w.widgetId === activeId) : null;

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Toggle Library */}
          <button
            onClick={() => setShowLibrary(!showLibrary)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {showLibrary ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Plus size={14} />
            Widget Library
          </button>

          {/* Load Layout */}
          <div className="flex items-center gap-2">
            <select
              value={selectedLayoutId}
              onChange={(e) => loadLayout(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
            >
              <option value="">Load Layout...</option>
              {dashboardLayouts.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          {/* Save Current */}
          <button
            onClick={saveLayout}
            className="flex items-center gap-2 px-3 py-2 bg-[#5B2D8E] text-white rounded-lg text-sm font-medium hover:bg-[#4a2474] transition-colors"
          >
            <Save size={14} />
            Save Layout
          </button>

          {/* Save As New */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={layoutName}
              onChange={(e) => setLayoutName(e.target.value)}
              placeholder="New layout name..."
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E] w-44"
            />
            <button
              onClick={saveAsNewLayout}
              disabled={!layoutName.trim()}
              className="flex items-center gap-2 px-3 py-2 border border-[#5B2D8E] text-[#5B2D8E] rounded-lg text-sm font-medium hover:bg-[#5B2D8E]/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save size={14} />
              Save As New
            </button>
          </div>
        </div>
      </div>

      {/* Widget Library Panel */}
      {showLibrary && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Widget Library</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {WIDGET_LIBRARY.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.type}
                  onClick={() => addWidget(item)}
                  className="flex flex-col items-center gap-2 p-4 border border-dashed border-gray-300 rounded-lg hover:border-[#5B2D8E] hover:bg-[#5B2D8E]/5 transition-colors group"
                >
                  <Icon size={20} className="text-gray-400 group-hover:text-[#5B2D8E]" />
                  <span className="text-xs font-medium text-gray-700 group-hover:text-[#5B2D8E]">{item.title}</span>
                  <span className="text-[10px] text-gray-400 text-center">{item.description}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Dashboard Grid */}
      <div className="min-h-[400px] bg-gray-50 rounded-xl border border-dashed border-gray-300 p-4">
        {widgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <LayoutGrid size={40} className="mb-3" />
            <p className="text-sm font-medium">No widgets added</p>
            <p className="text-xs mt-1">Click "Widget Library" to add widgets to your dashboard</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={widgets.map((w) => w.widgetId)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-3 gap-4 auto-rows-[220px]">
                {widgets.map((widget) => (
                  <SortableWidget key={widget.widgetId} widget={widget}>
                    {({ attributes, listeners }) => (
                      <WidgetCard
                        widget={widget}
                        onRemove={removeWidget}
                        onResize={resizeWidget}
                        dragHandleProps={{ ...attributes, ...listeners }}
                      />
                    )}
                  </SortableWidget>
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeWidget ? (
                <div className="bg-white rounded-xl border border-[#5B2D8E] shadow-lg p-4 opacity-80">
                  <p className="text-sm font-medium text-gray-900">{activeWidget.title}</p>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}

function getDefaultConfig(type) {
  switch (type) {
    case 'kpi':
      return { metric: 'totalNurses' };
    case 'chart':
      return { chartType: 'bar', dataSource: 'pipelineStages' };
    case 'table':
      return {};
    case 'activity':
      return {};
    default:
      return {};
  }
}
