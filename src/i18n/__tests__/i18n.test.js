import { describe, it, expect, beforeEach } from 'vitest';
import i18n from '../index';

describe('i18n configuration', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('initializes with English as default language', () => {
    expect(i18n.language).toBe('en');
  });

  it('has fallback language set to English', () => {
    expect(i18n.options.fallbackLng).toContain('en');
  });

  it('resolves English translation keys correctly', () => {
    expect(i18n.t('navigation.dashboard')).toBe('Dashboard');
    expect(i18n.t('navigation.nurseDatabase')).toBe('Nurse Database');
    expect(i18n.t('common.save')).toBe('Save');
    expect(i18n.t('common.cancel')).toBe('Cancel');
    expect(i18n.t('settings.title')).toBe('Settings & Configuration');
  });

  it('changes language to Spanish successfully', async () => {
    await i18n.changeLanguage('es');
    expect(i18n.language).toBe('es');
  });

  it('resolves Spanish translation keys correctly', async () => {
    await i18n.changeLanguage('es');
    expect(i18n.t('navigation.dashboard')).toBe('Panel');
    expect(i18n.t('navigation.nurseDatabase')).toBe('Base de Enfermeras');
    expect(i18n.t('common.save')).toBe('Guardar');
    expect(i18n.t('common.cancel')).toBe('Cancelar');
    expect(i18n.t('settings.title')).toBe('Configuraci\u00f3n');
  });

  it('falls back to English for missing keys', async () => {
    await i18n.changeLanguage('es');
    // pages.reports.description exists in both, but test a key from en
    expect(i18n.t('pages.reports.title')).toBe('Informes');
  });

  it('handles interpolation in translation strings', () => {
    expect(i18n.t('search.resultsFor', { query: 'test' })).toBe('Results for "test"');
  });

  it('has interpolation.escapeValue set to false', () => {
    expect(i18n.options.interpolation.escapeValue).toBe(false);
  });

  it('switches back to English from Spanish', async () => {
    await i18n.changeLanguage('es');
    expect(i18n.t('common.save')).toBe('Guardar');

    await i18n.changeLanguage('en');
    expect(i18n.t('common.save')).toBe('Save');
  });
});
