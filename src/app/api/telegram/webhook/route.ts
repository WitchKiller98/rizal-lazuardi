import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate, getExpiryStatus, getDaysUntilExpiry, formatStorageType } from '@/lib/utils'
import { format } from 'date-fns'

// Handler webhook Telegram Bot
export async function POST(request: NextRequest) {
  try {
    // Verifikasi webhook secret jika dikonfigurasi
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET
    if (secret) {
      const headerSecret = request.headers.get('X-Telegram-Bot-Api-Secret-Token')
      if (headerSecret !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const body = await request.json()
    const message = body.message || body.callback_query?.message

    if (!message) {
      return NextResponse.json({ ok: true })
    }

    const chatId = message.chat?.id
    const text = (body.message?.text || '').trim()

    if (!chatId || !text) {
      return NextResponse.json({ ok: true })
    }

    // Proses perintah bot
    const response = await processCommand(text, chatId)
    
    if (response) {
      await sendTelegramMessage(chatId, response)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Telegram webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Kirim pesan ke Telegram
async function sendTelegramMessage(chatId: number, text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) {
    console.warn('TELEGRAM_BOT_TOKEN not set')
    return
  }

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    }),
  })
}

// Proses perintah dari pengguna
async function processCommand(text: string, chatId: number): Promise<string | null> {
  const parts = text.split(' ')
  const command = parts[0].toLowerCase()
  const args = parts.slice(1)

  const supabase = createAdminClient()
  if (!supabase) {
    return '❌ Database tidak dikonfigurasi. Silakan setup Supabase terlebih dahulu.'
  }

  switch (command) {
    case '/start':
    case '/menu':
      return getMenuText()

    case '/stok':
      return await getStokProduk(supabase)

    case '/stokbahan':
      return await getStokBahan(supabase)

    case '/laporan':
      return await getLaporanHarian(supabase)

    case '/expired':
      return await getExpiredAlert(supabase)

    case '/restock':
      return await getRestockRekomendasi(supabase)

    case '/pelanggan':
      if (args.length === 0) return '❌ Contoh: /pelanggan Sari atau /pelanggan 0812xxxx'
      return await cariPelanggan(supabase, args.join(' '))

    case '/jual':
      if (args.length < 2) return '❌ Contoh: /jual "MPASI Ayam" 3'
      return await catatPenjualanCepat(supabase, args)

    default:
      if (text.startsWith('/')) {
        return `❓ Perintah tidak dikenal: ${command}\n\nKetik /menu untuk melihat daftar perintah.`
      }
      return null
  }
}

function getMenuText(): string {
  return `🍱 *MPASI POS Bot*

Selamat datang! Berikut perintah yang tersedia:

📦 *Stok & Inventori*
/stok - Cek stok produk MPASI
/stokbahan - Cek stok bahan baku
/expired - Produk yang akan kedaluwarsa
/restock - Rekomendasi restock

💰 *Penjualan*
/jual [produk] [qty] - Catat penjualan cepat
/laporan - Laporan penjualan hari ini

👥 *Pelanggan*
/pelanggan [nama/telp] - Cari pelanggan

_MPASI POS - Dapur Sehat_`
}

async function getStokProduk(supabase: ReturnType<typeof createAdminClient>): Promise<string> {
  if (!supabase) return '❌ Database error'
  
  const { data: stockData } = await supabase
    .from('stock_items')
    .select('product_id, quantity_remaining, expiry_date, products(name, unit)')
    .eq('is_active', true)
    .gt('quantity_remaining', 0)
    .order('expiry_date')

  if (!stockData || stockData.length === 0) {
    return '📦 Tidak ada stok produk saat ini.'
  }

  // Group by product
  const productStock: Record<string, { name: string; unit: string; total: number; nearestExpiry: string }> = {}
  stockData.forEach((item: {
    product_id: string
    quantity_remaining: number
    expiry_date: string
    products: { name: string; unit: string } | null
  }) => {
    const product = item.products as { name: string; unit: string } | null
    if (!productStock[item.product_id]) {
      productStock[item.product_id] = {
        name: product?.name || 'Unknown',
        unit: product?.unit || 'unit',
        total: 0,
        nearestExpiry: item.expiry_date,
      }
    }
    productStock[item.product_id].total += item.quantity_remaining
    if (item.expiry_date < productStock[item.product_id].nearestExpiry) {
      productStock[item.product_id].nearestExpiry = item.expiry_date
    }
  })

  let text = `📦 *Stok Produk MPASI*\n`
  text += `_${format(new Date(), 'dd MMM yyyy, HH:mm')}_\n\n`

  Object.values(productStock).forEach(p => {
    const status = getExpiryStatus(p.nearestExpiry)
    const emoji = status === 'expired' ? '🔴' : status === 'critical' ? '🟠' : status === 'warning' ? '🟡' : '🟢'
    const days = getDaysUntilExpiry(p.nearestExpiry)
    text += `${emoji} *${p.name}*\n`
    text += `   Stok: ${p.total} ${p.unit}\n`
    text += `   Exp terdekat: ${formatDate(p.nearestExpiry)}`
    if (days < 14) text += ` _(${days} hari lagi)_`
    text += '\n\n'
  })

  return text
}

