-- ============================================================
-- MPASI POS - Skema Database Awal
-- Sistem POS dan Manajemen Inventori untuk Bisnis MPASI
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABEL PROFIL PENGGUNA
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'kasir', 'gudang')) DEFAULT 'kasir',
  telegram_chat_id TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABEL BAHAN BAKU
-- ============================================================
CREATE TABLE raw_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  unit TEXT NOT NULL, -- gram, ml, pcs, kg, liter, dll
  current_stock DECIMAL(10,3) DEFAULT 0,
  min_stock_alert DECIMAL(10,3) DEFAULT 0, -- batas minimum untuk alert
  cost_per_unit DECIMAL(12,2) DEFAULT 0, -- biaya per satuan unit
  supplier_info TEXT, -- informasi supplier
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABEL PRODUK MPASI
-- ============================================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'mpasi', -- mpasi, camilan, minuman, dll
  selling_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'porsi', -- porsi, pcs, pack, dll
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  -- Shelf life berdasarkan metode penyimpanan
  shelf_life_freezer_days INTEGER DEFAULT 30, -- masa simpan di freezer (hari)
  shelf_life_fridge_days INTEGER DEFAULT 3, -- masa simpan di kulkas (hari)
  shelf_life_room_temp_hours INTEGER DEFAULT 4, -- masa simpan suhu ruang (jam)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABEL RESEP PRODUK (Bill of Materials)
-- ============================================================
CREATE TABLE product_recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  raw_material_id UUID NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
  quantity_needed DECIMAL(10,3) NOT NULL, -- jumlah bahan per 1 unit produk
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, raw_material_id)
);

-- ============================================================
-- TABEL BATCH PRODUKSI
-- ============================================================
CREATE TABLE production_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_number TEXT NOT NULL UNIQUE, -- nomor batch, misal: BATCH-20240101-001
  production_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  total_hpp DECIMAL(12,2) DEFAULT 0, -- total HPP batch ini
  status TEXT DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABEL ITEM BATCH PRODUKSI
-- ============================================================
CREATE TABLE production_batch_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity_produced INTEGER NOT NULL, -- jumlah unit yang diproduksi
  hpp_per_unit DECIMAL(12,2) NOT NULL, -- HPP per unit = (total_raw_material_cost × 3) / quantity_produced
  production_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  storage_type TEXT NOT NULL CHECK (storage_type IN ('frozen', 'fridge', 'room_temp')),
  raw_material_cost DECIMAL(12,2) DEFAULT 0, -- total biaya bahan baku untuk item ini
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABEL STOK PRODUK (FIFO tracking per batch)
-- ============================================================
CREATE TABLE stock_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id),
  batch_id UUID REFERENCES production_batches(id),
  quantity_remaining INTEGER NOT NULL DEFAULT 0,
  production_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  storage_type TEXT NOT NULL CHECK (storage_type IN ('frozen', 'fridge', 'room_temp')),
  hpp_per_unit DECIMAL(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true, -- false jika stok habis
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk query FIFO (urut berdasarkan tanggal produksi, terlama duluan)
CREATE INDEX idx_stock_items_fifo ON stock_items(product_id, production_date ASC, is_active);
CREATE INDEX idx_stock_items_expiry ON stock_items(expiry_date, is_active);

-- ============================================================
-- TABEL PELANGGAN
-- ============================================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  notes TEXT,
  telegram_chat_id TEXT,
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  last_order_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_name ON customers(name);

-- ============================================================
-- TABEL PESANAN/TRANSAKSI
-- ============================================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL UNIQUE, -- nomor pesanan, misal: ORD-20240101-001
  customer_id UUID REFERENCES customers(id),
  order_date TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'delivered', 'cancelled', 'voided')),
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'tunai' CHECK (payment_method IN ('tunai', 'transfer', 'qris', 'cod')),
  delivery_method TEXT DEFAULT 'grab_express' CHECK (delivery_method IN ('grab_express', 'go_delivery', 'kurir_lokal', 'kurir_sendiri', 'ambil_sendiri')),
  delivery_address TEXT,
  delivery_fee DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  void_reason TEXT, -- alasan void/batal
  voided_at TIMESTAMPTZ,
  voided_by UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_date ON orders(order_date DESC);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);

