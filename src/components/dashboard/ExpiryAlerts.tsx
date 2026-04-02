'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatStorageType, getExpiryBadgeClass, getExpiryLabel } from '@/lib/utils'
import type { ExpiryAlert } from '@/lib/types'
import { AlertTriangle, Clock } from 'lucide-react'

interface ExpiryAlertsProps {
  alerts: ExpiryAlert[]
}

export function ExpiryAlerts({ alerts }: ExpiryAlertsProps) {
  const sortedAlerts = [...alerts].sort((a, b) => a.days_until_expiry - b.days_until_expiry)
  const criticalCount = alerts.filter(a => a.status === 'expired' || a.status === 'critical').length

  return (
    <Card className={criticalCount > 0 ? 'border-red-200' : 'border-gray-100'}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className={`w-4 h-4 ${criticalCount > 0 ? 'text-red-500' : 'text-gray-400'}`} />
            Alert Kedaluwarsa
          </CardTitle>
          {criticalCount > 0 && (
            <Badge variant="danger" className="text-xs">
              {criticalCount} kritis
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {sortedAlerts.length === 0 ? (
          <div className="text-center py-6">
            <Clock className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Tidak ada produk yang akan segera kedaluwarsa</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {sortedAlerts.map((alert) => (
              <div
                key={alert.stock_item_id}
                className={`flex items-start justify-between p-3 rounded-lg border ${
                  alert.status === 'expired'
                    ? 'bg-red-50 border-red-200'
                    : alert.status === 'critical'
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {alert.product_name}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-gray-500">
                      {alert.quantity_remaining} unit
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">
                      {formatStorageType(alert.storage_type)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Exp: {formatDate(alert.expiry_date)}
                  </p>
                </div>
                <div className="ml-2 flex-shrink-0">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getExpiryBadgeClass(alert.status)}`}>
                    {alert.status === 'expired' ? (
                      <AlertTriangle className="w-3 h-3 mr-1" />
                    ) : null}
                    {getExpiryLabel(alert.status, alert.days_until_expiry)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
