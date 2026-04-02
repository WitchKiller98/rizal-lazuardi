'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { formatCurrency, formatDateTime, formatNumber, formatOrderStatus, getOrderStatusClass } from '@/lib/utils'
import type { Customer, Order } from '@/lib/types'
import { ArrowLeft, Phone, MapPin, MessageSquare, ShoppingCart, Star } from 'lucide-react'

interface CustomerDetailProps {
  customer: Customer
  onBack: () => void
}

const DEMO_ORDERS: Order[] = [
  {
    id: '1',
    order_number: 'ORD-20240101-0001',
    customer_id: '1',
    order_date: new Date(Date.now() - 3 * 86400000).toISOString(),
    status: 'delivered',
    subtotal: 105000,
    discount_amount: 0,
    total_amount: 115000,
    payment_method: 'transfer',
    delivery_method: 'grab_express',
    delivery_fee: 10000,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    items: [
      {
        id: '1', order_id: '1', product_id: '1', quantity: 3,
        unit_price: 35000, hpp_at_sale: 15000, subtotal: 105000,
        created_at: '',
        product: { id: '1', name: 'MPASI Ayam Brokoli', category: 'mpasi', selling_price: 35000, unit: 'porsi', is_active: true, shelf_life_freezer_days: 30, shelf_life_fridge_days: 3, shelf_life_room_temp_hours: 4, created_at: '', updated_at: '' },
      },
    ],
  },
]

export function CustomerDetail({ customer, onBack }: CustomerDetailProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { loadOrders() }, [customer.id])

  const loadOrders = async () => {
    setLoading(true)
    try {
      const isConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

      if (!isConfigured) {
        setOrders(DEMO_ORDERS)
        return
      }

      const { data } = await supabase
        .from('orders')
        .select(`*, order_items(*, products(*))`)
        .eq('customer_id', customer.id)
        .order('order_date', { ascending: false })
        .limit(20)

      setOrders((data || []).map((o: Order & { order_items?: Order['items'] }) => ({
        ...o,
        items: o.order_items,
      })))
    } catch {
      setOrders(DEMO_ORDERS)
    } finally {
      setLoading(false)
    }
  }

  const getLoyaltyLevel = (totalOrders: number) => {
    if (totalOrders >= 20) return { label: 'Platinum', color: 'bg-purple-100 text-purple-800', stars: 5 }
    if (totalOrders >= 10) return { label: 'Gold', color: 'bg-yellow-100 text-yellow-800', stars: 4 }
    if (totalOrders >= 5) return { label: 'Silver', color: 'bg-gray-100 text-gray-700', stars: 3 }
    return { label: 'Bronze', color: 'bg-amber-100 text-amber-700', stars: 2 }
  }

  const loyalty = getLoyaltyLevel(customer.total_orders)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold text-gray-900">{customer.name}</h2>
          <p className="text-sm text-gray-500">Detail pelanggan</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info pelanggan */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Informasi Pelanggan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Level loyalitas */}
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${loyalty.color}`}>
                {Array.from({ length: loyalty.stars }).map((_, i) => (
                  <Star key={i} className="w-3 h-3 mr-0.5 fill-current" />
                ))}
                {loyalty.label}
              </span>
            </div>
            
            <Separator />
            
            {customer.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>{customer.phone}</span>
              </div>
            )}
            {customer.address && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <span>{customer.address}</span>
              </div>
            )}
            {customer.notes && (
              <div className="flex items-start gap-2 text-sm">
                <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-600">{customer.notes}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistik */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Statistik Pembelian</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-emerald-50 rounded-lg">
                <p className="text-2xl font-bold text-emerald-700">{formatNumber(customer.total_orders)}</p>
                <p className="text-xs text-gray-500 mt-0.5">Total Pesanan</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-xl font-bold text-blue-700">{formatCurrency(customer.total_spent)}</p>
                <p className="text-xs text-gray-500 mt-0.5">Total Belanja</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-xl font-bold text-purple-700">
                  {customer.total_orders > 0
                    ? formatCurrency(Math.round(customer.total_spent / customer.total_orders))
                    : formatCurrency(0)
                  }
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Rata-rata/Order</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Riwayat pesanan */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-emerald-600" />
            Riwayat Pesanan
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-sm text-gray-400 py-4">Memuat...</p>
          ) : orders.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">Belum ada pesanan</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Pesanan</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map(order => (
                  <TableRow key={order.id}>
                    <TableCell className="text-sm font-medium">{order.order_number}</TableCell>
                    <TableCell className="text-sm text-gray-600">{formatDateTime(order.order_date)}</TableCell>
                    <TableCell className="text-sm">
                      {order.items?.map(item => (
                        <div key={item.id}>
                          {item.product?.name} × {item.quantity}
                        </div>
                      ))}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-emerald-700">
                      {formatCurrency(order.total_amount)}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getOrderStatusClass(order.status)}`}>
                        {formatOrderStatus(order.status)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