async function getStokBahan(supabase: ReturnType<typeof createAdminClient>): Promise<string> {
  if (!supabase) return '❌ Database error'
  
  const { data } = await supabase
    .from('raw_materials')
    .select('name, current_stock, min_stock_alert, unit')
    .eq('is_active', true)
    .order('name')

  if (!data || data.length === 0) {
    return '🥕 Tidak ada data bahan baku.'
  }

  let text = `🥕 *Stok Bahan Baku*\n`
  text += `_${format(new Date(), 'dd MMM yyyy, HH:mm')}_\n\n`

  data.forEach((m: { name: string; current_stock: number; min_stock_alert: number; unit: string }) => {
    const isLow = m.current_stock <= m.min_stock_alert
    const isEmpty = m.current_stock === 0
    const emoji = isEmpty ? '🔴' : isLow ? '🟡' : '🟢'
    text += `${emoji} *${m.name}*: ${m.current_stock} ${m.unit}`
    if (isLow) text += ` ⚠️`
    text += '\n'
  })

  return text
}

async function getLaporanHarian(supabase: ReturnType<typeof createAdminClient>): Promise<string> {
  if (!supabase) return '❌ Database error'
  
  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString()

  const { data: orders } = await supabase
    .from('orders')
    .select('*, order_items(*, products(name))')
    .gte('order_date', todayStart)
    .lte('order_date', todayEnd)
    .not('status', 'in', '(cancelled,voided)')

  if (!orders || orders.length === 0) {
    return `📊 *Laporan ${format(today, 'dd MMM yyyy')}*\n\nBelum ada penjualan hari ini.`
  }

  const totalRevenue = orders.reduce((sum: number, o: { total_amount: number }) => sum + o.total_amount, 0)
  const productSales: Record<string, number> = {}
  
  orders.forEach((order: { order_items: { products: { name: string } | null; quantity: number }[] }) => {
    order.order_items?.forEach((item) => {
      const name = (item.products as { name: string } | null)?.name || 'Unknown'
      productSales[name] = (productSales[name] || 0) + item.quantity
    })
  })

  let text = `📊 *Laporan Penjualan ${format(today, 'dd MMM yyyy')}*\n\n`
  text += `💰 Total Pendapatan: *${formatCurrency(totalRevenue)}*\n`
  text += `🛒 Jumlah Pesanan: *${orders.length}*\n\n`
  text += `📦 *Produk Terjual:*\n`
  
  Object.entries(productSales)
    .sort(([, a], [, b]) => b - a)
    .forEach(([name, qty]) => {
      text += `• ${name}: ${qty} unit\n`
    })

  return text
}

async function getExpiredAlert(supabase: ReturnType<typeof createAdminClient>): Promise<string> {
  if (!supabase) return '❌ Database error'
  
  const sevenDaysLater = format(new Date(Date.now() + 7 * 86400000), 'yyyy-MM-dd')
  
  const { data } = await supabase
    .from('stock_items')
    .select('product_id, quantity_remaining, expiry_date, storage_type, products(name)')
    .eq('is_active', true)
    .lte('expiry_date', sevenDaysLater)
    .gt('quantity_remaining', 0)
    .order('expiry_date')

  if (!data || data.length === 0) {
    return '✅ Tidak ada produk yang akan kedaluwarsa dalam 7 hari ke depan.'
  }

  let text = `⚠️ *Alert Kedaluwarsa*\n`
  text += `_Produk dalam 7 hari ke depan_\n\n`

  data.forEach((item: {
    quantity_remaining: number
    expiry_date: string
    storage_type: string
    products: { name: string } | null
  }) => {
    const days = getDaysUntilExpiry(item.expiry_date)
    const status = getExpiryStatus(item.expiry_date)
    const emoji = status === 'expired' ? '🔴' : status === 'critical' ? '🟠' : '🟡'
    const name = (item.products as { name: string } | null)?.name || 'Unknown'
    
    text += `${emoji} *${name}*\n`
    text += `   Stok: ${item.quantity_remaining} unit | ${formatStorageType(item.storage_type as 'frozen' | 'fridge' | 'room_temp')}\n`
    text += `   Kedaluwarsa: ${formatDate(item.expiry_date)}`
    if (days < 0) text += ` _(SUDAH KEDALUWARSA)_`
    else if (days === 0) text += ` _(HARI INI)_`
    else text += ` _(${days} hari lagi)_`
    text += '\n\n'
  })

  return text
}

