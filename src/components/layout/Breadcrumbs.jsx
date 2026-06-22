import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

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

// Entity route patterns where the second segment is an entity ID
const ENTITY_ROUTES = ['nurses', 'placements', 'documents', 'cohorts'];

export default function Breadcrumbs() {
  const location = useLocation();
  const { nurses, placements, documents, cohorts } = useAppContext();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  /**
   * Resolve an entity name from AppContext given the parent route and entity ID.
   * Falls back to a title-cased version of the segment if not found.
   */
  function resolveEntityName(parentSegment, id) {
    if (parentSegment === 'nurses') {
      const nurse = nurses.find((n) => n.id === id);
      if (nurse) return nurse.name || `${nurse.firstName || ''} ${nurse.lastName || ''}`.trim() || id;
    } else if (parentSegment === 'placements') {
      const placement = placements.find((p) => p.id === id);
      if (placement) {
        const nurseName = placement.nurseName || placement.nurse || '';
        const facilityName = placement.facilityName || placement.facility || '';
        return nurseName && facilityName ? `${nurseName} at ${facilityName}` : nurseName || facilityName || id;
      }
    } else if (parentSegment === 'documents') {
      const doc = documents.find((d) => d.id === id);
      if (doc) return doc.name || doc.title || id;
    } else if (parentSegment === 'cohorts') {
      const cohort = cohorts.find((c) => c.id === id);
      if (cohort) return cohort.name || id;
    }
    return id.charAt(0).toUpperCase() + id.slice(1);
  }

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
        const parentSegment = index > 0 ? pathSegments[index - 1] : null;

        // Resolve label: use static map first, then entity lookup for sub-routes
        let label;
        if (ROUTE_LABELS[segment]) {
          label = ROUTE_LABELS[segment];
        } else if (parentSegment && ENTITY_ROUTES.includes(parentSegment)) {
          label = resolveEntityName(parentSegment, segment);
        } else {
          label = segment.charAt(0).toUpperCase() + segment.slice(1);
        }

        return (
          <span key={path} className="flex items-center gap-1.5">
            <ChevronRight size={12} className="text-gray-300" />
            {isLast ? (
              <span className="text-gray-700 font-medium truncate max-w-[200px]">{label}</span>
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
