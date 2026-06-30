import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Briefcase, Bell, Menu } from 'lucide-react';

import { usePermissions } from '../../hooks/usePermissions';
import { ROUTE_PERMISSIONS } from '../../lib/permissions';

const BOTTOM_NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/nurses', label: 'Nurses', icon: Users },
  { path: '/placements', label: 'Placements', icon: Briefcase },
  { path: '/notifications', label: 'Alerts', icon: Bell },
];

export default function MobileBottomNav({ onOpenSidebar }) {
  const { can } = usePermissions();
  const visibleItems = BOTTOM_NAV_ITEMS.filter((item) => can(ROUTE_PERMISSIONS[item.path]));

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 z-40 bg-white border-t border-gray-200 flex items-center justify-around md:hidden">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center min-h-[44px] min-w-[44px] px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'text-propela-purple'
                  : 'text-gray-500 hover:text-gray-700'
              }`
            }
          >
            <Icon size={20} strokeWidth={1.8} />
            <span className="mt-0.5">{item.label}</span>
          </NavLink>
        );
      })}
      <button
        type="button"
        onClick={onOpenSidebar}
        className="flex flex-col items-center justify-center min-h-[44px] min-w-[44px] px-2 py-1 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
      >
        <Menu size={20} strokeWidth={1.8} />
        <span className="mt-0.5">More</span>
      </button>
    </nav>
  );
}
