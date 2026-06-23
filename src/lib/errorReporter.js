/**
 * Structured error reporting module.
 *
 * Provides centralized error capture with breadcrumbs and classification.
 * Designed so replacing console logging with Sentry/DataDog is a single-line change
 * in the `transport` function.
 */

const MAX_BREADCRUMBS = 20;

let breadcrumbs = [];

/**
 * Internal transport function. Replace this single function body
 * with Sentry.captureException / DataDog.addError for production APM.
 */
function transport(payload) {
  // eslint-disable-next-line no-console
  console.error('[ErrorReporter]', JSON.stringify(payload, null, 2));
}

/**
 * Add a breadcrumb to the trail (last 20 interactions).
 * @param {string} category - e.g. 'navigation', 'click', 'api'
 * @param {string} message - Description of the interaction
 * @param {Object} [data] - Optional extra data
 */
export function addBreadcrumb(category, message, data = null) {
  const crumb = {
    category,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
  breadcrumbs = [...breadcrumbs.slice(-(MAX_BREADCRUMBS - 1)), crumb];
}

/**
 * Get current breadcrumb trail (for testing/inspection).
 */
export function getBreadcrumbs() {
  return [...breadcrumbs];
}

/**
 * Clear all breadcrumbs (useful for testing).
 */
export function clearBreadcrumbs() {
  breadcrumbs = [];
}

/**
 * Classify a network error into a known category.
 * @param {Error} error - The error to classify
 * @returns {string} One of: 'timeout', 'server_error', 'auth_error', 'connectivity', 'unknown'
 */
export function classifyNetworkError(error) {
  if (!error) return 'unknown';

  const message = (error.message || '').toLowerCase();
  const status = error.status || error.statusCode;

  if (message.includes('timeout') || message.includes('timed out') || message.includes('aborted')) {
    return 'timeout';
  }
  if (status === 401 || status === 403) {
    return 'auth_error';
  }
  if (status >= 500) {
    return 'server_error';
  }
  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('failed to fetch') ||
    message.includes('networkerror')
  ) {
    return 'connectivity';
  }
  return 'unknown';
}

/**
 * Capture an exception with structured context.
 * @param {Error} error - The error object
 * @param {Object} [context] - Additional context
 * @param {string} [context.component] - Component name where error occurred
 * @param {string} [context.userAction] - What the user was doing
 * @param {string} [context.severity] - 'fatal' | 'error' | 'warning'
 */
export function captureException(error, context = {}) {
  const payload = {
    type: 'exception',
    severity: context.severity || 'error',
    timestamp: new Date().toISOString(),
    message: error?.message || String(error),
    stack: error?.stack || null,
    component: context.component || null,
    userAction: context.userAction || null,
    networkCategory: classifyNetworkError(error),
    breadcrumbs: getBreadcrumbs(),
    extra: context.extra || null,
  };

  transport(payload);
  return payload;
}

/**
 * Capture a non-error message event.
 * @param {string} message - The message
 * @param {'info'|'warning'|'error'|'debug'} [level] - Severity level
 * @param {Object} [extra] - Additional data
 */
export function captureMessage(message, level = 'info', extra = null) {
  const payload = {
    type: 'message',
    level,
    timestamp: new Date().toISOString(),
    message,
    breadcrumbs: getBreadcrumbs(),
    extra,
  };

  transport(payload);
  return payload;
}