async function getRestockRekomendasi(supabase: ReturnType<typeof createAdminClient>): Promise<string> {
  if (!supabase) return '❌ Database error'
  
  const { data: materials } = await supabase
    .from('raw_materials')
    .select('name, current_stock, min_stock_alert, unit')
    .eq('is_active', true)

  const lowStock = (materials || []).filter((m: { current_stock: number; min_stock_alert: number }) =>
    m.current_stock <= m.min_stock_alert
  )

  const { data: stockItems } = await supabase
    .from('stock_items')
    .select('product_id, quantity_remaining, products(name, unit)')
    .eq('is_active', true)
    .gt('quantity_remaining', 0)

  // Aggregate stok per produk
  const productStock: Record<string, { name: string; unit: string; total: number }> = {}
  ;(stockItems || []).forEach((s: {
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

  let text = `🔄 *Rekomendasi Restock*\n\n`

  if (lowProducts.length > 0) {
    text += `📦 *Produk Stok Rendah (< 5 unit):*\n`
    lowProducts.forEach(p => {
      text += `• ${p.name}: ${p.total} ${p.unit} - *Perlu produksi!*\n`
    })
    text += '\n'
  }

  if (lowStock.length > 0) {
    text += `🥕 *Bahan Baku Hampir Habis:*\n`
    lowStock.forEach((m: { name: string; current_stock: number; min_stock_alert: number; unit: string }) => {
      const emoji = m.current_stock === 0 ? '🔴' : '🟡'
      text += `${emoji} ${m.name}: ${m.current_stock}/${m.min_stock_alert} ${m.unit} - *Segera beli!*\n`
    })
  }

  if (lowProducts.length === 0 && lowStock.length === 0) {
    text += '✅ Semua stok dalam kondisi aman. Tidak ada yang perlu di-restock saat ini.'
  }

  return text
}

async function cariPelanggan(supabase: ReturnType<typeof createAdminClient>, query: string): Promise<string> {
  if (!supabase) return '❌ Database error'
  
  const { data } = await supabase
    .from('customers')
    .select('name, phone, address, total_orders, total_spent, last_order_date, notes')
    .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
    .limit(5)

  if (!data || data.length === 0) {
    return `❓ Pelanggan "${query}" tidak ditemukan.`
  }

  let text = `👥 *Hasil Pencarian: "${query}"*\n\n`
  
  data.forEach((c: {
    name: string
    phone?: string
    address?: string
    total_orders: number
    total_spent: number
    last_order_date?: string
    notes?: string
  }) => {
    text += `👤 *${c.name}*\n`
    if (c.phone) text += `📱 ${c.phone}\n`
    if (c.address) text += `📍 ${c.address}\n`
    text += `🛒 ${c.total_orders} pesanan | ${formatCurrency(c.total_spent)}\n`
    if (c.last_order_date) text += `📅 Terakhir order: ${formatDate(c.last_order_date)}\n`
    if (c.notes) text += `📝 ${c.notes}\n`
    text += '\n'
  })

  return text
}

async function catatPenjualanCepat(
  supabase: ReturnType<typeof createAdminClient>,
  args: string[]
): Promise<string> {
  if (!supabase) return '❌ Database error'
  
  const qty = parseInt(args[args.length - 1])
  if (isNaN(qty) || qty < 1) return '❌ Jumlah tidak valid. Contoh: /jual "MPASI Ayam" 3'
  
  const productName = args.slice(0, -1).join(' ').replace(/"/g, '')
  
  const { data: products } = await supabase
    .from('products')
    .select('id, name, selling_price')
    .ilike('name', `%${productName}%`)
    .eq('is_active', true)
    .limit(1)

  if (!products || products.length === 0) {
    return `❌ Produk "${productName}" tidak ditemukan. Cek nama produk dengan /stok`
  }

  const product = products[0]

  // Cek stok tersedia
  const { data: stockItems } = await supabase
    .from('stock_items')
    .select('id, quantity_remaining')
    .eq('product_id', product.id)
    .eq('is_active', true)
    .gt('expiry_date', format(new Date(), 'yyyy-MM-dd'))
    .gt('quantity_remaining', 0)
    .order('production_date', { ascending: true })

  const totalStock = (stockItems || []).reduce((sum: number, s: { quantity_remaining: number }) => sum + s.quantity_remaining, 0)
  
  if (totalStock < qty) {
    return `❌ Stok *${product.name}* tidak cukup.\nStok tersedia: ${totalStock} unit`
  }

  // Buat order
  const orderNumber = `ORD-${format(new Date(), 'yyyyMMdd')}-TG${Date.now().toString().slice(-4)}`
  const total = product.selling_price * qty

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      status: 'confirmed',
      subtotal: total,
      total_amount: total,
      payment_method: 'tunai',
      delivery_method: 'ambil_sendiri',
    })
    .select()
    .single()

  if (error) return `❌ Gagal mencatat penjualan: ${error.message}`

  await supabase.from('order_items').insert({
    order_id: order.id,
    product_id: product.id,
    quantity: qty,
    unit_price: product.selling_price,
    subtotal: total,
  })

  return `✅ *Penjualan Dicatat!*\n\n📦 ${product.name}\nQty: ${qty} unit\n💰 Total: *${formatCurrency(total)}*\n🔖 No: ${orderNumber}`
}
