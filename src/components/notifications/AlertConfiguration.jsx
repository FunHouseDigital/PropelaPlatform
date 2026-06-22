import { useState } from 'react';
import {
  Settings,
  Bell,
  Mail,
  Smartphone,
  Moon,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  Info,
  AlertCircle,
  Save,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const SEVERITY_OPTIONS = [
  { value: 'info', label: 'Info', icon: Info, color: 'text-blue-500' },
  { value: 'warning', label: 'Warning', icon: AlertTriangle, color: 'text-amber-500' },
  { value: 'critical', label: 'Critical', icon: AlertCircle, color: 'text-red-500' },
];

const CHANNEL_OPTIONS = [
  { value: 'in_app', label: 'In-App', icon: Bell },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'sms', label: 'SMS', icon: Smartphone },
];

export default function AlertConfiguration() {
  const { notifAlertConfig, updateNotifAlertConfig } = useAppContext();
  const [config, setConfig] = useState(notifAlertConfig);
  const [saved, setSaved] = useState(false);

  const handleToggleRule = (ruleId) => {
    const updatedRules = config.rules.map((rule) =>
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    );
    setConfig({ ...config, rules: updatedRules });
    setSaved(false);
  };

  const handleSeverityChange = (ruleId, severity) => {
    const updatedRules = config.rules.map((rule) =>
      rule.id === ruleId ? { ...rule, severity } : rule
    );
    setConfig({ ...config, rules: updatedRules });
    setSaved(false);
  };

  const handleChannelToggle = (ruleId, channel) => {
    const updatedRules = config.rules.map((rule) => {
      if (rule.id !== ruleId) return rule;
      const channels = rule.channels.includes(channel)
        ? rule.channels.filter((c) => c !== channel)
        : [...rule.channels, channel];
      return { ...rule, channels };
    });
    setConfig({ ...config, rules: updatedRules });
    setSaved(false);
  };

  const handleQuietHoursToggle = () => {
    setConfig({
      ...config,
      quietHours: { ...config.quietHours, enabled: !config.quietHours.enabled },
    });
    setSaved(false);
  };

  const handleQuietHoursChange = (field, value) => {
    setConfig({
      ...config,
      quietHours: { ...config.quietHours, [field]: value },
    });
    setSaved(false);
  };

  const handleSave = () => {
    updateNotifAlertConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Alert Configuration</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Configure which events trigger notifications, severity levels, and delivery channels
          </p>
        </div>
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            saved
              ? 'bg-green-100 text-green-700'
              : 'bg-[#5B2D8E] text-white hover:bg-[#4a2574]'
          }`}
        >
          <Save size={16} />
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Alert Rules */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Settings size={16} />
          Notification Categories
        </h3>

        {config.rules.map((rule) => (
          <div
            key={rule.id}
            className={`border rounded-lg p-4 transition-colors ${
              rule.enabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleRule(rule.id)}
                    className="text-[#5B2D8E]"
                  >
                    {rule.enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} className="text-gray-400" />}
                  </button>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{rule.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{rule.description}</p>
                  </div>
                </div>

                {rule.enabled && (
                  <div className="mt-4 ml-9 space-y-3">
                    {/* Severity */}
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                        Minimum Severity Level
                      </label>
                      <div className="flex gap-2">
                        {SEVERITY_OPTIONS.map((opt) => {
                          const Icon = opt.icon;
                          return (
                            <button
                              key={opt.value}
                              onClick={() => handleSeverityChange(rule.id, opt.value)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                                rule.severity === opt.value
                                  ? 'border-[#5B2D8E] bg-purple-50 text-[#5B2D8E]'
                                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
                              }`}
                            >
                              <Icon size={12} className={opt.color} />
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Delivery Channels */}
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                        Delivery Channels
                      </label>
                      <div className="flex gap-2">
                        {CHANNEL_OPTIONS.map((opt) => {
                          const Icon = opt.icon;
                          const isActive = rule.channels.includes(opt.value);
                          return (
                            <button
                              key={opt.value}
                              onClick={() => handleChannelToggle(rule.id, opt.value)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                                isActive
                                  ? 'border-[#5B2D8E] bg-purple-50 text-[#5B2D8E]'
                                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
                              }`}
                            >
                              <Icon size={12} />
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quiet Hours */}
      <div className="border rounded-lg p-4 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Moon size={20} className="text-indigo-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">Quiet Hours</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Suppress non-critical notifications during specified hours
              </p>
            </div>
          </div>
          <button onClick={handleQuietHoursToggle} className="text-[#5B2D8E]">
            {config.quietHours.enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} className="text-gray-400" />}
          </button>
        </div>

        {config.quietHours.enabled && (
          <div className="mt-4 ml-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Start Time</label>
              <input
                type="time"
                value={config.quietHours.startTime}
                onChange={(e) => handleQuietHoursChange('startTime', e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">End Time</label>
              <input
                type="time"
                value={config.quietHours.endTime}
                onChange={(e) => handleQuietHoursChange('endTime', e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={config.quietHours.exceptCritical}
                  onChange={(e) => handleQuietHoursChange('exceptCritical', e.target.checked)}
                  className="rounded border-gray-300"
                />
                Allow critical alerts
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
