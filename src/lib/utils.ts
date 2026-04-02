import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, differenceInDays, parseISO, isValid } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

// Utility untuk menggabungkan class Tailwind
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================================
// FORMAT MATA UANG IDR
// ============================================================
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Format angka tanpa simbol mata uang
export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('id-ID').format(amount)
}

// ============================================================
// FORMAT TANGGAL (Bahasa Indonesia)
// ============================================================
export function formatDate(dateStr: string | Date, formatStr = 'dd MMM yyyy'): string {
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
    if (!isValid(date)) return '-'
    return format(date, formatStr, { locale: idLocale })
  } catch {
    return '-'
  }
}

export function formatDateTime(dateStr: string | Date): string {
  return formatDate(dateStr, 'dd MMM yyyy, HH:mm')
}

export function formatDateShort(dateStr: string | Date): string {
  return formatDate(dateStr, 'dd/MM/yyyy')
}

// ============================================================
// KALKULASI EXPIRY DAN STATUS
// ============================================================
export type ExpiryStatus = 'expired' | 'critical' | 'warning' | 'safe'

export function getExpiryStatus(expiryDateStr: string): ExpiryStatus {
  try {
    const expiryDate = parseISO(expiryDateStr)
    const daysUntilExpiry = differenceInDays(expiryDate, new Date())

    if (daysUntilExpiry < 0) return 'expired'
    if (daysUntilExpiry < 7) return 'critical'
    if (daysUntilExpiry < 14) return 'warning'
    return 'safe'
  } catch {
    return 'expired'
  }
}

export function getDaysUntilExpiry(expiryDateStr: string): number {
  try {
    const expiryDate = parseISO(expiryDateStr)
    return differenceInDays(expiryDate, new Date())
  } catch {
    return -1
  }
}

