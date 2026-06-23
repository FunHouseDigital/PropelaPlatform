import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';

/**
 * Format a date using Intl.DateTimeFormat.
 * @param {Date|string|number} date - The date to format
 * @param {string} locale - The locale string (e.g. 'en', 'es')
 * @param {Intl.DateTimeFormatOptions} [options] - Formatting options
 * @returns {string} The formatted date string
 */
export function formatDate(date, locale = 'en', options = {}) {
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  };
  return new Intl.DateTimeFormat(locale, defaultOptions).format(new Date(date));
}

/**
 * Format a number using Intl.NumberFormat.
 * @param {number} number - The number to format
 * @param {string} locale - The locale string (e.g. 'en', 'es')
 * @param {Intl.NumberFormatOptions} [options] - Formatting options
 * @returns {string} The formatted number string
 */
export function formatNumber(number, locale = 'en', options = {}) {
  return new Intl.NumberFormat(locale, options).format(number);
}

/**
 * Format currency using Intl.NumberFormat with style 'currency'.
 * @param {number} amount - The amount to format
 * @param {string} currency - The currency code (e.g. 'USD', 'EUR')
 * @param {string} locale - The locale string (e.g. 'en', 'es')
 * @returns {string} The formatted currency string
 */
export function formatCurrency(amount, currency = 'USD', locale = 'en') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Hook that returns locale-aware formatting utilities bound to the current i18n language.
 * @returns {{ formatDate: Function, formatNumber: Function, formatCurrency: Function }}
 */
export function useLocaleFormatters() {
  const { i18n } = useTranslation();
  const language = i18n.language;

  return useMemo(
    () => ({
      formatDate: (date, options) => formatDate(date, language, options),
      formatNumber: (number, options) => formatNumber(number, language, options),
      formatCurrency: (amount, currency) => formatCurrency(amount, currency, language),
    }),
    [language],
  );
}
