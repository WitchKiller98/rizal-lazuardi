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
    // Produk yang sudah kedaluwarsa
    supabase
      .from('stock_items')
      .select('product_id, quantity_remaining, expiry_date, storage_type, products(name)')
      .eq('is_active', true)
      .lt('expiry_date', today)
      .gt('quantity_remaining', 0),
    
    // Produk yang akan kedaluwarsa dalam 7 hari
    supabase
      .from('stock_items')
      .select('product_id, quantity_remaining, expiry_date, storage_type, products(name)')
      .eq('is_active', true)
      .gte('expiry_date', today)
      .lte('expiry_date', sevenDaysLater)
      .gt('quantity_remaining', 0)
      .order('expiry_date'),
  ])

  const expired = expiredRes.data || []
  const expiringSoon = soonRes.data || []

  if (expired.length === 0 && expiringSoon.length === 0) {
    await ctx.reply('✅ Tidak ada produk yang kedaluwarsa atau akan segera kedaluwarsa dalam 7 hari.')
    return
  }

  let text = `⚠️ *Alert Kedaluwarsa Produk*\n`
  text += `_${format(new Date(), 'dd MMM yyyy, HH:mm')}_\n\n`

  if (expired.length > 0) {
    text += `🔴 *SUDAH KEDALUWARSA (${expired.length} item):*\n`
    expired.forEach((item: {
      quantity_remaining: number
      expiry_date: string
      storage_type: string
      products: { name: string } | null
    }) => {
      const daysAgo = Math.abs(getDaysUntilExpiry(item.expiry_date))
      const name = (item.products as { name: string } | null)?.name || 'Unknown'
      text += `• *${name}*\n`
      text += `  ${item.quantity_remaining} unit | ${formatStorageType(item.storage_type)}\n`
      text += `  Expired ${daysAgo} hari yang lalu\n`
    })
    text += '\n'
  }

  if (expiringSoon.length > 0) {
    text += `🟡 *Akan Kedaluwarsa (${expiringSoon.length} item):*\n`
    expiringSoon.forEach((item: {
      quantity_remaining: number
      expiry_date: string
      storage_type: string
      products: { name: string } | null
    }) => {
      const days = getDaysUntilExpiry(item.expiry_date)
      const emoji = days <= 3 ? '🟠' : '🟡'
      const name = (item.products as { name: string } | null)?.name || 'Unknown'
      text += `${emoji} *${name}*\n`
      text += `  ${item.quantity_remaining} unit | ${formatStorageType(item.storage_type)}\n`
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

  const materials = materialsRes.data || []
  const stockItems = stockRes.data || []

  // Group stok produk
  const productStock: Record<string, { name: string; unit: string; total: number }> = {}
  stockItems.forEach((s: {
    product_id: string
    quantity_remaining: number
    products: { name: string; unit: string } | null
  }) => {
    if (!productStock[s.product_id]) {
      productStock[s.product_id] = {
        name: (s.products as { name: string; unit: string } | null)?.name || 'Unknown',
        unit: (s.products as { name: string; unit: string } | null)?.unit || 'unit',
        total: 0,
      }
    }
    productStock[s.product_id].total += s.quantity_remaining
  })

  const lowProducts = Object.values(productStock).filter(p => p.total < 5)
  const lowMaterials = materials.filter((m: { current_stock: number; min_stock_alert: number }) =>
    m.current_stock <= m.min_stock_alert
  )
  const criticalMaterials = materials.filter((m: { current_stock: number }) => m.current_stock === 0)

  if (lowProducts.length === 0 && lowMaterials.length === 0) {
    await ctx.reply('✅ Semua stok aman. Tidak ada yang perlu di-restock saat ini.')
    return
  }

  let text = `🔄 *Rekomendasi Restock*\n`
  text += `_${format(new Date(), 'dd MMM yyyy, HH:mm')}_\n\n`

  if (criticalMaterials.length > 0) {
    text += `🚨 *DARURAT - Bahan Habis:*\n`
    criticalMaterials.forEach((m: { name: string; unit: string }) => {
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

  const normalLowMaterials = lowMaterials.filter((m: { current_stock: number }) => m.current_stock > 0)
  if (normalLowMaterials.length > 0) {
    text += `🥕 *Bahan Baku Menipis:*\n`
    normalLowMaterials.forEach((m: { name: string; current_stock: number; min_stock_alert: number; unit: string; cost_per_unit: number }) => {
      const deficiency = m.min_stock_alert - m.current_stock
      text += `🟡 ${m.name}: ${m.current_stock}/${m.min_stock_alert} ${m.unit}\n`
      text += `   Perlu beli: ~${deficiency * 2} ${m.unit} (${formatRupiah(deficiency * 2 * m.cost_per_unit)})\n`
    })
  }

  await ctx.replyWithMarkdown(text)
}
