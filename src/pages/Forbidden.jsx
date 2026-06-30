import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

import { useAuth } from '../context/AuthContext';

/**
 * 403 / Access Denied page.
 *
 * Shown when a signed-in user navigates (or force-types a URL) to a module they
 * do not have permission for, so they get a clear explanation instead of a
 * blank screen. Rendered inside the app Layout, so the sidebar/header remain.
 */
export default function Forbidden() {
  const { currentUser } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-5">
        <ShieldAlert size={32} className="text-red-600" aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Access denied</h1>
      <p className="text-gray-600 max-w-md mb-1">
        You don&apos;t have permission to view this page.
      </p>
      <p className="text-gray-500 text-sm max-w-md mb-6">
        {currentUser
          ? `Your role (${currentUser.role}) doesn't include access to this module. Contact an administrator if you believe this is a mistake.`
          : 'Please sign in with an account that has the required permissions.'}
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#5B2D8E] text-white rounded-lg text-sm font-medium hover:bg-[#4a2574] transition-colors"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
