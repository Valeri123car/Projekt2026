import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const navItems = [
  { path: '/',           icon: 'dashboard',      label: 'Nadzorna plošča', vloge: [2, 3] },
  { path: '/voznje',     icon: 'directions_car', label: 'Vožnje',           vloge: [1, 2, 3] },
  { path: '/vozniki',    icon: 'group',          label: 'Vozniki',          vloge: [2, 3] },
  { path: '/racuni',     icon: 'receipt_long',   label: 'Računi',           vloge: [2, 3] },
  { path: '/prevozi',    icon: 'add_road',       label: 'Prevozi',          vloge: [2, 3] },
  { path: '/audit',      icon: 'history',        label: 'Dnevnik revizije', vloge: [2] },
  { path: '/uporabniki', icon: 'patient_list',   label: 'Uporabniki',       vloge: [2] },
  { path: '/vozila',     icon: 'directions_bus', label: 'Vozila',           vloge: [2] },
]

export default function Sidebar() {
  const { pathname } = useLocation()
  const { handleLogout, vloga } = useAuth()

  return (
    <aside className="bg-surface-container w-72 h-screen fixed left-0 top-0 border-r border-outline-variant flex flex-col py-6 px-4 z-50">
      <div className="mb-8 px-2">
        <h1 className="text-2xl font-bold text-primary">Sirena d.o.o.</h1>
        <p className="text-sm text-on-surface-variant">Logistični portal</p>
      </div>
      <nav className="flex-1 space-y-1">
        {navItems.filter(item => item.vloge.includes(vloga)).map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-4 p-3 rounded-xl transition-colors duration-200 ${
              pathname === item.path
                ? 'text-primary border-r-4 border-primary bg-primary/10 font-bold'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="mt-auto border-t border-outline-variant pt-4 space-y-1">
        <Link to="/nastavitve" className="flex items-center gap-4 p-3 rounded-xl text-on-surface-variant hover:bg-surface-variant transition-colors">
          <span className="material-symbols-outlined">settings</span>
          <span>Nastavitve</span>
        </Link>
        <button onClick={handleLogout} className="w-full flex items-center gap-4 p-3 rounded-xl text-on-surface-variant hover:bg-surface-variant transition-colors">
          <span className="material-symbols-outlined">logout</span>
          <span>Odjava</span>
        </button>
      </div>
    </aside>
  )
}