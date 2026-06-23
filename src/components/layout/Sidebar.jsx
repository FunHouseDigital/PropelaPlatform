import { NavLink, useLocation } from 'react-router-dom';
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
  X,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/nurses', label: 'Nurse Database', icon: Users },
  { path: '/acquisition', label: 'Acquisition Hub', icon: Building2 },
  { path: '/cohorts', label: 'Cohort Manager', icon: GraduationCap },
  { path: '/outreach', label: 'Outreach Log', icon: Mail },
  { path: '/placements', label: 'Placements', icon: Briefcase },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/reports', label: 'Reports', icon: ClipboardList },
  { path: '/documents', label: 'Documents', icon: FileText },
  { path: '/communications', label: 'Communications', icon: MessageSquare },
  { path: '/integrations', label: 'Integrations', icon: Puzzle },
  { path: '/audit', label: 'Audit Trail', icon: Shield },
  { path: '/automations', label: 'Automations', icon: Zap },
  { path: '/notifications', label: 'Notifications', icon: Bell },
  { path: '/help', label: 'Help', icon: HelpCircle },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ isOpen, onClose, isMobile }) {
  const location = useLocation();
  const { notifications, notificationAlerts } = useAppContext();
  const unreadCount = notifications.filter((n) => !n.read).length;
  const notifUnreadCount = notificationAlerts.filter((n) => !n.read).length;

  const sidebarClasses = isMobile
    ? `fixed left-0 top-0 h-screen w-[220px] flex flex-col z-50 transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`
    : 'fixed left-0 top-0 h-screen w-[220px] flex flex-col';

  return (
    <aside
      className={sidebarClasses}
      style={{
        background: 'linear-gradient(180deg, #5B2D8E 0%, #3D1D5E 100%)',
      }}
    >
      {/* Logo and Close Button */}
      <div className="px-5 pt-6 pb-2 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold text-sm">
              P
            </span>
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
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={isMobile ? onClose : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-lg mb-1 text-sm font-medium transition-all duration-150
                ${isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/8 hover:text-white'
                }`}
            >
              <Icon size={20} strokeWidth={1.8} />
              <span>{item.label}</span>
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
            A
          </div>
          <div>
            <p className="text-white text-[13px] font-semibold leading-tight">Aya</p>
            <p className="text-white/60 text-[11px]">Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
