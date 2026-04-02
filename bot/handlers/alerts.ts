import { Context } from 'telegraf'
import { createClient } from '@supabase/supabase-js'
import { format, addDays } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function getDaysUntilExpiry(expiryDate: string): number {
  const expiry = new Date(expiryDate)
  const today = new Date()
  return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function formatStorageType(storage: string): string {
  const types: Record<string, string> = {
    frozen: 'Freezer', fridge: 'Kulkas', room_temp: 'Suhu Ruang',
  }
  return types[storage] || storage
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
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

// Handler untuk /expired
export async function handleExpired(ctx: Context): Promise<void> {
  const supabase = getSupabaseClient()

  if (!supabase) {
    await ctx.reply('❌ Database tidak dikonfigurasi.')
    return
  }

  const today = format(new Date(), 'yyyy-MM-dd')
  const sevenDaysLater = format(addDays(new Date(), 7), 'yyyy-MM-dd')

  const [expiredRes, soonRes] = await Promise.all([
    supabase
      .from('stock_items')
      .select('product_id, quantity_remaining, expiry_date, storage_type, products(name)')
      .eq('is_active', true)
      .lt('expiry_date', today)
      .gt('quantity_remaining', 0),
    supabase
      .from('stock_items')
      .select('product_id, quantity_remaining, expiry_date, storage_type, products(name)')
      .eq('is_active', true)
      .gte('expiry_date', today)
      .lte('expiry_date', sevenDaysLater)
      .gt('quantity_remaining', 0)
      .order('expiry_date'),
  ])

  const expired = (expiredRes.data || []) as Array<Record<string, unknown>>
  const expiringSoon = (soonRes.data || []) as Array<Record<string, unknown>>

  if (expired.length === 0 && expiringSoon.length === 0) {
    await ctx.reply('✅ Tidak ada produk yang kedaluwarsa atau akan segera kedaluwarsa dalam 7 hari.')
    return
  }

  let text = `⚠️ *Alert Kedaluwarsa Produk*\n`
  text += `_${format(new Date(), 'dd MMM yyyy, HH:mm', { locale: idLocale })}_\n\n`

  if (expired.length > 0) {
    text += `🔴 *SUDAH KEDALUWARSA (${expired.length} item):*\n`
    expired.forEach(item => {
      const daysAgo = Math.abs(getDaysUntilExpiry(item.expiry_date as string))
      const name = getProductName(item.products)
      text += `• *${name}*\n`
      text += `  ${item.quantity_remaining} unit | ${formatStorageType(item.storage_type as string)}\n`
      text += `  Expired ${daysAgo} hari yang lalu\n`
    })
    text += '\n'
  }

  if (expiringSoon.length > 0) {
    text += `🟡 *Akan Kedaluwarsa (${expiringSoon.length} item):*\n`
    expiringSoon.forEach(item => {
      const days = getDaysUntilExpiry(item.expiry_date as string)
      const emoji = days <= 3 ? '🟠' : '🟡'
      const name = getProductName(item.products)
      text += `${emoji} *${name}*\n`
      text += `  ${item.quantity_remaining} unit | ${formatStorageType(item.storage_type as string)}\n`
      text += `  Exp: ${item.expiry_date} (${days === 0 ? 'HARI INI' : `${days} hari lagi`})\n`
    })
  }

  text += `\n_Segera jual atau buang produk kedaluwarsa!_`
  await ctx.replyWithMarkdown(text)
}

// Handler untuk /restock
export async function handleRestock(ctx: Context): Promise<void> {
  const supabase = getSupabaseClient()

  if (!supabase) {
    await ctx.reply('❌ Database tidak dikonfigurasi.')
    return
  }

  const [materialsRes, stockRes] = await Promise.all([
    supabase
      .from('raw_materials')
      .select('name, current_stock, min_stock_alert, unit, cost_per_unit')
      .eq('is_active', true),
    supabase
      .from('stock_items')
      .select('product_id, quantity_remaining, products(name, unit)')
      .eq('is_active', true)
      .gt('expiry_date', format(new Date(), 'yyyy-MM-dd'))
      .gt('quantity_remaining', 0),
  ])

  const materials = (materialsRes.data || []) as Array<Record<string, unknown>>
  const stockItems = (stockRes.data || []) as Array<Record<string, unknown>>

  // Group stok produk
  const productStock: Record<string, { name: string; unit: string; total: number }> = {}
  stockItems.forEach(s => {
    const pid = s.product_id as string
    if (!productStock[pid]) {
      productStock[pid] = {
        name: getProductName(s.products),
        unit: getProductUnit(s.products),
        total: 0,
      }
    }
    productStock[pid].total += s.quantity_remaining as number
  })

  const lowProducts = Object.values(productStock).filter(p => p.total < 5)
  const lowMaterials = materials.filter(m => (m.current_stock as number) <= (m.min_stock_alert as number))
  const criticalMaterials = materials.filter(m => (m.current_stock as number) === 0)

  if (lowProducts.length === 0 && lowMaterials.length === 0) {
    await ctx.reply('✅ Semua stok aman. Tidak ada yang perlu di-restock saat ini.')
    return
  }

  let text = `🔄 *Rekomendasi Restock*\n`
  text += `_${format(new Date(), 'dd MMM yyyy, HH:mm')}_\n\n`

  if (criticalMaterials.length > 0) {
    text += `🚨 *DARURAT - Bahan Habis:*\n`
    criticalMaterials.forEach(m => {
      text += `🔴 ${m.name} - *HABIS!* Segera beli!\n`
    })
    text += '\n'
  }

  if (lowProducts.length > 0) {
    text += `📦 *Produk Stok Rendah (< 5 unit):*\n`
    lowProducts.forEach(p => {
      const emoji = p.total === 0 ? '🔴' : '🟡'
      text += `${emoji} ${p.name}: ${p.total} ${p.unit}\n`
    })
    text += `\n_Pertimbangkan untuk segera produksi._\n\n`
  }

  const normalLowMaterials = lowMaterials.filter(m => (m.current_stock as number) > 0)
  if (normalLowMaterials.length > 0) {
    text += `🥕 *Bahan Baku Menipis:*\n`
    normalLowMaterials.forEach(m => {
      const stock = m.current_stock as number
      const minStock = m.min_stock_alert as number
      const costPerUnit = m.cost_per_unit as number
      const deficiency = minStock - stock
      text += `🟡 ${m.name}: ${stock}/${minStock} ${m.unit}\n`
      text += `   Perlu beli: ~${deficiency * 2} ${m.unit} (${formatRupiah(deficiency * 2 * costPerUnit)})\n`
    })
  }

  await ctx.replyWithMarkdown(text)
}
