'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MetricCards } from '@/components/dashboard/MetricCards'
import { SalesChart } from '@/components/dashboard/SalesChart'
import { ExpiryAlerts } from '@/components/dashboard/ExpiryAlerts'
import { LowStockAlerts } from '@/components/dashboard/LowStockAlerts'
import { TopProducts } from '@/components/dashboard/TopProducts'
import type { DashboardMetrics, SalesDataPoint, ExpiryAlert, LowStockAlert, TopProduct } from '@/lib/types'
import { getDaysUntilExpiry, getExpiryStatus } from '@/lib/utils'
import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { subDays, format, startOfDay, endOfDay, startOfMonth, startOfWeek } from 'date-fns'

// Demo data untuk mode tanpa Supabase
function generateDemoData() {
  const today = new Date()
  const salesData: SalesDataPoint[] = Array.from({ length: 30 }, (_, i) => ({
    date: format(subDays(today, 29 - i), 'yyyy-MM-dd'),
    revenue: Math.floor(Math.random() * 500000) + 100000,
    orders: Math.floor(Math.random() * 15) + 2,
  }))

  const metrics: DashboardMetrics = {
    today_sales: salesData[29].orders,
    today_orders: salesData[29].orders,
    today_revenue: salesData[29].revenue,
    week_revenue: salesData.slice(-7).reduce((sum, d) => sum + d.revenue, 0),
    month_revenue: salesData.reduce((sum, d) => sum + d.revenue, 0),
    total_products: 12,
    low_stock_count: 3,
    expiring_soon_count: 2,
    expired_count: 0,
  }

  const expiryAlerts: ExpiryAlert[] = [
    {
      stock_item_id: '1',
      product_id: '1',
      product_name: 'MPASI Ayam Brokoli (6M+)',
      quantity_remaining: 5,
      expiry_date: format(subDays(today, -3), 'yyyy-MM-dd'),
      days_until_expiry: 3,
      storage_type: 'fridge',
      status: 'critical',
    },
    {
      stock_item_id: '2',
      product_id: '2',
      product_name: 'Bubur Kacang Hijau Manis',
      quantity_remaining: 12,
      expiry_date: format(subDays(today, -10), 'yyyy-MM-dd'),
      days_until_expiry: 10,
      storage_type: 'frozen',
      status: 'warning',
    },
  ]

  const lowStockAlerts: LowStockAlert[] = [
    {
      product_id: '1',
      name: 'MPASI Salmon Bayam (8M+)',
      current_stock: 2,
      min_stock_alert: 10,
      unit: 'porsi',
      type: 'product',
    },
    {
      raw_material_id: '1',
      name: 'Dada Ayam Fillet',
      current_stock: 200,
      min_stock_alert: 500,
      unit: 'gram',
      type: 'raw_material',
    },
    {
      raw_material_id: '2',
      name: 'Bayam Segar',
      current_stock: 0,
      min_stock_alert: 300,
      unit: 'gram',
      type: 'raw_material',
    },
  ]

  const topProducts: TopProduct[] = [
    { product_id: '1', product_name: 'MPASI Ayam Brokoli (6M+)', total_quantity: 85, total_revenue: 2550000 },
    { product_id: '2', product_name: 'MPASI Salmon Bayam (8M+)', total_quantity: 62, total_revenue: 2480000 },
    { product_id: '3', product_name: 'Bubur Tim Sapi Wortel', total_quantity: 54, total_revenue: 1890000 },
    { product_id: '4', product_name: 'MPASI Tahu Tempe Sayuran', total_quantity: 41, total_revenue: 1230000 },
    { product_id: '5', product_name: 'Finger Food Pisang Oat', total_quantity: 38, total_revenue: 950000 },
  ]

  return { metrics, salesData, expiryAlerts, lowStockAlerts, topProducts }
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [salesData, setSalesData] = useState<SalesDataPoint[]>([])
  const [expiryAlerts, setExpiryAlerts] = useState<ExpiryAlert[]>([])
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const supabase = createClient()

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const isConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

      if (!isConfigured) {
        // Gunakan data demo
        const demo = generateDemoData()
        setMetrics(demo.metrics)
        setSalesData(demo.salesData)
        setExpiryAlerts(demo.expiryAlerts)
        setLowStockAlerts(demo.lowStockAlerts)
        setTopProducts(demo.topProducts)
        return
      }

      const today = new Date()
      const todayStart = startOfDay(today).toISOString()
      const todayEnd = endOfDay(today).toISOString()
      const weekStart = startOfWeek(today).toISOString()
      const monthStart = startOfMonth(today).toISOString()
      const thirtyDaysAgo = subDays(today, 30).toISOString()
      const sevenDaysFromNow = format(subDays(today, -7), 'yyyy-MM-dd')

      // Fetch data paralel
      const [
        todayOrdersRes,
        weekOrdersRes,
        monthOrdersRes,
        productsRes,
        lowStockProductsRes,
        expiryAlertsRes,
        salesChartRes,
        topProductsRes,
        rawMaterialsLowRes,
      ] = await Promise.all([
        // Pesanan hari ini
        supabase
          .from('orders')
          .select('total_amount')
          .gte('order_date', todayStart)
          .lte('order_date', todayEnd)
          .not('status', 'in', '(cancelled,voided)'),
        
        // Pesanan minggu ini
        supabase
          .from('orders')
          .select('total_amount')
          .gte('order_date', weekStart)
          .not('status', 'in', '(cancelled,voided)'),
        
        // Pesanan bulan ini
        supabase
          .from('orders')
          .select('total_amount')
          .gte('order_date', monthStart)
          .not('status', 'in', '(cancelled,voided)'),
        
        // Produk aktif
        supabase.from('products').select('id').eq('is_active', true),
        
        // Produk dengan stok rendah (menggunakan stock_items)
        supabase
          .from('stock_items')
          .select('product_id, quantity_remaining, products(name, unit)')
          .eq('is_active', true)
          .gt('expiry_date', format(today, 'yyyy-MM-dd')),
        
        // Produk yang akan expired dalam 7 hari
        supabase
          .from('stock_items')
          .select('id, product_id, quantity_remaining, expiry_date, storage_type, products(name)')
          .eq('is_active', true)
          .lte('expiry_date', sevenDaysFromNow)
          .gt('quantity_remaining', 0),
        
        // Data grafik penjualan 30 hari
        supabase
          .from('orders')
          .select('order_date, total_amount')
          .gte('order_date', thirtyDaysAgo)
          .not('status', 'in', '(cancelled,voided)')
          .order('order_date'),
        
        // Top produk
        supabase
          .from('order_items')
          .select('product_id, quantity, subtotal, products(name)')
          .gte('created_at', thirtyDaysAgo),
        
        // Bahan baku stok rendah
        supabase
          .from('raw_materials')
          .select('id, name, current_stock, min_stock_alert, unit')
          .eq('is_active', true),
      ])

      // Proses metrics
      const todayOrders = todayOrdersRes.data || []
      const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
      
      const weekRevenue = (weekOrdersRes.data || []).reduce((sum, o) => sum + (o.total_amount || 0), 0)
      const monthRevenue = (monthOrdersRes.data || []).reduce((sum, o) => sum + (o.total_amount || 0), 0)

      // Proses expiry alerts
      const expiryData: ExpiryAlert[] = (expiryAlertsRes.data || []).map((item: {
        id: string
        product_id: string
        quantity_remaining: number
        expiry_date: string
        storage_type: string
        products: { name: string } | null
      }) => ({
        stock_item_id: item.id,
        product_id: item.product_id,
        product_name: (item.products as { name: string } | null)?.name || 'Unknown',
        quantity_remaining: item.quantity_remaining,
        expiry_date: item.expiry_date,
        days_until_expiry: getDaysUntilExpiry(item.expiry_date),
        storage_type: item.storage_type as 'frozen' | 'fridge' | 'room_temp',
        status: getExpiryStatus(item.expiry_date),
      }))

      // Proses grafik penjualan - group by date
      const salesByDate: Record<string, { revenue: number; orders: number }> = {}
      for (let i = 0; i < 30; i++) {
        const date = format(subDays(today, 29 - i), 'yyyy-MM-dd')
        salesByDate[date] = { revenue: 0, orders: 0 }
      }
      
      ;(salesChartRes.data || []).forEach((order: { order_date: string; total_amount: number }) => {
        const date = format(new Date(order.order_date), 'yyyy-MM-dd')
        if (salesByDate[date]) {
          salesByDate[date].revenue += order.total_amount || 0
          salesByDate[date].orders += 1
        }
      })
      
      const salesChartData: SalesDataPoint[] = Object.entries(salesByDate).map(([date, data]) => ({
        date,
        ...data,
      }))

      // Proses top produk
      const productTotals: Record<string, { name: string; qty: number; revenue: number }> = {}
      ;(topProductsRes.data || []).forEach((item: {
        product_id: string
        quantity: number
        subtotal: number
        products: { name: string } | null
      }) => {
        if (!productTotals[item.product_id]) {
          productTotals[item.product_id] = {
            name: (item.products as { name: string } | null)?.name || 'Unknown',
            qty: 0,
            revenue: 0,
          }
        }
        productTotals[item.product_id].qty += item.quantity || 0
        productTotals[item.product_id].revenue += item.subtotal || 0
      })
      
      const topProductsData: TopProduct[] = Object.entries(productTotals)
        .map(([id, data]) => ({
          product_id: id,
          product_name: data.name,
          total_quantity: data.qty,
          total_revenue: data.revenue,
        }))
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, 5)

      // Proses low stock
      const rawMaterials = rawMaterialsLowRes.data || []
      const lowStock: LowStockAlert[] = rawMaterials
        .filter((rm: { current_stock: number; min_stock_alert: number }) => rm.current_stock <= rm.min_stock_alert)
        .map((rm: { id: string; name: string; current_stock: number; min_stock_alert: number; unit: string }) => ({
          raw_material_id: rm.id,
          name: rm.name,
          current_stock: rm.current_stock,
          min_stock_alert: rm.min_stock_alert,
          unit: rm.unit,
          type: 'raw_material' as const,
        }))

      setMetrics({
        today_sales: todayOrders.length,
        today_orders: todayOrders.length,
        today_revenue: todayRevenue,
        week_revenue: weekRevenue,
        month_revenue: monthRevenue,
        total_products: productsRes.data?.length || 0,
        low_stock_count: lowStock.length,
        expiring_soon_count: expiryData.filter(a => a.status !== 'expired').length,
        expired_count: expiryData.filter(a => a.status === 'expired').length,
      })
      setSalesData(salesChartData)
      setExpiryAlerts(expiryData)
      setLowStockAlerts(lowStock)
      setTopProducts(topProductsData)
      setLastRefresh(new Date())
    } catch (error) {
      console.error('Gagal mengambil data dashboard:', error)
      // Fallback ke demo data
      const demo = generateDemoData()
      setMetrics(demo.metrics)
      setSalesData(demo.salesData)
      setExpiryAlerts(demo.expiryAlerts)
      setLowStockAlerts(demo.lowStockAlerts)
      setTopProducts(demo.topProducts)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Memuat data dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Selamat datang di MPASI POS
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchDashboardData}
          className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {/* Metric cards */}
      {metrics && <MetricCards metrics={metrics} />}

      {/* Grafik dan alert */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <SalesChart data={salesData} />
        </div>
        <div className="space-y-4">
          <ExpiryAlerts alerts={expiryAlerts} />
          <LowStockAlerts alerts={lowStockAlerts} />
        </div>
      </div>

      {/* Top produk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopProducts products={topProducts} />
      </div>
    </div>
  )
}
