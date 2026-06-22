import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Save, Upload } from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function OrganizationSettings() {
  const { settings, updateSettings } = useAppContext();
  const [form, setForm] = useState({ ...settings.organization });
  const [saved, setSaved] = useState(false);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleBrandingChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      branding: { ...prev.branding, [field]: value },
    }));
  };

  const handleSave = () => {
    const updated = { ...settings, organization: form };
    updateSettings(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Company Profile */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Profile</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
            <input
              type="email"
              value={form.contactEmail}
              onChange={(e) => handleChange('contactEmail', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="text"
              value={form.contactPhone}
              onChange={(e) => handleChange('contactPhone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => handleChange('address', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
            />
          </div>
        </div>

        {/* Logo Upload Placeholder */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#5B2D8E]/40 transition-colors cursor-pointer">
            <Upload size={24} className="mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">Click to upload or drag and drop</p>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG, SVG up to 2MB</p>
          </div>
        </div>
      </div>

      {/* Currency & Fiscal Year */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Regional Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Currency</label>
            <select
              value={form.defaultCurrency}
              onChange={(e) => handleChange('defaultCurrency', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
            >
              <option value="ZAR">ZAR - South African Rand</option>
              <option value="GBP">GBP - British Pound</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fiscal Year Start</label>
            <select
              value={form.fiscalYearStart}
              onChange={(e) => handleChange('fiscalYearStart', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
            >
              {MONTHS.map((month) => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Branding */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Branding</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.branding.primaryColor}
                onChange={(e) => handleBrandingChange('primaryColor', e.target.value)}
                className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={form.branding.primaryColor}
                onChange={(e) => handleBrandingChange('primaryColor', e.target.value)}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
            <div className="flex gap-3 mt-1">
              <button
                onClick={() => handleBrandingChange('theme', 'light')}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                  form.branding.theme === 'light'
                    ? 'border-[#5B2D8E] bg-[#5B2D8E]/5 text-[#5B2D8E]'
                    : 'border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
              >
                Light
              </button>
              <button
                onClick={() => handleBrandingChange('theme', 'dark')}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                  form.branding.theme === 'dark'
                    ? 'border-[#5B2D8E] bg-[#5B2D8E]/5 text-[#5B2D8E]'
                    : 'border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
              >
                Dark
              </button>
            </div>
          </div>
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
