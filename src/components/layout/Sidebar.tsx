'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FlaskConical,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Warehouse,
  UtensilsCrossed,
} from 'lucide-react'

// Navigasi utama sidebar
const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    description: 'Ringkasan bisnis',
  },
  {
    href: '/pos',
    label: 'Kasir (POS)',
    icon: ShoppingCart,
    description: 'Catat penjualan',
  },
  {
    href: '/inventory',
    label: 'Inventori Produk',
    icon: Package,
    description: 'Stok produk MPASI',
  },
  {
    href: '/inventory/raw-materials',
    label: 'Bahan Baku',
    icon: Warehouse,
    description: 'Stok bahan baku',
  },
  {
    href: '/production',
    label: 'Produksi',
    icon: FlaskConical,
    description: 'Batch produksi',
  },
  {
    href: '/customers',
    label: 'Pelanggan',
    icon: Users,
    description: 'Data pelanggan',
  },
  {
    href: '/reports',
    label: 'Laporan',
    icon: BarChart3,
    description: 'Analitik & laporan',
  },
  {
    href: '/settings',
    label: 'Pengaturan',
    icon: Settings,
    description: 'Konfigurasi aplikasi',
  },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'flex flex-col bg-white border-r border-emerald-100 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Logo dan nama aplikasi */}
      <div className="flex items-center justify-between p-4 border-b border-emerald-100">
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <div className="flex-shrink-0 w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <UtensilsCrossed className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div>
              <p className="font-bold text-emerald-900 text-sm leading-none">MPASI POS</p>
              <p className="text-xs text-emerald-500 mt-0.5">Dapur Sehat</p>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </button>
      </div>

      {/* Navigasi */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || 
            (item.href !== '/dashboard' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-700',
                collapsed && 'justify-center px-2'
              )}
            >
              <Icon className={cn('flex-shrink-0', collapsed ? 'w-5 h-5' : 'w-4 h-4')} />
              {!collapsed && (
                <span className="font-medium truncate">{item.label}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Info versi di bawah */}
      {!collapsed && (
        <div className="p-4 border-t border-emerald-100">
          <p className="text-xs text-gray-400 text-center">MPASI POS v1.0</p>
        </div>
      )}
    </aside>
  )
}
