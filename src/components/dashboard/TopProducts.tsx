'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatCurrency, formatNumber } from '@/lib/utils'
import type { TopProduct } from '@/lib/types'
import { TrendingUp, Medal } from 'lucide-react'

interface TopProductsProps {
  products: TopProduct[]
  period?: string
}

export function TopProducts({ products, period = '30 hari terakhir' }: TopProductsProps) {
  const maxRevenue = products.length > 0 ? Math.max(...products.map(p => p.total_revenue)) : 1

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0: return 'text-yellow-500'
      case 1: return 'text-gray-400'
      case 2: return 'text-amber-600'
      default: return 'text-gray-300'
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Produk Terlaris
            </CardTitle>
            <CardDescription className="text-xs mt-1">{period}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <div className="text-center py-6">
            <TrendingUp className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Belum ada data penjualan</p>
          </div>
        ) : (
          <div className="space-y-3">
            {products.slice(0, 5).map((product, index) => {
              const barWidth = (product.total_revenue / maxRevenue) * 100

              return (
                <div key={product.product_id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Medal className={`w-4 h-4 flex-shrink-0 ${getMedalColor(index)}`} />
                      <span className="text-sm text-gray-700 truncate font-medium">
                        {product.product_name}
                      </span>
                    </div>
                    <div className="text-right ml-2 flex-shrink-0">
                      <p className="text-sm font-semibold text-emerald-700">
                        {formatCurrency(product.total_revenue)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatNumber(product.total_quantity)} terjual
                      </p>
                    </div>
                  </div>
                  {/* Progress bar visual */}
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
