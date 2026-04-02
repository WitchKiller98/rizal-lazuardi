import Dexie, { Table } from 'dexie'
import type { OfflineOrder, OfflineProduct } from './types'

// ============================================================
// MPASI POS - Dexie Offline Database
// Database IndexedDB lokal untuk support offline mode
// ============================================================

interface OfflineStockItem {
  id: string
  product_id: string
  quantity_remaining: number
  expiry_date: string
  storage_type: string
  production_date: string
  cached_at: string
}

interface SyncQueue {
  id?: number
  action: 'create_order' | 'update_stock' | 'create_adjustment'
  data: Record<string, unknown>
  attempts: number
  last_attempt?: string
  created_at: string
}

interface CachedCustomer {
  id: string
  name: string
  phone?: string
  address?: string
  total_orders: number
  cached_at: string
}

class MPASIPosDatabase extends Dexie {
  // Tabel offline database
  offlineOrders!: Table<OfflineOrder>
  offlineProducts!: Table<OfflineProduct>
  offlineStockItems!: Table<OfflineStockItem>
  syncQueue!: Table<SyncQueue>
  cachedCustomers!: Table<CachedCustomer>

  constructor() {
    super('mpasi-pos-db')
    
    this.version(1).stores({
      // Pesanan yang dibuat saat offline, belum tersinkronisasi
      offlineOrders: '++id, temp_id, synced, created_at',
      // Cache produk untuk POS saat offline
      offlineProducts: 'id, name, category, is_active, cached_at',
      // Cache stok untuk pengecekan ketersediaan saat offline
      offlineStockItems: 'id, product_id, expiry_date, cached_at',
      // Antrian sinkronisasi ke Supabase
      syncQueue: '++id, action, attempts, created_at',
      // Cache pelanggan untuk pencarian saat offline
      cachedCustomers: 'id, name, phone, cached_at',
    })
  }
}

// Singleton instance
let db: MPASIPosDatabase | null = null

// Lazy initialization untuk menghindari error di SSR
export function getDb(): MPASIPosDatabase {
  if (typeof window === 'undefined') {
    throw new Error('Dexie database hanya bisa digunakan di browser')
  }
  if (!db) {
    db = new MPASIPosDatabase()
  }
  return db
}

// ============================================================
// OPERASI PRODUK OFFLINE
// ============================================================

// Simpan produk ke cache lokal
export async function cacheProducts(products: OfflineProduct[]): Promise<void> {
  const database = getDb()
  const now = new Date().toISOString()
  const productsWithTimestamp = products.map(p => ({ ...p, cached_at: now }))
  await database.offlineProducts.bulkPut(productsWithTimestamp)
}

// Ambil produk dari cache lokal
export async function getCachedProducts(): Promise<OfflineProduct[]> {
  const database = getDb()
  return database.offlineProducts.where('is_active').equals(1).toArray()
}

// ============================================================
// OPERASI PESANAN OFFLINE
// ============================================================

// Simpan pesanan offline
export async function saveOfflineOrder(orderData: Omit<OfflineOrder, 'id'>): Promise<number> {
  const database = getDb()
  return database.offlineOrders.add(orderData)
}

// Ambil semua pesanan offline yang belum tersinkronisasi
export async function getUnsyncedOrders(): Promise<OfflineOrder[]> {
  const database = getDb()
  return database.offlineOrders.where('synced').equals(0).toArray()
}

// Tandai pesanan offline sebagai sudah tersinkronisasi
export async function markOrderSynced(id: number): Promise<void> {
  const database = getDb()
  await database.offlineOrders.update(id, { synced: true })
}

// ============================================================
// SYNC QUEUE
// ============================================================

// Tambah ke antrian sinkronisasi
export async function addToSyncQueue(
  action: SyncQueue['action'],
  data: Record<string, unknown>
): Promise<void> {
  const database = getDb()
  await database.syncQueue.add({
    action,
    data,
    attempts: 0,
    created_at: new Date().toISOString(),
  })
}

// Proses antrian sinkronisasi
export async function processSyncQueue(
  syncFn: (item: SyncQueue) => Promise<boolean>
): Promise<void> {
  const database = getDb()
  const queue = await database.syncQueue.toArray()
  
  for (const item of queue) {
    try {
      const success = await syncFn(item)
      if (success) {
        await database.syncQueue.delete(item.id!)
      } else {
        await database.syncQueue.update(item.id!, {
          attempts: (item.attempts || 0) + 1,
          last_attempt: new Date().toISOString(),
        })
      }
    } catch (error) {
      console.error('Gagal memproses sync queue:', error)
      await database.syncQueue.update(item.id!, {
        attempts: (item.attempts || 0) + 1,
        last_attempt: new Date().toISOString(),
      })
    }
  }
}

// ============================================================
// CACHE PELANGGAN
// ============================================================

export async function cacheCustomers(customers: CachedCustomer[]): Promise<void> {
  const database = getDb()
  const now = new Date().toISOString()
  const customersWithTimestamp = customers.map(c => ({ ...c, cached_at: now }))
  await database.cachedCustomers.bulkPut(customersWithTimestamp)
}

export async function searchCachedCustomers(query: string): Promise<CachedCustomer[]> {
  const database = getDb()
  const lowerQuery = query.toLowerCase()
  return database.cachedCustomers
    .filter(c => 
      c.name.toLowerCase().includes(lowerQuery) || 
      (c.phone && c.phone.includes(query))
    )
    .toArray()
}

// ============================================================
// BERSIHKAN CACHE LAMA
// ============================================================

export async function clearOldCache(maxAgeDays: number = 7): Promise<void> {
  const database = getDb()
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays)
  const cutoffStr = cutoffDate.toISOString()
  
  await database.offlineProducts
    .where('cached_at')
    .below(cutoffStr)
    .delete()
  
  await database.cachedCustomers
    .where('cached_at')
    .below(cutoffStr)
    .delete()
}

export type { MPASIPosDatabase, SyncQueue, OfflineStockItem, CachedCustomer }
