import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

// Mock the errorReporter module
vi.mock('../../../lib/errorReporter', () => ({
  captureException: vi.fn(),
}));

// Mock the config module to control isDevelopment
vi.mock('../../../lib/config', () => ({
  isDevelopment: true,
}));

// A component that throws an error on demand
function ThrowingComponent({ shouldThrow }) {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>Normal content</div>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress React error boundary console output in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children normally when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('shows fallback UI when a child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go to home/i })).toBeInTheDocument();
  });

  it('shows error details toggle in development mode', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    const detailsButton = screen.getByRole('button', { name: /error details/i });
    expect(detailsButton).toBeInTheDocument();

    // Click to expand
    fireEvent.click(detailsButton);
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('reload button calls window.location.reload', () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: reloadMock, href: '' },
      writable: true,
    });

    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByRole('button', { name: /reload page/i }));
    expect(reloadMock).toHaveBeenCalled();
  });

  it('shows try again button for recoverable errors', () => {
    render(
      <ErrorBoundary severity="recoverable">
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('reports error to errorReporter.captureException', async () => {
    const { captureException } = await import('../../../lib/errorReporter');

    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        component: 'ErrorBoundary',
        severity: 'fatal',
      })
    );
  });
});
