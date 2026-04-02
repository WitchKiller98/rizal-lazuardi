'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { LowStockAlert } from '@/lib/types'
import { Package, Warehouse, AlertTriangle } from 'lucide-react'

interface LowStockAlertsProps {
  alerts: LowStockAlert[]
}

export function LowStockAlerts({ alerts }: LowStockAlertsProps) {
  const criticalAlerts = alerts.filter(a => a.current_stock === 0)

  return (
    <Card className={criticalAlerts.length > 0 ? 'border-orange-200' : 'border-gray-100'}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className={`w-4 h-4 ${alerts.length > 0 ? 'text-orange-500' : 'text-gray-400'}`} />
            Stok Hampir Habis
          </CardTitle>
          {alerts.length > 0 && (
            <Badge variant="warning" className="text-xs">
              {alerts.length} item
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-6">
            <Package className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Semua stok dalam kondisi aman</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {alerts.map((alert, index) => {
              const stockPercentage = alert.min_stock_alert > 0
                ? Math.min((alert.current_stock / (alert.min_stock_alert * 2)) * 100, 100)
                : 0
              const isOut = alert.current_stock === 0

              return (
                <div key={index} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {alert.type === 'product' ? (
                        <Package className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      ) : (
                        <Warehouse className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      )}
                      <span className="text-sm text-gray-700 truncate">{alert.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                      {isOut ? (
                        <Badge variant="danger" className="text-xs">Habis</Badge>
                      ) : (
                        <Badge variant="warning" className="text-xs">Menipis</Badge>
                      )}
                      <span className="text-xs text-gray-500">
                        {alert.current_stock}/{alert.min_stock_alert} {alert.unit}
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={stockPercentage}
                    className={`h-1.5 ${isOut ? '[&>div]:bg-red-500' : '[&>div]:bg-orange-400'}`}
                  />
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
