import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const ROUTE_LABELS = {
  '': 'Dashboard',
  nurses: 'Nurses',
  acquisition: 'Acquisition Hub',
  cohorts: 'Cohorts',
  outreach: 'Outreach',
  placements: 'Placements',
  analytics: 'Analytics',
  documents: 'Documents',
  communications: 'Communications',
  reports: 'Reports',
  integrations: 'Integrations',
  audit: 'Audit Trail',
  settings: 'Settings',
};

export default function Breadcrumbs() {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  if (pathSegments.length === 0) {
    return (
      <nav className="flex items-center gap-1.5 text-sm">
        <Home size={14} className="text-gray-400" />
        <span className="text-gray-700 font-medium">Dashboard</span>
      </nav>
    );
  }

  return (
    <nav className="flex items-center gap-1.5 text-sm">
      <Link to="/" className="text-gray-400 hover:text-gray-600 transition-colors">
        <Home size={14} />
      </Link>

      {pathSegments.map((segment, index) => {
        const path = '/' + pathSegments.slice(0, index + 1).join('/');
        const isLast = index === pathSegments.length - 1;
        const label = ROUTE_LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

        return (
          <span key={path} className="flex items-center gap-1.5">
            <ChevronRight size={12} className="text-gray-300" />
            {isLast ? (
              <span className="text-gray-700 font-medium">{label}</span>
            ) : (
              <Link to={path} className="text-gray-400 hover:text-gray-600 transition-colors">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
