import { AlertTriangle } from 'lucide-react';

/**
 * Startup configuration-error screen (Req 7.3).
 *
 * Rendered in place of the main application when one or more required
 * Supabase configuration values are missing or empty. It names each missing
 * variable so an operator can correct the environment configuration. Because
 * it replaces the main application at the entry point, the app is not mounted
 * and no data-layer / database calls are attempted while this screen is shown.
 *
 * @param {{ missing?: string[] }} props - `missing` is the list of required
 *   configuration variable names that are absent or empty.
 */
export default function ConfigError({ missing = [] }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gray-50 px-4"
      role="alert"
      aria-live="assertive"
      data-testid="config-error"
    >
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-4">
          <AlertTriangle className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Configuration error</h1>
        <p className="text-gray-600 mb-6">
          The application cannot start because required configuration values are
          missing. Set the following environment variable
          {missing.length === 1 ? '' : 's'} and reload the page:
        </p>

        <ul className="text-left bg-red-50 rounded-md p-4 mb-6 space-y-2">
          {missing.map((name) => (
            <li key={name} className="flex items-start gap-2 text-sm text-red-800">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
              <code className="font-mono break-all">{name}</code>
            </li>
          ))}
        </ul>

        <p className="text-sm text-gray-500">
          See <code className="font-mono">.env.example</code> for the full list of
          required configuration values.
        </p>
      </div>
    </div>
  );
}
