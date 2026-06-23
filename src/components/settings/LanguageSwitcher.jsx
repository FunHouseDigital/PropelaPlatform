import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../context/AppContext';
import { Globe } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', name: 'English', dir: 'ltr' },
  { code: 'es', name: 'Espa\u00f1ol', dir: 'ltr' },
];

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const { settings, updateSettings } = useAppContext();
  const currentLang = i18n.language?.split('-')[0] || 'en';

  const handleLanguageChange = (langCode) => {
    const lang = LANGUAGES.find((l) => l.code === langCode);
    if (!lang) return;

    i18n.changeLanguage(langCode);

    // Update html lang and dir attributes
    document.documentElement.setAttribute('lang', langCode);
    document.documentElement.setAttribute('dir', lang.dir);

    // Persist in settings
    updateSettings({
      ...settings,
      language: langCode,
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Globe size={20} className="text-[#5B2D8E]" />
        {t('settings.language.title')}
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        {t('settings.language.description')}
      </p>
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          {t('settings.language.selectLanguage')}
        </label>
        <div className="flex gap-3">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium border transition-all text-center ${
                currentLang === lang.code
                  ? 'border-[#5B2D8E] bg-[#5B2D8E]/5 text-[#5B2D8E]'
                  : 'border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
              aria-pressed={currentLang === lang.code}
            >
              {lang.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
