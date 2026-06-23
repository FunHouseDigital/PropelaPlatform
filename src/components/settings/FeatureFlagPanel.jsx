import { useEffect, useState } from 'react';
import { Flag, ToggleLeft, ToggleRight } from 'lucide-react';

import { isDevelopment } from '../../lib/config';
import {
  FEATURE_FLAGS,
  getFeatureFlags,
  setLocalStorageOverrides,
} from '../../lib/featureFlags';

const FLAG_DESCRIPTIONS = {
  [FEATURE_FLAGS.ENHANCED_ANALYTICS]: 'Advanced analytics dashboards with detailed breakdowns',
  [FEATURE_FLAGS.WORKFLOW_AUTOMATION_V2]: 'Next-generation workflow automation engine',
  [FEATURE_FLAGS.DARK_MODE]: 'Dark color theme for reduced eye strain',
  [FEATURE_FLAGS.AI_SUGGESTIONS]: 'AI-powered suggestions for candidate matching',
};

/**
 * Developer/admin panel for toggling feature flags.
 * Only shown when in development mode or activated via secret key combo (Ctrl+Shift+F).
 */
export default function FeatureFlagPanel() {
  const [visible, setVisible] = useState(isDevelopment);
  const [flags, setFlags] = useState(getFeatureFlags);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        setVisible((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggle = (flagName) => {
    const updated = { ...flags, [flagName]: !flags[flagName] };
    setFlags(updated);
    setLocalStorageOverrides(updated);
  };

  if (!visible) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Flag size={20} className="text-[#5B2D8E]" />
        Feature Flags
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        Toggle feature flags for development and testing. Changes are saved to localStorage.
        A page refresh is required for changes to take effect throughout the application.
      </p>
      <div className="space-y-3">
        {Object.values(FEATURE_FLAGS).map((flagName) => (
          <div
            key={flagName}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div>
              <p className="text-sm font-medium text-gray-700">{flagName}</p>
              <p className="text-xs text-gray-500">
                {FLAG_DESCRIPTIONS[flagName] || 'No description available'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={flags[flagName]}
              aria-label={`Toggle ${flagName}`}
              onClick={() => handleToggle(flagName)}
              className="focus:outline-none focus:ring-2 focus:ring-[#5B2D8E] rounded"
            >
              {flags[flagName] ? (
                <ToggleRight size={28} className="text-[#5B2D8E]" />
              ) : (
                <ToggleLeft size={28} className="text-gray-400" />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