-- ============================================================
-- TABEL ITEM PESANAN
-- ============================================================
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL, -- harga jual saat transaksi
  hpp_at_sale DECIMAL(12,2) DEFAULT 0, -- HPP saat penjualan (untuk kalkulasi profit)
  subtotal DECIMAL(12,2) NOT NULL, -- quantity × unit_price
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABEL TRACKING FIFO STOK YANG DIAMBIL PER ITEM PESANAN
-- ============================================================
CREATE TABLE order_item_stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  stock_item_id UUID NOT NULL REFERENCES stock_items(id),
  quantity_taken INTEGER NOT NULL, -- jumlah yang diambil dari batch ini
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABEL PENYESUAIAN STOK
-- ============================================================
CREATE TABLE stock_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id),
  raw_material_id UUID REFERENCES raw_materials(id),
  quantity DECIMAL(10,3) NOT NULL, -- positif = tambah, negatif = kurang
  reason TEXT NOT NULL,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('waste', 'error', 'return', 'expired', 'other', 'restock')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABEL PEMBELIAN BAHAN BAKU
-- ============================================================
CREATE TABLE raw_material_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  raw_material_id UUID NOT NULL REFERENCES raw_materials(id),
  quantity DECIMAL(10,3) NOT NULL,
  unit_cost DECIMAL(12,2) NOT NULL, -- biaya per unit
  total_cost DECIMAL(12,2) NOT NULL, -- quantity × unit_cost
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  supplier TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FUNGSI DAN TRIGGER
-- ============================================================

-- Fungsi update timestamp otomatis
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger untuk auto-update updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_raw_materials_updated_at BEFORE UPDATE ON raw_materials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_production_batches_updated_at BEFORE UPDATE ON production_batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_items_updated_at BEFORE UPDATE ON stock_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- FUNGSI KALKULASI HPP
-- Rumus: (total_biaya_bahan_baku × 3) ÷ jumlah_unit_produksi
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_hpp(
  total_raw_material_cost DECIMAL,
  units_produced INTEGER
) RETURNS DECIMAL AS $$
BEGIN
  IF units_produced = 0 THEN
    RETURN 0;
  END IF;
  RETURN (total_raw_material_cost * 3) / units_produced;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_batch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_material_purchases ENABLE ROW LEVEL SECURITY;

-- Policy: semua user yang sudah login bisa baca semua data
CREATE POLICY "Authenticated users can read all data" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Policy untuk tabel lain: semua authenticated user bisa CRUD
DO $$ 
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['raw_materials', 'products', 'product_recipes', 
    'production_batches', 'production_batch_items', 'stock_items', 
    'customers', 'orders', 'order_items', 'order_item_stock', 
    'stock_adjustments', 'raw_material_purchases']
  LOOP
    EXECUTE format('CREATE POLICY "Authenticated users full access" ON %I
      FOR ALL USING (auth.role() = ''authenticated'')', tbl);
  END LOOP;
END $$;

-- ============================================================
-- DATA AWAL (SEED DATA)
-- ============================================================

-- Kategori produk default sudah tercantum di constraint
-- Tidak ada seed data wajib, admin akan input manual

COMMENT ON TABLE profiles IS 'Profil pengguna aplikasi MPASI POS';
COMMENT ON TABLE raw_materials IS 'Master data bahan baku produksi MPASI';
COMMENT ON TABLE products IS 'Master data produk MPASI yang dijual';
COMMENT ON TABLE product_recipes IS 'Resep/BOM (Bill of Materials) produk - bahan baku yang dibutuhkan';
COMMENT ON TABLE production_batches IS 'Batch produksi MPASI';
COMMENT ON TABLE production_batch_items IS 'Detail item per batch produksi dengan HPP';
COMMENT ON TABLE stock_items IS 'Stok produk per batch dengan tracking FIFO dan expiry';
COMMENT ON TABLE customers IS 'Data pelanggan';
COMMENT ON TABLE orders IS 'Transaksi pesanan/penjualan';
COMMENT ON TABLE order_items IS 'Detail item per pesanan';
COMMENT ON TABLE order_item_stock IS 'Tracking FIFO - stok batch mana yang diambil per item pesanan';
COMMENT ON TABLE stock_adjustments IS 'Penyesuaian stok manual (waste, error, return, expired)';
COMMENT ON TABLE raw_material_purchases IS 'Pembelian/restock bahan baku';
