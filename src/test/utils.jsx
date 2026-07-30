import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { AuthProvider } from '../context/AuthContext';

/**
 * Custom render that wraps components with application providers.
 * Uses MemoryRouter (instead of BrowserRouter) for testability,
 * AppProvider for global state, and AuthProvider for the auth/permission layer.
 * With no persisted session the user is signed out, and usePermissions is
 * permissive by default so existing component/navigation tests are unaffected.
 */
function customRender(ui, { route = '/', ...options } = {}) {
  function Wrapper({ children }) {
    return (
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>
          <AppProvider>{children}</AppProvider>
        </AuthProvider>
      </MemoryRouter>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

// Re-export everything from testing-library
export * from '@testing-library/react';

// Override the default render with our custom one
export { customRender as render };
