import { useState } from 'react';
import { Zap, BookTemplate, ScrollText, CalendarClock } from 'lucide-react';
import RuleBuilder from '../components/automations/RuleBuilder';
import AutomationTemplates from '../components/automations/AutomationTemplates';
import ExecutionLog from '../components/automations/ExecutionLog';
import ScheduledActions from '../components/automations/ScheduledActions';

const TABS = [
  { id: 'rule-builder', label: 'Rule Builder', icon: Zap },
  { id: 'templates', label: 'Automation Templates', icon: BookTemplate },
  { id: 'execution-log', label: 'Execution Log', icon: ScrollText },
  { id: 'scheduled-actions', label: 'Scheduled Actions', icon: CalendarClock },
];

export default function Automations() {
  const [activeTab, setActiveTab] = useState('rule-builder');

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Workflow Automation</h1>
        <p className="text-sm text-gray-500 mt-1">
          Build automation rules, use templates, monitor executions, and manage scheduled actions
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-150
                ${isActive
                  ? 'bg-white text-[#5B2D8E] shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'rule-builder' && (
        <RuleBuilder />
      )}

      {activeTab === 'templates' && (
        <AutomationTemplates />
      )}

      {activeTab === 'execution-log' && (
        <ExecutionLog />
      )}

      {activeTab === 'scheduled-actions' && (
        <ScheduledActions />
      )}
    </div>
  );
}
