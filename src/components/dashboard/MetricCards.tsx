'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { DashboardMetrics } from '@/lib/types'
import {
  ShoppingCart,
  TrendingUp,
  Package,
  AlertTriangle,
  Clock,
  Users,
} from 'lucide-react'

interface MetricCardsProps {
  metrics: DashboardMetrics
}

export function MetricCards({ metrics }: MetricCardsProps) {
  const cards = [
    {
      title: 'Penjualan Hari Ini',
      value: formatCurrency(metrics.today_revenue),
      subtitle: `${metrics.today_orders} transaksi`,
      icon: ShoppingCart,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      trend: null,
    },
    {
      title: 'Pendapatan Minggu Ini',
      value: formatCurrency(metrics.week_revenue),
      subtitle: 'Total minggu berjalan',
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      trend: null,
    },
    {
      title: 'Pendapatan Bulan Ini',
      value: formatCurrency(metrics.month_revenue),
      subtitle: 'Total bulan berjalan',
      icon: TrendingUp,
      color: 'text-violet-600',
      bgColor: 'bg-violet-50',
      trend: null,
    },
    {
      title: 'Total Produk Aktif',
      value: metrics.total_products.toString(),
      subtitle: 'Produk MPASI',
      icon: Package,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      trend: null,
    },
    {
      title: 'Stok Hampir Habis',
      value: metrics.low_stock_count.toString(),
      subtitle: 'Produk perlu restock',
      icon: AlertTriangle,
      color: metrics.low_stock_count > 0 ? 'text-orange-600' : 'text-gray-400',
      bgColor: metrics.low_stock_count > 0 ? 'bg-orange-50' : 'bg-gray-50',
      trend: null,
      alert: metrics.low_stock_count > 0,
    },
    {
      title: 'Segera Kedaluwarsa',
      value: metrics.expiring_soon_count.toString(),
      subtitle: 'Produk dalam 7 hari',
      icon: Clock,
      color: metrics.expiring_soon_count > 0 ? 'text-red-600' : 'text-gray-400',
      bgColor: metrics.expiring_soon_count > 0 ? 'bg-red-50' : 'bg-gray-50',
      trend: null,
      alert: metrics.expiring_soon_count > 0,
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <Card
            key={index}
            className={`hover-card ${card.alert ? 'border-orange-200' : 'border-gray-100'}`}
          >
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium text-gray-500 leading-tight">
                  {card.title}
                </CardTitle>
                <div className={`w-8 h-8 rounded-lg ${card.bgColor} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className={`text-xl font-bold ${card.alert ? 'text-orange-600' : 'text-gray-900'}`}>
                {card.value}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{card.subtitle}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
