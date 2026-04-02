import * as dotenv from 'dotenv'
import * as path from 'path'
// Load .env.local dulu sebelum apapun
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

import { Telegraf } from 'telegraf'
import { message } from 'telegraf/filters'
import { handleStok, handleStokBahan } from './handlers/stock'
import { handleJual } from './handlers/orders'
import { handleLaporan } from './handlers/reports'
import { handleExpired, handleRestock } from './handlers/alerts'

// ============================================================
// MPASI POS - Telegram Bot
// Bot Telegram standalone untuk manajemen MPASI POS
// Jalankan dengan: npm run bot
// ============================================================

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

if (!BOT_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN tidak dikonfigurasi!')
  process.exit(1)
}

const bot = new Telegraf(BOT_TOKEN)

// ============================================================
// MIDDLEWARE
// ============================================================
bot.use(async (ctx, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  console.log(`[${new Date().toISOString()}] ${ctx.from?.username || ctx.from?.id}: ${ctx.message && 'text' in ctx.message ? ctx.message.text : 'callback'} (${ms}ms)`)
})

// ============================================================
// PERINTAH BOT
// ============================================================

// Perintah /start - tampilkan menu
bot.start(async (ctx) => {
  const name = ctx.from?.first_name || 'Admin'
  await ctx.replyWithMarkdown(
    `🍱 *Halo ${name}!*\n\n` +
    `Selamat datang di *MPASI POS Bot*\n\n` +
    `Berikut perintah yang tersedia:\n\n` +
    `📦 *Stok & Inventori*\n` +
    `/stok - Cek stok produk MPASI\n` +
    `/stokbahan - Cek stok bahan baku\n` +
    `/expired - Produk kedaluwarsa\n` +
    `/restock - Rekomendasi restock\n\n` +
    `💰 *Penjualan*\n` +
    `/jual [produk] [qty] - Catat penjualan\n` +
    `/laporan - Laporan hari ini\n\n` +
    `👥 *Pelanggan*\n` +
    `/pelanggan [nama/telp] - Cari pelanggan\n\n` +
    `_MPASI POS - Sistem Kasir & Inventori_`
  )
})

// Stok produk
bot.command('stok', handleStok)

// Stok bahan baku
bot.command('stokbahan', handleStokBahan)

// Laporan harian
bot.command('laporan', handleLaporan)

// Alert produk expired
bot.command('expired', handleExpired)

// Rekomendasi restock
bot.command('restock', handleRestock)

// Catat penjualan cepat
bot.command('jual', handleJual)

// Cari pelanggan
bot.command('pelanggan', async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1).join(' ')
  if (!args) {
    return ctx.reply('❌ Masukkan nama atau nomor HP pelanggan.\nContoh: /pelanggan Sari atau /pelanggan 0812xxxx')
  }
  
  // Forward ke webhook handler
  const webhookUrl = process.env.NEXT_PUBLIC_APP_URL
  if (webhookUrl) {
    await ctx.reply('🔍 Mencari pelanggan...')
  } else {
    await ctx.reply(`🔍 Mencari pelanggan "${args}"...\n\n⚠️ Fitur ini memerlukan koneksi ke server aplikasi.`)
  }
})

// Pesan tidak dikenal
bot.on(message('text'), async (ctx) => {
  if (!ctx.message.text.startsWith('/')) {
    await ctx.reply('Ketik /start untuk melihat menu perintah yang tersedia.')
  }
})

// ============================================================
// ERROR HANDLING
// ============================================================
bot.catch((err, ctx) => {
  console.error(`Error untuk update ${ctx.updateType}:`, err)
  ctx.reply('❌ Terjadi kesalahan. Silakan coba lagi.')
})

// ============================================================
// LAUNCH BOT
// ============================================================
const appUrl = process.env.NEXT_PUBLIC_APP_URL

if (appUrl && process.env.NODE_ENV === 'production') {
  // Mode production: gunakan webhook
  const webhookPath = '/api/telegram/webhook'
  bot.launch({
    webhook: {
      domain: appUrl,
      path: webhookPath,
      secretToken: process.env.TELEGRAM_WEBHOOK_SECRET,
    }
  }).then(() => {
    console.log(`Bot berjalan dengan webhook: ${appUrl}${webhookPath}`)
  })
} else {
  // Mode development: polling
  bot.launch().then(() => {
    console.log('Bot Telegram MPASI POS berjalan (mode polling)...')
    console.log('Tekan Ctrl+C untuk berhenti')
  })
}

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
