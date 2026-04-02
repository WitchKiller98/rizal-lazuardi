import { Context } from 'telegraf'
import { createClient } from '@supabase/supabase-js'
import { format } from 'date-fns'

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

function getDaysUntilExpiry(expiryDate: string): number {
  const expiry = new Date(expiryDate)
  const today = new Date()
  return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function getProductName(products: unknown): string {
  if (!products) return 'Unknown'
  if (Array.isArray(products)) return (products[0] as { name: string })?.name || 'Unknown'
  return (products as { name: string })?.name || 'Unknown'
}

function getProductUnit(products: unknown): string {
  if (!products) return 'unit'
  if (Array.isArray(products)) return (products[0] as { unit: string })?.unit || 'unit'
  return (products as { unit: string })?.unit || 'unit'
}

// Handler untuk /stok
export async function handleStok(ctx: Context): Promise<void> {
  const supabase = getSupabaseClient()

  if (!supabase) {
    await ctx.reply('❌ Database tidak dikonfigurasi.')
    return
  }

  await ctx.reply('⏳ Mengambil data stok...')

  const { data: stockData, error } = await supabase
    .from('stock_items')
    .select('product_id, quantity_remaining, expiry_date, storage_type, products(name, unit)')
    .eq('is_active', true)
    .gt('quantity_remaining', 0)
    .order('expiry_date')

  if (error || !stockData) {
    await ctx.reply('❌ Gagal mengambil data stok.')
    return
  }

  if (stockData.length === 0) {
    await ctx.reply('📦 Tidak ada stok produk saat ini.')
    return
  }

  // Group by product
  const productStock: Record<string, { name: string; unit: string; total: number; nearestExpiry: string }> = {}

  for (const item of stockData as Array<Record<string, unknown>>) {
    const pid = item.product_id as string
    const name = getProductName(item.products)
    const unit = getProductUnit(item.products)
    const qty = item.quantity_remaining as number
    const expiry = item.expiry_date as string

    if (!productStock[pid]) {
      productStock[pid] = { name, unit, total: 0, nearestExpiry: expiry }
    }
    productStock[pid].total += qty
    if (expiry < productStock[pid].nearestExpiry) {
      productStock[pid].nearestExpiry = expiry
    }
  }

  let text = `📦 *Stok Produk MPASI*\n`
  text += `_${format(new Date(), 'dd MMM yyyy, HH:mm')}_\n\n`

  Object.values(productStock).forEach(p => {
    const days = getDaysUntilExpiry(p.nearestExpiry)
    const emoji = days < 0 ? '🔴' : days < 7 ? '🟠' : days < 14 ? '🟡' : '🟢'
    text += `${emoji} *${p.name}*: ${p.total} ${p.unit}\n`
    if (days < 14) {
      text += `   ⏰ Exp: ${p.nearestExpiry} (${days < 0 ? 'KEDALUWARSA' : `${days} hari`})\n`
    }
  })

  text += `\n_Total: ${Object.keys(productStock).length} jenis produk_`

  await ctx.replyWithMarkdown(text)
}

// Handler untuk /stokbahan
export async function handleStokBahan(ctx: Context): Promise<void> {
  const supabase = getSupabaseClient()

  if (!supabase) {
    await ctx.reply('❌ Database tidak dikonfigurasi.')
    return
  }

  const { data, error } = await supabase
    .from('raw_materials')
    .select('name, current_stock, min_stock_alert, unit, cost_per_unit')
    .eq('is_active', true)
    .order('name')

  if (error || !data) {
    await ctx.reply('❌ Gagal mengambil data bahan baku.')
    return
  }

  if (data.length === 0) {
    await ctx.reply('🥕 Tidak ada data bahan baku.')
    return
  }

  let text = `🥕 *Stok Bahan Baku*\n`
  text += `_${format(new Date(), 'dd MMM yyyy, HH:mm')}_\n\n`

  const critical: string[] = []
  const warning: string[] = []
  const safe: string[] = []

  for (const m of data as Array<Record<string, unknown>>) {
    const name = m.name as string
    const stock = m.current_stock as number
    const minStock = m.min_stock_alert as number
    const unit = m.unit as string
    const line = `*${name}*: ${stock}/${minStock} ${unit}`
    if (stock === 0) critical.push(`🔴 ${line}`)
    else if (stock <= minStock) warning.push(`🟡 ${line}`)
    else safe.push(`🟢 ${line}`)
  }

  if (critical.length > 0) text += `*⚠️ HABIS:*\n${critical.join('\n')}\n\n`
  if (warning.length > 0) text += `*⚠️ Menipis:*\n${warning.join('\n')}\n\n`
  if (safe.length > 0) text += `*✅ Aman:*\n${safe.join('\n')}`

  await ctx.replyWithMarkdown(text)
}
