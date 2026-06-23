import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Save, Eye, Monitor, Type } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';

const FONT_SIZES = [
  { id: 'small', label: 'Small', description: '14px base' },
  { id: 'medium', label: 'Medium', description: '16px base (default)' },
  { id: 'large', label: 'Large', description: '18px base' },
];

export default function AccessibilitySettings() {
  const { settings, updateSettings } = useAppContext();
  const accessibility = settings.accessibility || {};
  const [form, setForm] = useState({
    highContrast: accessibility.highContrast || false,
    reducedMotion: accessibility.reducedMotion || false,
    fontSize: accessibility.fontSize || 'medium',
  });
  const [saved, setSaved] = useState(false);

  const handleToggle = (field) => {
    setForm((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleFontSize = (size) => {
    setForm((prev) => ({ ...prev, fontSize: size }));
  };

  const handleSave = () => {
    const updated = {
      ...settings,
      accessibility: { ...form },
    };
    updateSettings(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* High Contrast Mode */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Eye size={20} className="text-[#5B2D8E]" />
          High Contrast Mode
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Increase color contrast for better readability. This applies WCAG AAA-compliant contrast
          ratios, thicker borders, and enhanced focus indicators throughout the interface.
        </p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Enable High Contrast</p>
            <p className="text-xs text-gray-500">Enhances visibility of text, borders, and controls</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.highContrast}
            onClick={() => handleToggle('highContrast')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              form.highContrast ? 'bg-[#5B2D8E]' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                form.highContrast ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Reduced Motion */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Monitor size={20} className="text-[#5B2D8E]" />
          Motion Preferences
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Reduce or disable animations and transitions for users who are sensitive to motion.
        </p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Reduce Motion</p>
            <p className="text-xs text-gray-500">Disables animations and smooth transitions</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.reducedMotion}
            onClick={() => handleToggle('reducedMotion')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              form.reducedMotion ? 'bg-[#5B2D8E]' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                form.reducedMotion ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Font Size */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Type size={20} className="text-[#5B2D8E]" />
          Font Size
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Adjust the base font size across the application for improved readability.
        </p>
        <div className="flex gap-3">
          {FONT_SIZES.map((size) => (
            <button
              key={size.id}
              onClick={() => handleFontSize(size.id)}
              className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium border transition-all text-center ${
                form.fontSize === size.id
                  ? 'border-[#5B2D8E] bg-[#5B2D8E]/5 text-[#5B2D8E]'
                  : 'border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
            >
              <div className="font-medium">{size.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{size.description}</div>
            </button>
          ))}
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

      {/* Language & Region */}
      <LanguageSwitcher />
    </div>
  );
}
