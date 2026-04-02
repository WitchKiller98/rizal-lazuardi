import { Context } from 'telegraf'
import { createClient } from '@supabase/supabase-js'
import { format, startOfDay, endOfDay } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

// Handler untuk /laporan - laporan penjualan hari ini
export async function handleLaporan(ctx: Context): Promise<void> {
  const supabase = getSupabaseClient()
  
  if (!supabase) {
    await ctx.reply('❌ Database tidak dikonfigurasi.')
    return
  }

  const today = new Date()
  const todayStart = startOfDay(today).toISOString()
  const todayEnd = endOfDay(today).toISOString()

  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      total_amount, subtotal, discount_amount, payment_method,
      order_items(quantity, subtotal, products(name))
    `)
    .gte('order_date', todayStart)
    .lte('order_date', todayEnd)
    .not('status', 'in', '(cancelled,voided)')

  if (error) {
    await ctx.reply('❌ Gagal mengambil data laporan.')
    return
  }

  const dateLabel = format(today, 'EEEE, dd MMMM yyyy', { locale: idLocale })

  if (!orders || orders.length === 0) {
    await ctx.replyWithMarkdown(
      `📊 *Laporan ${dateLabel}*\n\nBelum ada penjualan hari ini.`
    )
    return
  }

  const totalRevenue = orders.reduce((sum: number, o: { total_amount: number }) => sum + o.total_amount, 0)
  const totalDiscount = orders.reduce((sum: number, o: { discount_amount: number }) => sum + (o.discount_amount || 0), 0)
  
  // Hitung per produk
  const productSales: Record<string, { name: string; qty: number; revenue: number }> = {}
  orders.forEach((order: { order_items: { products: { name: string } | null; quantity: number; subtotal: number }[] }) => {
    order.order_items?.forEach((item) => {
      const name = (item.products as { name: string } | null)?.name || 'Unknown'
      if (!productSales[name]) productSales[name] = { name, qty: 0, revenue: 0 }
      productSales[name].qty += item.quantity
      productSales[name].revenue += item.subtotal
    })
  })

  // Hitung per metode pembayaran
  const paymentBreakdown: Record<string, number> = {}
  orders.forEach((o: { payment_method: string; total_amount: number }) => {
    const method = o.payment_method || 'lainnya'
    paymentBreakdown[method] = (paymentBreakdown[method] || 0) + o.total_amount
  })

  let text = `📊 *Laporan Penjualan*\n`
  text += `_${dateLabel}_\n\n`
  text += `💰 *Total Pendapatan: ${formatRupiah(totalRevenue)}*\n`
  text += `🛒 Jumlah Pesanan: ${orders.length}\n`
  text += `📊 Rata-rata/Pesanan: ${formatRupiah(Math.round(totalRevenue / orders.length))}\n`
  if (totalDiscount > 0) text += `🏷️ Total Diskon: ${formatRupiah(totalDiscount)}\n`
  text += '\n'

  text += `📦 *Produk Terjual:*\n`
  Object.values(productSales)
    .sort((a, b) => b.qty - a.qty)
    .forEach(p => {
      text += `• ${p.name}: ${p.qty} unit (${formatRupiah(p.revenue)})\n`
    })
  text += '\n'

  if (Object.keys(paymentBreakdown).length > 1) {
    text += `💳 *Metode Pembayaran:*\n`
    const methodLabels: Record<string, string> = {
      tunai: 'Tunai', transfer: 'Transfer', qris: 'QRIS', cod: 'COD',
    }
    Object.entries(paymentBreakdown).forEach(([method, amount]) => {
      text += `• ${methodLabels[method] || method}: ${formatRupiah(amount)}\n`
    })
  }

  await ctx.replyWithMarkdown(text)
}
