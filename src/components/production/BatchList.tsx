'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatDate, formatStorageType, getExpiryStatus, getExpiryBadgeClass, getDaysUntilExpiry } from '@/lib/utils'
import type { ProductionBatch } from '@/lib/types'
import { FlaskConical, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react'

// Demo data untuk batch produksi
const DEMO_BATCHES: (ProductionBatch & { expanded?: boolean })[] = [
  {
    id: '1',
    batch_number: 'BATCH-20240101-001',
    production_date: '2024-01-01',
    notes: 'Produksi batch pertama tahun baru',
    total_hpp: 450000,
    status: 'completed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: [
      {
        id: '1',
        batch_id: '1',
        product_id: '1',
        quantity_produced: 20,
        hpp_per_unit: 15000,
        production_date: '2024-01-01',
        expiry_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        storage_type: 'frozen',
        raw_material_cost: 100000,
        created_at: new Date().toISOString(),
        product: {
          id: '1',
          name: 'MPASI Ayam Brokoli (6M+)',
          category: 'mpasi',
          selling_price: 35000,
          unit: 'porsi',
          is_active: true,
          shelf_life_freezer_days: 30,
          shelf_life_fridge_days: 3,
          shelf_life_room_temp_hours: 4,
          created_at: '',
          updated_at: '',
        },
      },
    ],
  },
]

interface BatchListProps {
  onAddBatch: () => void
}

export function BatchList({ onAddBatch }: BatchListProps) {
  const [batches, setBatches] = useState<(ProductionBatch & { expanded?: boolean })[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { loadBatches() }, [])

  const loadBatches = async () => {
    setLoading(true)
    try {
      const isConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

      if (!isConfigured) {
        setBatches(DEMO_BATCHES)
        return
      }

      const { data } = await supabase
        .from('production_batches')
        .select(`
          *,
          production_batch_items (
            *,
            products (*)
          )
        `)
        .order('production_date', { ascending: false })
        .limit(50)

      setBatches((data || []).map((b: ProductionBatch) => ({ ...b, expanded: false, items: (b as ProductionBatch & { production_batch_items: ProductionBatch['items'] }).production_batch_items })))
    } catch {
      setBatches(DEMO_BATCHES)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (batchId: string) => {
    setBatches(prev => prev.map(b => b.id === batchId ? { ...b, expanded: !b.expanded } : b))
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge variant="success">Selesai</Badge>
      case 'in_progress': return <Badge variant="warning">Proses</Badge>
      case 'cancelled': return <Badge variant="danger">Dibatalkan</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-gray-900">Riwayat Batch Produksi</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadBatches}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" onClick={onAddBatch} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
            <FlaskConical className="w-4 h-4" />
            Produksi Baru
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="text-center py-8 text-gray-400">Memuat data...</div>
        ) : batches.length === 0 ? (
          <div className="text-center py-12">
            <FlaskConical className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Belum ada batch produksi</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {batches.map(batch => (
              <div key={batch.id}>
                {/* Header batch */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleExpand(batch.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-gray-400">
                      {batch.expanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-gray-900">{batch.batch_number}</p>
                        {getStatusBadge(batch.status)}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Tanggal produksi: {formatDate(batch.production_date)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(batch.total_hpp)}</p>
                    <p className="text-xs text-gray-500">Total HPP</p>
                  </div>
                </div>

                {/* Detail item batch */}
                {batch.expanded && batch.items && batch.items.length > 0 && (
                  <div className="bg-gray-50 border-t border-gray-100">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-12">Produk</TableHead>
                          <TableHead className="text-right">Jumlah</TableHead>
                          <TableHead className="text-right">HPP/Unit</TableHead>
                          <TableHead>Penyimpanan</TableHead>
                          <TableHead>Tanggal Kedaluwarsa</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {batch.items.map(item => {
                          const expiryStatus = getExpiryStatus(item.expiry_date)
                          const daysLeft = getDaysUntilExpiry(item.expiry_date)
                          return (
                            <TableRow key={item.id}>
                              <TableCell className="pl-12">
                                <p className="text-sm font-medium text-gray-800">
                                  {item.product?.name || 'Unknown'}
                                </p>
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {item.quantity_produced} {item.product?.unit || 'unit'}
                              </TableCell>
                              <TableCell className="text-right text-sm font-medium">
                                {formatCurrency(item.hpp_per_unit)}
                              </TableCell>
                              <TableCell className="text-sm">
                                {formatStorageType(item.storage_type)}
                              </TableCell>
                              <TableCell className="text-sm">
                                {formatDate(item.expiry_date)}
                              </TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getExpiryBadgeClass(expiryStatus)}`}>
                                  {expiryStatus === 'expired' ? 'Kedaluwarsa' :
                                    expiryStatus === 'critical' ? `${daysLeft}h lagi` :
                                    expiryStatus === 'warning' ? 'Segera' : 'Aman'}
                                </span>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                    {batch.notes && (
                      <div className="px-4 py-2 text-xs text-gray-500">
                        Catatan: {batch.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
