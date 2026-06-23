import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bell,
  X,
  Eye,
  AlertTriangle,
  Info,
  AlertCircle,
  Play,
  Settings,
  Save,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const SEVERITY_COLORS = {
  info: 'border-l-blue-500 bg-blue-50',
  warning: 'border-l-amber-500 bg-amber-50',
  critical: 'border-l-red-500 bg-red-50',
};

const SEVERITY_ICONS = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertCircle,
};

const DEMO_NOTIFICATIONS = [
  { severity: 'info', title: 'System Update', message: 'Version 2.5 has been deployed successfully.' },
  { severity: 'warning', title: 'Document Expiry', message: 'Passport for Maria Santos expires in 7 days.' },
  { severity: 'critical', title: 'Compliance Alert', message: 'Compliance score dropped below 70% for Cohort B.' },
  { severity: 'info', title: 'Task Assigned', message: 'New interview task has been assigned to you.' },
  { severity: 'warning', title: 'Placement Pending', message: 'Placement offer awaiting response for 5 days.' },
];

function Toast({ toast, onDismiss, onView }) {
  const SeverityIcon = SEVERITY_ICONS[toast.severity] || Info;

  return (
    <div
      className={`border-l-4 rounded-lg shadow-lg p-4 max-w-sm w-full animate-slide-in ${
        SEVERITY_COLORS[toast.severity] || SEVERITY_COLORS.info
      }`}
    >
      <div className="flex items-start gap-3">
        <SeverityIcon size={18} className="mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{toast.title}</p>
          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{toast.message}</p>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => onView(toast.id)}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-white/80 text-gray-700 hover:bg-white transition-colors"
            >
              <Eye size={12} />
              View
            </button>
            <button
              onClick={() => onDismiss(toast.id)}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-white/80 text-gray-700 hover:bg-white transition-colors"
            >
              <X size={12} />
              Dismiss
            </button>
          </div>
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Dismiss notification"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

export default function ToastNotifications() {
  const { toastPreferences, updateToastPreferences, toasts, addToast, dismissToast } = useAppContext();
  const [prefs, setPrefs] = useState(toastPreferences);
  const [saved, setSaved] = useState(false);
  const demoCountRef = useRef(0);
  const timersRef = useRef({});

  // Visible toasts respect the max visible setting
  const visibleToasts = toasts.slice(0, prefs.maxVisible);

  // Set up auto-dismiss timers for new toasts
  useEffect(() => {
    toasts.forEach((toast) => {
      if (!timersRef.current[toast.id]) {
        const timer = setTimeout(() => {
          dismissToast(toast.id);
          delete timersRef.current[toast.id];
        }, prefs.duration);
        timersRef.current[toast.id] = timer;
      }
    });

    // Cleanup timers for dismissed toasts
    const activeIds = new Set(toasts.map((t) => t.id));
    Object.keys(timersRef.current).forEach((id) => {
      if (!activeIds.has(id)) {
        clearTimeout(timersRef.current[id]);
        delete timersRef.current[id];
      }
    });
  }, [toasts, prefs.duration, dismissToast]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(clearTimeout);
    };
  }, []);

  const handleDemoTrigger = () => {
    const notification = DEMO_NOTIFICATIONS[demoCountRef.current % DEMO_NOTIFICATIONS.length];
    demoCountRef.current += 1;
    addToast(notification);
  };

  const handleViewToast = useCallback((id) => {
    dismissToast(id);
  }, [dismissToast]);

  const handleSave = () => {
    updateToastPreferences(prefs);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Toast Notifications</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Configure real-time toast popup behavior and try a live demo
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
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Panel */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Settings size={16} />
            Toast Settings
          </h3>

          <div className="border rounded-lg p-4 bg-white space-y-4">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-700">Enable Toast Notifications</label>
              <button
                onClick={() => { setPrefs({ ...prefs, enabled: !prefs.enabled }); setSaved(false); }}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  prefs.enabled ? 'bg-[#5B2D8E]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    prefs.enabled ? 'left-5.5 translate-x-0.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Duration */}
            <div>
              <label className="text-sm text-gray-700 block mb-1">
                Auto-dismiss Duration: <span className="font-semibold">{prefs.duration / 1000}s</span>
              </label>
              <input
                type="range"
                min={2000}
                max={15000}
                step={1000}
                value={prefs.duration}
                onChange={(e) => { setPrefs({ ...prefs, duration: Number(e.target.value) }); setSaved(false); }}
                className="w-full accent-[#5B2D8E]"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>2s</span>
                <span>15s</span>
              </div>
            </div>

            {/* Max Visible */}
            <div>
              <label className="text-sm text-gray-700 block mb-1">
                Max Visible Toasts: <span className="font-semibold">{prefs.maxVisible}</span>
              </label>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={prefs.maxVisible}
                onChange={(e) => { setPrefs({ ...prefs, maxVisible: Number(e.target.value) }); setSaved(false); }}
                className="w-full accent-[#5B2D8E]"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>1</span>
                <span>5</span>
              </div>
            </div>

            {/* Position */}
            <div>
              <label className="text-sm text-gray-700 block mb-1.5">Position</label>
              <div className="grid grid-cols-2 gap-2">
                {['top-right', 'top-left', 'bottom-right', 'bottom-left'].map((pos) => (
                  <button
                    key={pos}
                    onClick={() => { setPrefs({ ...prefs, position: pos }); setSaved(false); }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      prefs.position === pos
                        ? 'border-[#5B2D8E] bg-purple-50 text-[#5B2D8E]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {pos.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Demo Panel */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Play size={16} />
            Live Demo
          </h3>

          <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
            <p className="text-xs text-gray-500">
              Click the button below to trigger demo toasts and see how they appear with your current settings.
            </p>

            <button
              onClick={handleDemoTrigger}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#5B2D8E] text-white hover:bg-[#4a2574] transition-colors"
            >
              <Bell size={16} />
              Trigger Demo Toast
            </button>

            {/* Toast display area */}
            <div className="relative min-h-[280px] border border-dashed border-gray-300 rounded-lg p-4 bg-white overflow-hidden">
              <p className="text-xs text-gray-400 text-center mb-4">Toast Preview Area</p>
              <div className="space-y-2" aria-live="assertive" role="alert">
                {visibleToasts.map((toast) => (
                  <Toast
                    key={toast.id}
                    toast={toast}
                    onDismiss={dismissToast}
                    onView={handleViewToast}
                  />
                ))}
              </div>
              {visibleToasts.length === 0 && (
                <p className="text-xs text-gray-300 text-center mt-8">
                  No active toasts. Click the demo button above.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
