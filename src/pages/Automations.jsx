import { useState } from 'react';
import { Zap, BookTemplate, ScrollText, CalendarClock } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import RuleBuilder from '../components/automations/RuleBuilder';

const TABS = [
  { id: 'rule-builder', label: 'Rule Builder', icon: Zap },
  { id: 'templates', label: 'Automation Templates', icon: BookTemplate },
  { id: 'execution-log', label: 'Execution Log', icon: ScrollText },
  { id: 'scheduled-actions', label: 'Scheduled Actions', icon: CalendarClock },
];

export default function Automations() {
  const [activeTab, setActiveTab] = useState('rule-builder');
  const { automationRules, automationTemplates, executionLog, scheduledActions } = useAppContext();

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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Automation Templates</h2>
            <span className="text-sm text-gray-500">{automationTemplates.length} templates available</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {automationTemplates.map((template) => (
              <div key={template.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{template.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${template.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {template.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded">{template.category}</span>
                  <span>{template.parameters.length} parameters</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'execution-log' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Execution Log</h2>
            <span className="text-sm text-gray-500">{executionLog.length} executions recorded</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Rule</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Trigger Event</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Triggered At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {executionLog.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{entry.ruleName}</td>
                    <td className="px-4 py-3 text-gray-600">{entry.triggerEvent}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                        ${entry.status === 'success' ? 'bg-green-100 text-green-700' : ''}
                        ${entry.status === 'failure' ? 'bg-red-100 text-red-700' : ''}
                        ${entry.status === 'skipped' ? 'bg-yellow-100 text-yellow-700' : ''}
                      `}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{new Date(entry.triggeredAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'scheduled-actions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Scheduled Actions</h2>
            <span className="text-sm text-gray-500">{scheduledActions.length} schedules configured</span>
          </div>
          <div className="grid gap-4">
            {scheduledActions.map((action) => (
              <div key={action.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${action.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <h3 className="font-medium text-gray-900">{action.ruleName}</h3>
                  </div>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">{action.cronExpression}</code>
                </div>
                <p className="text-sm text-gray-600 mb-3">{action.description}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>Timezone: {action.timezone}</span>
                  <span>Batch size: {action.batchSize}</span>
                  <span>Next run: {new Date(action.nextRunAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
