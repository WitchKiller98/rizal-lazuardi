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

// Handler untuk /jual [produk] [qty]
export async function handleJual(ctx: Context): Promise<void> {
  if (!('text' in ctx.message!)) return
  
  const parts = ctx.message.text.split(' ').slice(1)
  
  if (parts.length < 2) {
    await ctx.reply('❌ Format: /jual [nama produk] [jumlah]\nContoh: /jual "MPASI Ayam" 3')
    return
  }

  const qty = parseInt(parts[parts.length - 1])
  if (isNaN(qty) || qty < 1) {
    await ctx.reply('❌ Jumlah tidak valid. Harus berupa angka positif.')
    return
  }

  const productQuery = parts.slice(0, -1).join(' ').replace(/"/g, '')
  const supabase = getSupabaseClient()
  
  if (!supabase) {
    await ctx.reply('❌ Database tidak dikonfigurasi.')
    return
  }

  await ctx.reply(`🔍 Mencari produk "${productQuery}"...`)

  // Cari produk
  const { data: products } = await supabase
    .from('products')
    .select('id, name, selling_price, unit')
    .ilike('name', `%${productQuery}%`)
    .eq('is_active', true)
    .limit(3)

  if (!products || products.length === 0) {
    await ctx.reply(`❌ Produk "${productQuery}" tidak ditemukan.\nGunakan /stok untuk melihat daftar produk.`)
    return
  }

  if (products.length > 1) {
    let text = `🔍 Ditemukan beberapa produk:\n\n`
    products.forEach((p: { name: string; selling_price: number }, i: number) => {
      text += `${i + 1}. ${p.name} - ${formatRupiah(p.selling_price)}\n`
    })
    text += `\nCoba lebih spesifik. Contoh: /jual "${products[0].name}" ${qty}`
    await ctx.reply(text)
    return
  }

  const product = products[0]

  // Cek stok FIFO
  const { data: stockItems } = await supabase
    .from('stock_items')
    .select('id, quantity_remaining, expiry_date')
    .eq('product_id', product.id)
    .eq('is_active', true)
    .gt('expiry_date', format(new Date(), 'yyyy-MM-dd'))
    .gt('quantity_remaining', 0)
    .order('production_date', { ascending: true })

  const totalStock = (stockItems || []).reduce((sum: number, s: { quantity_remaining: number }) => sum + s.quantity_remaining, 0)

  if (totalStock < qty) {
    await ctx.reply(`❌ Stok *${product.name}* tidak cukup.\nStok tersedia: ${totalStock} ${product.unit}`)
    return
  }

  // Buat order
  const orderNumber = `ORD-${format(new Date(), 'yyyyMMdd')}-TG${Date.now().toString().slice(-4)}`
  const subtotal = product.selling_price * qty

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      status: 'confirmed',
      subtotal,
      total_amount: subtotal,
      payment_method: 'tunai',
      delivery_method: 'ambil_sendiri',
    })
    .select()
    .single()

  if (orderError || !order) {
    await ctx.reply(`❌ Gagal mencatat penjualan: ${orderError?.message}`)
    return
  }

  const { data: orderItem } = await supabase
    .from('order_items')
    .insert({
      order_id: order.id,
      product_id: product.id,
      quantity: qty,
      unit_price: product.selling_price,
      subtotal,
    })
    .select()
    .single()

  // Kurangi stok FIFO
  let remainingQty = qty
  for (const batch of (stockItems || [])) {
    if (remainingQty <= 0) break
    const taken = Math.min(remainingQty, batch.quantity_remaining)
    remainingQty -= taken

    if (orderItem) {
      await supabase.from('order_item_stock').insert({
        order_item_id: orderItem.id,
        stock_item_id: batch.id,
        quantity_taken: taken,
      })
    }

    const newQty = batch.quantity_remaining - taken
    await supabase
      .from('stock_items')
      .update({ quantity_remaining: newQty, is_active: newQty > 0 })
      .eq('id', batch.id)
  }

  const successText = 
    `✅ *Penjualan Dicatat!*\n\n` +
    `📦 ${product.name}\n` +
    `Qty: ${qty} ${product.unit}\n` +
    `💰 Total: *${formatRupiah(subtotal)}*\n` +
    `🔖 No. Pesanan: \`${orderNumber}\`\n\n` +
    `_Stok diperbarui secara otomatis_`

  await ctx.replyWithMarkdown(successText)
}
