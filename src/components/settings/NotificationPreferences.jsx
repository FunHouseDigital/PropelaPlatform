import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Save } from 'lucide-react';

const EVENT_TYPES = [
  { key: 'nurseApplied', label: 'Nurse Applied' },
  { key: 'oetResultReceived', label: 'OET Result Received' },
  { key: 'placementMatchFound', label: 'Placement Match Found' },
  { key: 'cohortMilestoneReached', label: 'Cohort Milestone Reached' },
  { key: 'documentExpiring', label: 'Document Expiring' },
  { key: 'stageSLABreach', label: 'Stage SLA Breach' },
];

const DIGEST_OPTIONS = ['Real-time', 'Daily', 'Weekly'];

function ToggleSwitch({ enabled, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        enabled ? 'bg-[#5B2D8E]' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-4.5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

export default function NotificationPreferences() {
  const { settings, updateSettings } = useAppContext();
  const [notifications, setNotifications] = useState({ ...settings.notifications });
  const [saved, setSaved] = useState(false);

  const handleEmailToggle = (key) => {
    setNotifications((prev) => ({
      ...prev,
      email: { ...prev.email, [key]: !prev.email[key] },
    }));
  };

  const handleInAppToggle = (key) => {
    setNotifications((prev) => ({
      ...prev,
      inApp: { ...prev.inApp, [key]: !prev.inApp[key] },
    }));
  };

  const handleDigestChange = (value) => {
    setNotifications((prev) => ({ ...prev, digestFrequency: value }));
  };

  const handleQuietHoursToggle = () => {
    setNotifications((prev) => ({
      ...prev,
      quietHours: { ...prev.quietHours, enabled: !prev.quietHours.enabled },
    }));
  };

  const handleQuietHoursChange = (field, value) => {
    setNotifications((prev) => ({
      ...prev,
      quietHours: { ...prev.quietHours, [field]: value },
    }));
  };

  const handleSave = () => {
    const updated = { ...settings, notifications };
    updateSettings(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Email Notifications */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Notifications</h3>
        <div className="space-y-3">
          {EVENT_TYPES.map((event) => (
            <div key={event.key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <span className="text-sm text-gray-700">{event.label}</span>
              <ToggleSwitch
                enabled={notifications.email[event.key]}
                onToggle={() => handleEmailToggle(event.key)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* In-App Notifications */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">In-App Notifications</h3>
        <div className="space-y-3">
          {EVENT_TYPES.map((event) => (
            <div key={event.key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <span className="text-sm text-gray-700">{event.label}</span>
              <ToggleSwitch
                enabled={notifications.inApp[event.key]}
                onToggle={() => handleInAppToggle(event.key)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Digest Frequency */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Digest Frequency</h3>
        <div className="flex gap-4">
          {DIGEST_OPTIONS.map((option) => (
            <label key={option} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="digestFrequency"
                value={option}
                checked={notifications.digestFrequency === option}
                onChange={() => handleDigestChange(option)}
                className="w-4 h-4 text-[#5B2D8E] border-gray-300 focus:ring-[#5B2D8E]"
              />
              <span className="text-sm text-gray-700">{option}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quiet Hours</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Enable Quiet Hours</span>
            <ToggleSwitch
              enabled={notifications.quietHours.enabled}
              onToggle={handleQuietHoursToggle}
            />
          </div>
          {notifications.quietHours.enabled && (
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Start Time</label>
                <input
                  type="time"
                  value={notifications.quietHours.start}
                  onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">End Time</label>
                <input
                  type="time"
                  value={notifications.quietHours.end}
                  onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
                />
              </div>
            </div>
          )}
        </div>
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
