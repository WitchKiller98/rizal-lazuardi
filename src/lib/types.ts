// ============================================================
// MPASI POS - TypeScript Type Definitions
// Semua interface dan tipe data untuk sistem POS MPASI
// ============================================================

// ============================================================
// ENUM TYPES
// ============================================================
export type UserRole = 'admin' | 'kasir' | 'gudang'
export type StorageType = 'frozen' | 'fridge' | 'room_temp'
export type OrderStatus = 'pending' | 'confirmed' | 'delivered' | 'cancelled' | 'voided'
export type PaymentMethod = 'tunai' | 'transfer' | 'qris' | 'cod'
export type DeliveryMethod = 'grab_express' | 'go_delivery' | 'kurir_lokal' | 'kurir_sendiri' | 'ambil_sendiri'
export type AdjustmentType = 'waste' | 'error' | 'return' | 'expired' | 'other' | 'restock'
export type BatchStatus = 'in_progress' | 'completed' | 'cancelled'

// ============================================================
// DATABASE MODELS
// ============================================================

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  telegram_chat_id?: string
  phone?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface RawMaterial {
  id: string
  name: string
  unit: string
  current_stock: number
  min_stock_alert: number
  cost_per_unit: number
  supplier_info?: string
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  name: string
  category: string
  selling_price: number
  unit: string
  is_active: boolean
  description?: string
  shelf_life_freezer_days: number
  shelf_life_fridge_days: number
  shelf_life_room_temp_hours: number
  created_at: string
  updated_at: string
}

export interface ProductRecipe {
  id: string
  product_id: string
  raw_material_id: string
  quantity_needed: number
  notes?: string
  created_at: string
  // Joined fields
  raw_material?: RawMaterial
  product?: Product
}

export interface ProductionBatch {
  id: string
  batch_number: string
  production_date: string
  notes?: string
  total_hpp: number
  status: BatchStatus
  created_by?: string
  created_at: string
  updated_at: string
  // Joined fields
  items?: ProductionBatchItem[]
  created_by_profile?: Profile
}

export interface ProductionBatchItem {
  id: string
  batch_id: string
  product_id: string
  quantity_produced: number
  hpp_per_unit: number
  production_date: string
  expiry_date: string
  storage_type: StorageType
  raw_material_cost: number
  created_at: string
  // Joined fields
  product?: Product
  batch?: ProductionBatch
}

export interface StockItem {
  id: string
  product_id: string
  batch_id?: string
  quantity_remaining: number
  production_date: string
  expiry_date: string
  storage_type: StorageType
  hpp_per_unit: number
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined fields
  product?: Product
  batch?: ProductionBatch
}

export interface Customer {
  id: string
  name: string
  phone?: string
  address?: string
  notes?: string
  telegram_chat_id?: string
  total_orders: number
  total_spent: number
  last_order_date?: string
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined fields
  orders?: Order[]
}

export interface Order {
  id: string
  order_number: string
  customer_id?: string
  order_date: string
  status: OrderStatus
  subtotal: number
  discount_amount: number
  total_amount: number
  payment_method: PaymentMethod
  delivery_method: DeliveryMethod
  delivery_address?: string
  delivery_fee: number
  notes?: string
  void_reason?: string
  voided_at?: string
  voided_by?: string
  created_by?: string
  created_at: string
  updated_at: string
  // Joined fields
  customer?: Customer
  items?: OrderItem[]
  created_by_profile?: Profile
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price: number
  hpp_at_sale: number
  subtotal: number
  created_at: string
  // Joined fields
  product?: Product
  stock_allocations?: OrderItemStock[]
}

export interface OrderItemStock {
  id: string
  order_item_id: string
  stock_item_id: string
  quantity_taken: number
  created_at: string
  // Joined fields
  stock_item?: StockItem
}

export interface StockAdjustment {
  id: string
  product_id?: string
  raw_material_id?: string
  quantity: number
  reason: string
  adjustment_type: AdjustmentType
  notes?: string
  created_by?: string
  created_at: string
  // Joined fields
  product?: Product
  raw_material?: RawMaterial
  created_by_profile?: Profile
}

