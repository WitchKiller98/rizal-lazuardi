# MPASI POS - Sistem Kasir & Inventori

Sistem POS (Point of Sale) dan manajemen inventori lengkap untuk bisnis MPASI (Makanan Pendamping ASI) dengan dukungan offline PWA dan bot Telegram.

## Fitur Utama

- **POS/Kasir** - Catat transaksi penjualan dengan antarmuka cepat
- **Inventori Produk** - Kelola stok produk MPASI dengan tracking FIFO
- **Bahan Baku** - Manajemen stok bahan baku dan pembelian
- **Produksi** - Batch produksi dengan kalkulasi HPP otomatis
- **Pelanggan** - Database pelanggan, riwayat pembelian, loyalitas
- **Laporan** - Analitik penjualan, produk terlaris, tren pendapatan
- **Alert Expiry** - Notifikasi produk mendekati kedaluwarsa
- **Restock** - Rekomendasi restock berdasarkan data penjualan
- **Telegram Bot** - Kelola bisnis dari Telegram
- **PWA** - Bisa diinstall di HP, support offline

## Tech Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** + shadcn/ui components
- **Supabase** (PostgreSQL database + auth)
- **Dexie.js** (IndexedDB untuk offline support)
- **next-pwa** (PWA support)
- **Telegraf** (Telegram bot)
- **Recharts** (grafik analitik)

## Setup

### 1. Clone dan Install Dependencies

```bash
git clone <repository-url>
cd mpasi-pos
npm install
```

### 2. Setup Supabase

1. Buat project baru di [supabase.com](https://supabase.com)
2. Jalankan migration SQL di Supabase SQL Editor:
   ```
   supabase/migrations/001_initial_schema.sql
   ```
3. Buat user pertama di Authentication > Users

### 3. Konfigurasi Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
TELEGRAM_BOT_TOKEN=1234567890:ABCxxx
TELEGRAM_WEBHOOK_SECRET=random_secret_string
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### 4. Jalankan Aplikasi

```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

### 5. Setup Telegram Bot

1. Chat @BotFather di Telegram
2. Buat bot baru dengan `/newbot`
3. Copy token ke `TELEGRAM_BOT_TOKEN`
4. Set webhook URL di Pengaturan > Telegram Bot
5. Atau jalankan bot standalone:
   ```bash
   npm run bot:dev
   ```

## Struktur Database

### Tabel Utama

| Tabel | Deskripsi |
|-------|-----------|
| `profiles` | Pengguna aplikasi (admin, kasir, gudang) |
| `raw_materials` | Master data bahan baku |
| `products` | Master data produk MPASI |
| `product_recipes` | Resep/BOM produk |
| `production_batches` | Batch produksi |
| `production_batch_items` | Detail item per batch |
| `stock_items` | Stok produk per batch (FIFO) |
| `customers` | Data pelanggan |
| `orders` | Transaksi pesanan |
| `order_items` | Detail item per pesanan |
| `order_item_stock` | Tracking FIFO stok per item |
| `stock_adjustments` | Penyesuaian stok manual |
| `raw_material_purchases` | Pembelian bahan baku |

## Kalkulasi HPP

HPP (Harga Pokok Produksi) dihitung otomatis saat produksi:

```
HPP/unit = (Total Biaya Bahan Baku × 3) ÷ Jumlah Unit Produksi
```

Contoh:
- Produksi 20 porsi MPASI Ayam Brokoli
- Biaya bahan baku = Rp 100.000
- HPP/unit = (100.000 × 3) ÷ 20 = **Rp 15.000/porsi**

## FIFO Stock Method

Saat ada penjualan, stok yang diambil adalah batch dengan `production_date` paling lama (terlama duluan). Ini dicatat di tabel `order_item_stock` untuk audit trail.

## Perintah Telegram Bot

| Perintah | Fungsi |
|----------|--------|
| `/start` | Tampilkan menu |
| `/stok` | Cek stok produk |
| `/stokbahan` | Cek stok bahan baku |
| `/jual [produk] [qty]` | Catat penjualan cepat |
| `/laporan` | Laporan penjualan hari ini |
| `/expired` | Produk kedaluwarsa |
| `/restock` | Rekomendasi restock |
| `/pelanggan [query]` | Cari pelanggan |

## Warna Indikator Expiry

| Warna | Status | Keterangan |
|-------|--------|------------|
| 🔴 Merah | Expired | Sudah kedaluwarsa |
| 🟠 Oranye | Kritis | < 7 hari |
| 🟡 Kuning | Peringatan | < 14 hari |
| 🟢 Hijau | Aman | > 14 hari |

## Deploy ke Vercel

```bash
vercel deploy
```

Set environment variables di dashboard Vercel.

## Kontribusi

Dibuat untuk mendukung bisnis MPASI rumahan di Indonesia.