// Warna badge berdasarkan status expiry
export function getExpiryBadgeClass(status: ExpiryStatus): string {
  switch (status) {
    case 'expired':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'critical':
      return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'warning':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'safe':
      return 'bg-green-100 text-green-800 border-green-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

export function getExpiryLabel(status: ExpiryStatus, days: number): string {
  if (status === 'expired') return 'Kedaluwarsa'
  if (days === 0) return 'Kedaluwarsa hari ini'
  if (days === 1) return 'Besok kedaluwarsa'
  return `${days} hari lagi`
}

// ============================================================
// GENERATE NOMOR BATCH DAN ORDER
// ============================================================
export function generateBatchNumber(date: Date = new Date()): string {
  const dateStr = format(date, 'yyyyMMdd')
  const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `BATCH-${dateStr}-${randomSuffix}`
}

export function generateOrderNumber(date: Date = new Date()): string {
  const dateStr = format(date, 'yyyyMMdd')
  const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `ORD-${dateStr}-${randomSuffix}`
}

// ============================================================
// KALKULASI HPP
// Rumus: (total_biaya_bahan_baku × 3) ÷ jumlah_unit_produksi
// ============================================================
export function calculateHPP(totalRawMaterialCost: number, unitsProduced: number): number {
  if (unitsProduced === 0) return 0
  return (totalRawMaterialCost * 3) / unitsProduced
}

// Kalkulasi HPP berdasarkan resep
export function calculateRawMaterialCost(
  recipes: { quantity_needed: number; raw_material: { cost_per_unit: number } }[],
  unitsProduced: number
): number {
  return recipes.reduce((total, recipe) => {
    return total + recipe.quantity_needed * recipe.raw_material.cost_per_unit * unitsProduced
  }, 0)
}

// ============================================================
// KALKULASI TANGGAL EXPIRY BERDASARKAN STORAGE TYPE
// ============================================================
export function calculateExpiryDate(
  productionDate: string | Date,
  storageType: 'frozen' | 'fridge' | 'room_temp',
  product: {
    shelf_life_freezer_days: number
    shelf_life_fridge_days: number
    shelf_life_room_temp_hours: number
  }
): Date {
  const prodDate = typeof productionDate === 'string' ? parseISO(productionDate) : productionDate
  const result = new Date(prodDate)

  switch (storageType) {
    case 'frozen':
      result.setDate(result.getDate() + product.shelf_life_freezer_days)
      break
    case 'fridge':
      result.setDate(result.getDate() + product.shelf_life_fridge_days)
      break
    case 'room_temp':
      result.setHours(result.getHours() + product.shelf_life_room_temp_hours)
      break
  }

  return result
}

// ============================================================
// FORMAT STORAGE TYPE
// ============================================================
export function formatStorageType(storageType: 'frozen' | 'fridge' | 'room_temp'): string {
  switch (storageType) {
    case 'frozen':
      return 'Beku (Freezer)'
    case 'fridge':
      return 'Kulkas'
    case 'room_temp':
      return 'Suhu Ruang'
    default:
      return storageType
  }
}

// ============================================================
// FORMAT METODE PEMBAYARAN DAN PENGIRIMAN
// ============================================================
export function formatPaymentMethod(method: string): string {
  const methods: Record<string, string> = {
    tunai: 'Tunai',
    transfer: 'Transfer Bank',
    qris: 'QRIS',
    cod: 'COD',
  }
  return methods[method] || method
}

export function formatDeliveryMethod(method: string): string {
  const methods: Record<string, string> = {
    grab_express: 'Grab Express',
    go_delivery: 'GoSend',
    kurir_lokal: 'Kurir Lokal',
    kurir_sendiri: 'Kurir Sendiri',
    ambil_sendiri: 'Ambil Sendiri',
  }
  return methods[method] || method
}

// ============================================================
// FORMAT STATUS PESANAN
// ============================================================
export function formatOrderStatus(status: string): string {
  const statuses: Record<string, string> = {
    pending: 'Menunggu',
    confirmed: 'Dikonfirmasi',
    delivered: 'Terkirim',
    cancelled: 'Dibatalkan',
    voided: 'Dibatalkan (Void)',
  }
  return statuses[status] || status
}

export function getOrderStatusClass(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800'
    case 'confirmed':
      return 'bg-blue-100 text-blue-800'
    case 'delivered':
      return 'bg-green-100 text-green-800'
    case 'cancelled':
    case 'voided':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

// ============================================================
// VALIDASI NOMOR TELEPON INDONESIA
// ============================================================
export function formatPhoneNumber(phone: string): string {
  // Normalisasi nomor HP Indonesia
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('0')) {
    return '+62' + cleaned.slice(1)
  }
  if (cleaned.startsWith('62')) {
    return '+' + cleaned
  }
  return phone
}

// ============================================================
// TRUNCATE TEXT
// ============================================================
export function truncate(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

// ============================================================
// DEBOUNCE
// ============================================================
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return function (...args: Parameters<T>) {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// ============================================================
// KALKULASI MARGIN PROFIT
// ============================================================
export function calculateProfitMargin(sellingPrice: number, hpp: number): number {
  if (hpp === 0) return 0
  return ((sellingPrice - hpp) / sellingPrice) * 100
}

export function calculateProfit(sellingPrice: number, hpp: number): number {
  return sellingPrice - hpp
}

// ============================================================
// REKOMENDASI RESTOCK
// ============================================================
export function calculateRestockRecommendation(
  currentStock: number,
  avgDailySales: number,
  minDaysBuffer: number = 7
): {
  daysOfStockRemaining: number
  needsRestock: boolean
  recommendedQuantity: number
} {
  const daysOfStockRemaining = avgDailySales > 0 ? Math.floor(currentStock / avgDailySales) : Infinity
  const needsRestock = daysOfStockRemaining < minDaysBuffer
  const recommendedQuantity = needsRestock
    ? Math.ceil(avgDailySales * (minDaysBuffer * 2) - currentStock)
    : 0

  return {
    daysOfStockRemaining: daysOfStockRemaining === Infinity ? 999 : daysOfStockRemaining,
    needsRestock,
    recommendedQuantity,
  }
}
