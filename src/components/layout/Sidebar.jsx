import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Users,
  Building2,
  GraduationCap,
  Mail,
  Briefcase,
  BarChart3,
  ClipboardList,
  FileText,
  MessageSquare,
  Puzzle,
  Shield,
  Zap,
  Bell,
  HelpCircle,
  Settings,
  LogOut,
  X,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { ROUTE_PERMISSIONS } from '../../lib/permissions';

const NAV_ITEMS = [
  { path: '/', labelKey: 'navigation.dashboard', icon: LayoutDashboard },
  { path: '/nurses', labelKey: 'navigation.nurseDatabase', icon: Users },
  { path: '/acquisition', labelKey: 'navigation.acquisitionHub', icon: Building2 },
  { path: '/cohorts', labelKey: 'navigation.cohortManager', icon: GraduationCap },
  { path: '/outreach', labelKey: 'navigation.outreachLog', icon: Mail },
  { path: '/placements', labelKey: 'navigation.placements', icon: Briefcase },
  { path: '/analytics', labelKey: 'navigation.analytics', icon: BarChart3 },
  { path: '/reports', labelKey: 'navigation.reports', icon: ClipboardList },
  { path: '/documents', labelKey: 'navigation.documents', icon: FileText },
  { path: '/communications', labelKey: 'navigation.communications', icon: MessageSquare },
  { path: '/integrations', labelKey: 'navigation.integrations', icon: Puzzle },
  { path: '/audit', labelKey: 'navigation.auditTrail', icon: Shield },
  { path: '/automations', labelKey: 'navigation.automations', icon: Zap },
  { path: '/notifications', labelKey: 'navigation.notifications', icon: Bell },
  { path: '/help', labelKey: 'navigation.help', icon: HelpCircle },
  { path: '/settings', labelKey: 'navigation.settings', icon: Settings },
];

export default function Sidebar({ isOpen, onClose, isMobile }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { notifications, notificationAlerts } = useAppContext();
  const { can } = usePermissions();
  const { currentUser, logout } = useAuth();
  const unreadCount = notifications.filter((n) => !n.read).length;
  const notifUnreadCount = notificationAlerts.filter((n) => !n.read).length;

  // Only show nav items the current user is permitted to access. Items mapped to
  // a null permission (e.g. Help, Notifications) are always shown.
  const visibleNavItems = NAV_ITEMS.filter((item) => can(ROUTE_PERMISSIONS[item.path]));

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const userInitial = (currentUser?.name || 'U').trim().charAt(0).toUpperCase();

  const sidebarClasses = isMobile
    ? `fixed start-0 top-0 h-screen w-[220px] flex flex-col z-50 transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`
    : 'fixed start-0 top-0 h-screen w-[220px] flex flex-col';

  return (
    <aside
      className={sidebarClasses}
      role="navigation"
      aria-label="Main navigation"
      style={{
        background: 'linear-gradient(180deg, #5B2D8E 0%, #3D1D5E 100%)',
      }}
    >
      {/* Logo and Close Button */}
      <div className="px-5 pt-6 pb-2 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <img
              src="/logo.svg"
              alt="Propela logo"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="text-white font-semibold text-lg tracking-tight">
              propela
            </span>
          </div>
          <p className="text-white/50 text-[11px] mt-1 ml-10">Ops</p>
        </div>
        {isMobile && (
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-white/70 hover:text-white transition-colors rounded-lg"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 mt-6 px-3 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={isMobile ? onClose : undefined}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-lg mb-1 text-sm font-medium transition-all duration-150
                ${isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/8 hover:text-white'
                }`}
            >
              <Icon size={20} strokeWidth={1.8} />
              <span>{t(item.labelKey)}</span>
              {item.path === '/communications' && unreadCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
              {item.path === '/notifications' && notifUnreadCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {notifUnreadCount > 99 ? '99+' : notifUnreadCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Avatar */}
      <div className="px-4 pb-5 mt-auto">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
            {userInitial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-[13px] font-semibold leading-tight truncate">
              {currentUser?.name || 'Unknown user'}
            </p>
            <p className="text-white/60 text-[11px] truncate">{currentUser?.role || ''}</p>
          </div>
          {currentUser && (
            <button
              type="button"
              onClick={handleLogout}
              title="Sign out"
              aria-label="Sign out"
              className="min-h-[36px] min-w-[36px] flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors rounded-lg"
            >
              <LogOut size={18} strokeWidth={1.8} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
