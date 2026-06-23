import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  captureException,
  captureMessage,
  addBreadcrumb,
  getBreadcrumbs,
  clearBreadcrumbs,
  classifyNetworkError,
} from '../errorReporter';

describe('errorReporter', () => {
  beforeEach(() => {
    clearBreadcrumbs();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('captureException', () => {
    it('logs structured error data to console', () => {
      const error = new Error('Something broke');
      const result = captureException(error, {
        component: 'TestComponent',
        severity: 'fatal',
      });

      expect(result).toMatchObject({
        type: 'exception',
        severity: 'fatal',
        message: 'Something broke',
        component: 'TestComponent',
      });
      expect(result.timestamp).toBeDefined();
      expect(result.stack).toBeDefined();
      expect(console.error).toHaveBeenCalled();
    });

    it('defaults severity to error when not specified', () => {
      const error = new Error('Default severity');
      const result = captureException(error);

      expect(result.severity).toBe('error');
    });

    it('includes breadcrumbs in the payload', () => {
      addBreadcrumb('click', 'User clicked button');
      addBreadcrumb('navigation', 'Navigated to /settings');

      const error = new Error('After breadcrumbs');
      const result = captureException(error);

      expect(result.breadcrumbs).toHaveLength(2);
      expect(result.breadcrumbs[0].category).toBe('click');
      expect(result.breadcrumbs[1].category).toBe('navigation');
    });

    it('handles non-Error objects gracefully', () => {
      const result = captureException('string error');
      expect(result.message).toBe('string error');
      expect(result.stack).toBeNull();
    });
  });

  describe('captureMessage', () => {
    it('logs a message at info level by default', () => {
      const result = captureMessage('User logged in');

      expect(result).toMatchObject({
        type: 'message',
        level: 'info',
        message: 'User logged in',
      });
      expect(console.error).toHaveBeenCalled();
    });

    it('supports different severity levels', () => {
      const warning = captureMessage('Slow response', 'warning');
      expect(warning.level).toBe('warning');

      const debug = captureMessage('Debug info', 'debug');
      expect(debug.level).toBe('debug');

      const errorMsg = captureMessage('Error message', 'error');
      expect(errorMsg.level).toBe('error');
    });

    it('includes extra data when provided', () => {
      const result = captureMessage('Custom event', 'info', { userId: '123' });
      expect(result.extra).toEqual({ userId: '123' });
    });
  });

  describe('breadcrumbs', () => {
    it('maintains a trail of breadcrumbs', () => {
      addBreadcrumb('click', 'Clicked save');
      addBreadcrumb('api', 'POST /api/data');
      addBreadcrumb('navigation', 'Went to /dashboard');

      const crumbs = getBreadcrumbs();
      expect(crumbs).toHaveLength(3);
      expect(crumbs[0].message).toBe('Clicked save');
      expect(crumbs[2].message).toBe('Went to /dashboard');
    });

    it('limits breadcrumbs to max 20 entries', () => {
      for (let i = 0; i < 25; i++) {
        addBreadcrumb('test', `Crumb ${i}`);
      }

      const crumbs = getBreadcrumbs();
      expect(crumbs).toHaveLength(20);
      // Should keep the most recent ones
      expect(crumbs[0].message).toBe('Crumb 5');
      expect(crumbs[19].message).toBe('Crumb 24');
    });

    it('clearBreadcrumbs resets the trail', () => {
      addBreadcrumb('test', 'Some crumb');
      expect(getBreadcrumbs()).toHaveLength(1);

      clearBreadcrumbs();
      expect(getBreadcrumbs()).toHaveLength(0);
    });

    it('each breadcrumb has a timestamp', () => {
      addBreadcrumb('click', 'Clicked button');
      const crumbs = getBreadcrumbs();
      expect(crumbs[0].timestamp).toBeDefined();
      expect(new Date(crumbs[0].timestamp).getTime()).not.toBeNaN();
    });
  });

  describe('classifyNetworkError', () => {
    it('classifies timeout errors', () => {
      const error = new Error('Request timed out');
      expect(classifyNetworkError(error)).toBe('timeout');
    });

    it('classifies aborted requests as timeout', () => {
      const error = new Error('The operation was aborted');
      expect(classifyNetworkError(error)).toBe('timeout');
    });

    it('classifies 401/403 as auth errors', () => {
      const error401 = Object.assign(new Error('Unauthorized'), { status: 401 });
      expect(classifyNetworkError(error401)).toBe('auth_error');

      const error403 = Object.assign(new Error('Forbidden'), { status: 403 });
      expect(classifyNetworkError(error403)).toBe('auth_error');
    });

    it('classifies 5xx as server errors', () => {
      const error500 = Object.assign(new Error('Internal Server Error'), { status: 500 });
      expect(classifyNetworkError(error500)).toBe('server_error');

      const error503 = Object.assign(new Error('Service Unavailable'), { status: 503 });
      expect(classifyNetworkError(error503)).toBe('server_error');
    });

    it('classifies fetch failures as connectivity errors', () => {
      const error = new Error('Failed to fetch');
      expect(classifyNetworkError(error)).toBe('connectivity');
    });

    it('returns unknown for unclassifiable errors', () => {
      const error = new Error('Something random happened');
      expect(classifyNetworkError(error)).toBe('unknown');
    });

    it('returns unknown for null/undefined', () => {
      expect(classifyNetworkError(null)).toBe('unknown');
      expect(classifyNetworkError(undefined)).toBe('unknown');
    });
  });
});
