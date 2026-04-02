'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { formatCurrency, formatDate, formatNumber, formatOrderStatus, getOrderStatusClass } from '@/lib/utils'
import type { Order, TopProduct, SalesDataPoint } from '@/lib/types'
import { Download, BarChart3, TrendingUp, Package, Loader2 } from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth, parseISO } from 'date-fns'

const PIE_COLORS = ['#059669', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

// Generate demo data
function generateDemoReportData(startDate: string, endDate: string) {
  const start = parseISO(startDate)
  const end = parseISO(endDate)
  const days: SalesDataPoint[] = []
  let current = new Date(start)
  
  while (current <= end) {
    days.push({
      date: format(current, 'yyyy-MM-dd'),
      revenue: Math.floor(Math.random() * 800000) + 150000,
      orders: Math.floor(Math.random() * 20) + 3,
    })
    current.setDate(current.getDate() + 1)
  }
  
  return days
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [salesData, setSalesData] = useState<SalesDataPoint[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [categoryData, setCategoryData] = useState<{ name: string; value: number }[]>([])
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    totalProfit: 0,
  })
  const supabase = createClient()

  useEffect(() => { loadReports() }, [startDate, endDate])

  const loadReports = async () => {
    setLoading(true)
    try {
      const isConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

      if (!isConfigured) {
        const demoData = generateDemoReportData(startDate, endDate)
        setSalesData(demoData)
        
        const totalRevenue = demoData.reduce((s, d) => s + d.revenue, 0)
        const totalOrders = demoData.reduce((s, d) => s + d.orders, 0)
        setSummary({
          totalRevenue,
          totalOrders,
          avgOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
          totalProfit: Math.round(totalRevenue * 0.4),
        })

        setTopProducts([
          { product_id: '1', product_name: 'MPASI Ayam Brokoli (6M+)', total_quantity: 85, total_revenue: 2975000 },
          { product_id: '2', product_name: 'MPASI Salmon Bayam (8M+)', total_quantity: 62, total_revenue: 2790000 },
          { product_id: '3', product_name: 'Bubur Tim Sapi Wortel', total_quantity: 54, total_revenue: 2052000 },
          { product_id: '4', product_name: 'MPASI Tahu Tempe Sayuran', total_quantity: 41, total_revenue: 1230000 },
          { product_id: '5', product_name: 'Finger Food Pisang Oat', total_quantity: 38, total_revenue: 950000 },
        ])

        setCategoryData([
          { name: 'MPASI', value: 65 },
          { name: 'Camilan', value: 20 },
          { name: 'Minuman', value: 15 },
        ])

        setRecentOrders([
          {
            id: '1', order_number: 'ORD-20240101-0001',
            customer_id: '1', order_date: new Date(Date.now() - 86400000).toISOString(),
            status: 'delivered', subtotal: 105000, discount_amount: 0, total_amount: 115000,
            payment_method: 'transfer', delivery_method: 'grab_express', delivery_fee: 10000,
            created_at: '', updated_at: '',
            customer: { id: '1', name: 'Ibu Sari', phone: '', total_orders: 12, total_spent: 456000, is_active: true, created_at: '', updated_at: '' },
          },
        ])
        return
      }

      const start = new Date(startDate).toISOString()
      const end = new Date(endDate + 'T23:59:59').toISOString()

      const [ordersRes, itemsRes] = await Promise.all([
        supabase.from('orders').select('*, customers(name)').gte('order_date', start).lte('order_date', end).not('status', 'in', '(cancelled,voided)').order('order_date'),
        supabase.from('order_items').select('*, products(name, category)').gte('created_at', start).lte('created_at', end),
      ])

      const orders = ordersRes.data || []
      const items = itemsRes.data || []

      // Sales chart data
      const salesByDate: Record<string, { revenue: number; orders: number }> = {}
      let current = new Date(startDate)
      const end2 = new Date(endDate)
      while (current <= end2) {
        salesByDate[format(current, 'yyyy-MM-dd')] = { revenue: 0, orders: 0 }
        current.setDate(current.getDate() + 1)
      }
      
      orders.forEach((o: Order) => {
        const date = format(new Date(o.order_date), 'yyyy-MM-dd')
        if (salesByDate[date]) {
          salesByDate[date].revenue += o.total_amount
          salesByDate[date].orders += 1
        }
      })

      setSalesData(Object.entries(salesByDate).map(([date, data]) => ({ date, ...data })))

      // Summary
      const totalRevenue = orders.reduce((s: number, o: Order) => s + o.total_amount, 0)
      const totalOrders = orders.length
      const totalHPP = items.reduce((s: number, i: { hpp_at_sale: number; quantity: number }) => s + (i.hpp_at_sale * i.quantity), 0)

      setSummary({
        totalRevenue,
        totalOrders,
        avgOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
        totalProfit: totalRevenue - totalHPP,
      })

      // Top products
      const productMap: Record<string, { name: string; qty: number; revenue: number }> = {}
      items.forEach((item: { product_id: string; quantity: number; subtotal: number; products: { name: string } | null }) => {
        if (!productMap[item.product_id]) {
          productMap[item.product_id] = { name: (item.products as { name: string } | null)?.name || 'Unknown', qty: 0, revenue: 0 }
        }
        productMap[item.product_id].qty += item.quantity
        productMap[item.product_id].revenue += item.subtotal
      })
      setTopProducts(Object.entries(productMap).map(([id, d]) => ({
        product_id: id, product_name: d.name, total_quantity: d.qty, total_revenue: d.revenue,
      })).sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 10))

      // Category breakdown
      const catMap: Record<string, number> = {}
      items.forEach((item: { subtotal: number; products: { category: string } | null }) => {
        const cat = (item.products as { category: string } | null)?.category || 'lainnya'
        catMap[cat] = (catMap[cat] || 0) + item.subtotal
      })
      setCategoryData(Object.entries(catMap).map(([name, value]) => ({ name, value })))

      setRecentOrders(orders.slice(0, 10).map((o: Order & { customers: Customer | null }) => ({ ...o, customer: o.customers })))
    } catch (error) {
      console.error('Error loading reports:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan & Analitik</h1>
          <p className="text-sm text-gray-500 mt-0.5">Analisis penjualan dan performa bisnis</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>

      {/* Filter tanggal */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">Dari:</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">Sampai:</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
            </div>
            <div className="flex gap-2">
              {['7 Hari', '30 Hari', 'Bulan Ini'].map((label, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date()
                    if (i === 0) setStartDate(format(subDays(today, 7), 'yyyy-MM-dd'))
                    else if (i === 1) setStartDate(format(subDays(today, 30), 'yyyy-MM-dd'))
                    else setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'))
                    setEndDate(format(today, 'yyyy-MM-dd'))
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />}
          </div>
        </CardContent>
      </Card>

      {/* Ringkasan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Pendapatan', value: formatCurrency(summary.totalRevenue), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total Pesanan', value: formatNumber(summary.totalOrders), icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Rata-rata/Order', value: formatCurrency(summary.avgOrderValue), icon: Package, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Estimasi Profit', value: formatCurrency(summary.totalProfit), icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((card, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-xs text-gray-500">{card.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="penjualan">
        <TabsList>
          <TabsTrigger value="penjualan">Grafik Penjualan</TabsTrigger>
          <TabsTrigger value="produk">Produk Terlaris</TabsTrigger>
          <TabsTrigger value="pesanan">Daftar Pesanan</TabsTrigger>
        </TabsList>

        <TabsContent value="penjualan" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Tren Pendapatan</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={salesData.map(d => ({
                    ...d,
                    date: format(parseISO(d.date), 'd MMM'),
                  }))}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Area type="monotone" dataKey="revenue" stroke="#059669" fill="url(#colorRevenue)" strokeWidth={2} name="Pendapatan" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Kategori Produk</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${v}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Volume Pesanan Harian</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={salesData.map(d => ({ ...d, date: format(parseISO(d.date), 'd MMM') }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Pesanan" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="produk">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top 10 Produk Terlaris</CardTitle>
              <CardDescription>Berdasarkan pendapatan dalam periode terpilih</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Peringkat</TableHead>
                    <TableHead>Produk</TableHead>
                    <TableHead className="text-right">Qty Terjual</TableHead>
                    <TableHead className="text-right">Total Pendapatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((product, index) => (
                    <TableRow key={product.product_id}>
                      <TableCell>
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-800' :
                          index === 1 ? 'bg-gray-100 text-gray-700' :
                          index === 2 ? 'bg-amber-100 text-amber-700' : 'bg-gray-50 text-gray-500'
                        }`}>
                          {index + 1}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{product.product_name}</TableCell>
                      <TableCell className="text-right">{formatNumber(product.total_quantity)}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-700">
                        {formatCurrency(product.total_revenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pesanan">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daftar Pesanan</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Pesanan</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Pelanggan</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map(order => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium text-sm">{order.order_number}</TableCell>
                      <TableCell className="text-sm text-gray-600">{formatDate(order.order_date)}</TableCell>
                      <TableCell className="text-sm">{order.customer?.name || 'Umum'}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-700 text-sm">
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
