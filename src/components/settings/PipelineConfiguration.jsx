import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2, Save, Bell, BellOff } from 'lucide-react';

function SortableStageCard({ stage, onRemove, onUpdate }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-3 mb-2">
      <button {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600">
        <GripVertical size={18} />
      </button>
      <div className="flex-1 grid grid-cols-3 gap-3 items-center">
        <input
          type="text"
          value={stage.name}
          onChange={(e) => onUpdate(stage.id, 'name', e.target.value)}
          className="px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#5B2D8E]/30"
        />
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={stage.defaultDuration}
            onChange={(e) => onUpdate(stage.id, 'defaultDuration', parseInt(e.target.value) || 0)}
            className="w-16 px-2 py-1.5 border border-gray-200 rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-[#5B2D8E]/30"
          />
          <span className="text-xs text-gray-500">days</span>
        </div>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={stage.slaThreshold}
            onChange={(e) => onUpdate(stage.id, 'slaThreshold', parseInt(e.target.value) || 0)}
            className="w-16 px-2 py-1.5 border border-gray-200 rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-[#5B2D8E]/30"
          />
          <span className="text-xs text-gray-500">SLA days</span>
        </div>
      </div>
      <button
        onClick={() => onUpdate(stage.id, 'notificationsEnabled', !stage.notificationsEnabled)}
        className={`p-1.5 rounded ${stage.notificationsEnabled ? 'text-[#5B2D8E]' : 'text-gray-400'}`}
        title={stage.notificationsEnabled ? 'Notifications enabled' : 'Notifications disabled'}
      >
        {stage.notificationsEnabled ? <Bell size={16} /> : <BellOff size={16} />}
      </button>
      <button onClick={() => onRemove(stage.id)} className="p-1.5 text-red-400 hover:text-red-600 rounded">
        <Trash2 size={16} />
      </button>
    </div>
  );
}

export default function PipelineConfiguration() {
  const { settings, updateSettings } = useAppContext();
  const [stages, setStages] = useState([...settings.pipelineStages]);
  const [transitionRules, setTransitionRules] = useState({ ...settings.stageTransitionRules });
  const [saved, setSaved] = useState(false);
  const [showTransitions, setShowTransitions] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = stages.findIndex((s) => s.id === active.id);
      const newIndex = stages.findIndex((s) => s.id === over.id);
      const newStages = arrayMove(stages, oldIndex, newIndex).map((s, i) => ({ ...s, order: i }));
      setStages(newStages);
    }
  };

  const handleUpdate = (id, field, value) => {
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const handleRemove = (id) => {
    setStages((prev) => prev.filter((s) => s.id !== id));
    const newRules = { ...transitionRules };
    delete newRules[id];
    Object.keys(newRules).forEach((key) => {
      newRules[key] = newRules[key].filter((t) => t !== id);
    });
    setTransitionRules(newRules);
  };

  const handleAdd = () => {
    const newId = `stage-${Date.now()}`;
    setStages((prev) => {
      // Add the new stage's id to the last existing stage's transitions so it's reachable
      if (prev.length > 0) {
        const lastStageId = prev[prev.length - 1].id;
        setTransitionRules((rules) => ({
          ...rules,
          [lastStageId]: [...(rules[lastStageId] || []), newId],
          [newId]: [],
        }));
      } else {
        setTransitionRules((rules) => ({ ...rules, [newId]: [] }));
      }
      return [
        ...prev,
        { id: newId, name: 'New Stage', order: prev.length, defaultDuration: 7, slaThreshold: 14, notificationsEnabled: true },
      ];
    });
  };

  const handleTransitionToggle = (fromId, toId) => {
    setTransitionRules((prev) => {
      const current = prev[fromId] || [];
      const updated = current.includes(toId) ? current.filter((t) => t !== toId) : [...current, toId];
      return { ...prev, [fromId]: updated };
    });
  };

  const handleSave = () => {
    const updated = { ...settings, pipelineStages: stages, stageTransitionRules: transitionRules };
    updateSettings(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Sortable Stages */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Pipeline Stages</h3>
          <button
            onClick={handleAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5B2D8E]/10 text-[#5B2D8E] rounded-lg text-sm font-medium hover:bg-[#5B2D8E]/20 transition-colors"
          >
            <Plus size={14} />
            Add Stage
          </button>
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-3 py-2 mb-2 text-xs font-medium text-gray-500 uppercase">
          <div className="w-[18px]" />
          <div className="flex-1 grid grid-cols-3 gap-3">
            <span>Stage Name</span>
            <span>Default Duration</span>
            <span>SLA Threshold</span>
          </div>
          <div className="w-[32px]" />
          <div className="w-[32px]" />
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={stages.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {stages.map((stage) => (
              <SortableStageCard key={stage.id} stage={stage} onRemove={handleRemove} onUpdate={handleUpdate} />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* Transition Rules */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Stage Transition Rules</h3>
          <button
            onClick={() => setShowTransitions(!showTransitions)}
            className="text-sm text-[#5B2D8E] font-medium hover:underline"
          >
            {showTransitions ? 'Hide' : 'Show'} Rules Editor
          </button>
        </div>

        {showTransitions && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left py-2 px-2 font-medium text-gray-600">From / To</th>
                  {stages.map((s) => (
                    <th key={s.id} className="py-2 px-1 font-medium text-gray-600 text-center whitespace-nowrap">
                      {s.name.length > 12 ? s.name.slice(0, 12) + '...' : s.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stages.map((fromStage) => (
                  <tr key={fromStage.id} className="border-t border-gray-100">
                    <td className="py-2 px-2 font-medium text-gray-700 whitespace-nowrap">
                      {fromStage.name.length > 15 ? fromStage.name.slice(0, 15) + '...' : fromStage.name}
                    </td>
                    {stages.map((toStage) => (
                      <td key={toStage.id} className="py-2 px-1 text-center">
                        {fromStage.id === toStage.id ? (
                          <span className="text-gray-300">-</span>
                        ) : (
                          <input
                            type="checkbox"
                            checked={(transitionRules[fromStage.id] || []).includes(toStage.id)}
                            onChange={() => handleTransitionToggle(fromStage.id, toStage.id)}
                            className="w-3.5 h-3.5 rounded border-gray-300 text-[#5B2D8E] focus:ring-[#5B2D8E]"
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#5B2D8E] text-white rounded-lg text-sm font-medium hover:bg-[#4a2574] transition-colors"
        >
          <Save size={16} />
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
