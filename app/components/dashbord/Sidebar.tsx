'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { LayoutDashboard, Network, Settings, LogOut } from 'lucide-react'

const items = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/dashboard/networks',
    label: 'Networks',
    icon: Network,
  },
  {
    href: '/dashboard/settings',
    label: 'Settings',
    icon: Settings,
  },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-emerald-400">SculWave</h1>

        <p className="text-xs text-slate-400 mt-1">Spatial Voice Platform</p>
      </div>

      <nav className="flex-1 px-3">
        {items.map((item) => {
          const Icon = item.icon

          const active = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition mb-1 ${
                active
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Icon size={18} />

              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-slate-700 p-4">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-slate-400 transition hover:bg-slate-700 hover:text-white">
          <LogOut size={18} />

          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
