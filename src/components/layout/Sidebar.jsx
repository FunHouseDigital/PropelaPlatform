import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, FolderKanban, Building2, FileText } from 'lucide-react'
import logo from '../../assets/propela-logo-black.svg'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/nurses', label: 'Nurse Database', icon: Users },
  { path: '/cohorts', label: 'Cohort Manager', icon: FolderKanban },
  { path: '/acquisition', label: 'Acquisition Hub', icon: Building2 },
  { path: '/templates', label: 'Template Library', icon: FileText },
]

export default function Sidebar() {
  return (
    <aside
      className="fixed left-0 top-0 h-screen flex flex-col justify-between py-6 px-4"
      style={{
        width: 220,
        background: 'linear-gradient(180deg, #5B2D8E 0%, #3D1D5E 100%)',
      }}
    >
      {/* Logo */}
      <div>
        <div className="mb-8 px-2">
          <img src={logo} alt="Propela" className="h-8 brightness-0 invert" />
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1">
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* User avatar at bottom */}
      <div className="px-2">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/10">
          <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center text-white text-xs font-semibold">
            AY
          </div>
          <div className="text-sm">
            <p className="text-white font-medium leading-tight">Aya Yokwana</p>
            <p className="text-white/60 text-xs">COO</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
