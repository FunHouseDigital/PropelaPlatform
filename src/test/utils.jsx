import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';

/**
 * Custom render that wraps components with application providers.
 * Uses MemoryRouter (instead of BrowserRouter) for testability
 * and AppProvider for global state context.
 */
function customRender(ui, { route = '/', ...options } = {}) {
  function Wrapper({ children }) {
    return (
      <MemoryRouter initialEntries={[route]}>
        <AppProvider>{children}</AppProvider>
      </MemoryRouter>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

// Re-export everything from testing-library
export * from '@testing-library/react';

// Override the default render with our custom one
export { customRender as render };