export interface RawMaterialPurchase {
  id: string
  raw_material_id: string
  quantity: number
  unit_cost: number
  total_cost: number
  purchase_date: string
  supplier?: string
  notes?: string
  created_by?: string
  created_at: string
  // Joined fields
  raw_material?: RawMaterial
}

// ============================================================
// FORM TYPES (untuk react-hook-form + zod)
// ============================================================

export interface CreateOrderForm {
  customer_id?: string
  payment_method: PaymentMethod
  delivery_method: DeliveryMethod
  delivery_address?: string
  delivery_fee: number
  discount_amount: number
  notes?: string
  items: {
    product_id: string
    quantity: number
    unit_price: number
  }[]
}

export interface CreateProductionBatchForm {
  production_date: string
  notes?: string
  items: {
    product_id: string
    quantity_produced: number
    storage_type: StorageType
  }[]
}

export interface CreateProductForm {
  name: string
  category: string
  selling_price: number
  unit: string
  description?: string
  shelf_life_freezer_days: number
  shelf_life_fridge_days: number
  shelf_life_room_temp_hours: number
  recipes: {
    raw_material_id: string
    quantity_needed: number
  }[]
}

export interface CreateRawMaterialForm {
  name: string
  unit: string
  min_stock_alert: number
  cost_per_unit: number
  supplier_info?: string
  notes?: string
}

export interface CreateCustomerForm {
  name: string
  phone?: string
  address?: string
  notes?: string
  telegram_chat_id?: string
}

// ============================================================
// CART/POS TYPES
// ============================================================

export interface CartItem {
  product: Product
  quantity: number
  unit_price: number
  subtotal: number
  // Stok yang tersedia untuk produk ini
  available_stock: number
}

export interface Cart {
  items: CartItem[]
  subtotal: number
  discount_amount: number
  delivery_fee: number
  total_amount: number
  customer?: Customer
  payment_method: PaymentMethod
  delivery_method: DeliveryMethod
  delivery_address?: string
  notes?: string
}

// ============================================================
// ANALYTICS TYPES
// ============================================================

export interface DashboardMetrics {
  today_sales: number
  today_orders: number
  today_revenue: number
  week_revenue: number
  month_revenue: number
  total_products: number
  low_stock_count: number
  expiring_soon_count: number
  expired_count: number
}

export interface SalesDataPoint {
  date: string
  revenue: number
  orders: number
}

export interface TopProduct {
  product_id: string
  product_name: string
  total_quantity: number
  total_revenue: number
}

export interface ExpiryAlert {
  stock_item_id: string
  product_id: string
  product_name: string
  quantity_remaining: number
  expiry_date: string
  days_until_expiry: number
  storage_type: StorageType
  status: 'expired' | 'critical' | 'warning' | 'safe' // critical = <7 hari, warning = <14 hari
}

export interface LowStockAlert {
  product_id?: string
  raw_material_id?: string
  name: string
  current_stock: number
  min_stock_alert: number
  unit: string
  type: 'product' | 'raw_material'
}

export interface RestockRecommendation {
  product_id: string
  product_name: string
  current_stock: number
  avg_daily_sales: number
  days_of_stock_remaining: number
  recommended_production: number
}

// ============================================================
// OFFLINE (DEXIE) TYPES
// ============================================================

export interface OfflineOrder {
  id?: number // Dexie auto-increment
  temp_id: string // UUID lokal sementara
  order_data: CreateOrderForm & {
    order_number: string
    order_date: string
    status: OrderStatus
  }
  synced: boolean
  created_at: string
}

export interface OfflineProduct {
  id: string
  name: string
  category: string
  selling_price: number
  unit: string
  is_active: boolean
  available_stock: number
  cached_at: string
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

// ============================================================
// TELEGRAM BOT TYPES
// ============================================================

export interface TelegramBotState {
  chat_id: string
  state?: string
  data?: Record<string, unknown>
}

export interface TelegramStockReport {
  product_name: string
  total_stock: number
  unit: string
  nearest_expiry?: string
  expiry_status?: 'expired' | 'critical' | 'warning' | 'safe'
}
