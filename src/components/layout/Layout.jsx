import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 overflow-auto" style={{ marginLeft: 220 }}>
        <Outlet />
      </main>
    </div>
  )
}
