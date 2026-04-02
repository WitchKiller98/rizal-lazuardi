'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/hooks/use-toast'
import { formatCurrency, generateOrderNumber, formatStorageType, getDaysUntilExpiry, getExpiryStatus } from '@/lib/utils'
import type { Product, Customer, CartItem, PaymentMethod, DeliveryMethod } from '@/lib/types'
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  User,
  CreditCard,
  Truck,
  CheckCircle,
  X,
  Package,
} from 'lucide-react'

// Data demo produk untuk mode tanpa Supabase
const DEMO_PRODUCTS: (Product & { available_stock: number })[] = [
  {
    id: '1', name: 'MPASI Ayam Brokoli (6M+)', category: 'mpasi',
    selling_price: 35000, unit: 'porsi', is_active: true, available_stock: 20,
    shelf_life_freezer_days: 30, shelf_life_fridge_days: 3, shelf_life_room_temp_hours: 4,
    created_at: '', updated_at: '',
  },
  {
    id: '2', name: 'MPASI Salmon Bayam (8M+)', category: 'mpasi',
    selling_price: 45000, unit: 'porsi', is_active: true, available_stock: 15,
    shelf_life_freezer_days: 30, shelf_life_fridge_days: 3, shelf_life_room_temp_hours: 4,
    created_at: '', updated_at: '',
  },
  {
    id: '3', name: 'Bubur Tim Sapi Wortel', category: 'mpasi',
    selling_price: 38000, unit: 'porsi', is_active: true, available_stock: 18,
    shelf_life_freezer_days: 30, shelf_life_fridge_days: 3, shelf_life_room_temp_hours: 4,
    created_at: '', updated_at: '',
  },
  {
    id: '4', name: 'MPASI Tahu Tempe Sayuran', category: 'mpasi',
    selling_price: 30000, unit: 'porsi', is_active: true, available_stock: 25,
    shelf_life_freezer_days: 30, shelf_life_fridge_days: 3, shelf_life_room_temp_hours: 4,
    created_at: '', updated_at: '',
  },
  {
    id: '5', name: 'Finger Food Pisang Oat (9M+)', category: 'camilan',
    selling_price: 25000, unit: 'pack', is_active: true, available_stock: 10,
    shelf_life_freezer_days: 14, shelf_life_fridge_days: 2, shelf_life_room_temp_hours: 2,
    created_at: '', updated_at: '',
  },
  {
    id: '6', name: 'Puding Susu Vanila (10M+)', category: 'camilan',
    selling_price: 20000, unit: 'cup', is_active: true, available_stock: 30,
    shelf_life_freezer_days: 7, shelf_life_fridge_days: 2, shelf_life_room_temp_hours: 2,
    created_at: '', updated_at: '',
  },
]

const DEMO_CUSTOMERS: Customer[] = [
  {
    id: '1', name: 'Ibu Sari Wulandari', phone: '0812-3456-7890',
    address: 'Jl. Melati No. 5, Jakarta Selatan',
    total_orders: 12, total_spent: 456000, is_active: true,
    created_at: '', updated_at: '',
  },
  {
    id: '2', name: 'Bapak Rizki Pratama', phone: '0856-7890-1234',
    address: 'Perumahan Griya Asri Blok B No. 12',
    total_orders: 8, total_spent: 320000, is_active: true,
    created_at: '', updated_at: '',
  },
]

export function POSTerminal() {
  const [products, setProducts] = useState<(Product & { available_stock: number })[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [productSearch, setProductSearch] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('tunai')
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('grab_express')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [lastOrderNumber, setLastOrderNumber] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('semua')
  const supabase = createClient()

  // Muat produk dan pelanggan
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const isConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

      if (!isConfigured) {
        setProducts(DEMO_PRODUCTS)
        setCustomers(DEMO_CUSTOMERS)
        return
      }

      const [productsRes, customersRes] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('customers')
          .select('*')
          .eq('is_active', true)
          .order('name')
          .limit(100),
      ])

      // Hitung stok tersedia per produk dari stock_items
      if (productsRes.data) {
        const productIds = productsRes.data.map((p: Product) => p.id)
        const stockRes = await supabase
          .from('stock_items')
          .select('product_id, quantity_remaining')
          .in('product_id', productIds)
          .eq('is_active', true)
          .gt('expiry_date', new Date().toISOString().split('T')[0])
          .gt('quantity_remaining', 0)

        const stockByProduct: Record<string, number> = {}
        ;(stockRes.data || []).forEach((s: { product_id: string; quantity_remaining: number }) => {
          stockByProduct[s.product_id] = (stockByProduct[s.product_id] || 0) + s.quantity_remaining
        })

        setProducts(productsRes.data.map((p: Product) => ({
          ...p,
          available_stock: stockByProduct[p.id] || 0,
        })))
      }

      setCustomers(customersRes.data || [])
    } catch (error) {
      console.error('Gagal memuat data POS:', error)
      setProducts(DEMO_PRODUCTS)
      setCustomers(DEMO_CUSTOMERS)
    }
  }

  // Filter produk berdasarkan pencarian dan kategori
  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(productSearch.toLowerCase())
    const matchCategory = selectedCategory === 'semua' || p.category === selectedCategory
    return matchSearch && matchCategory
  })

  const categories = ['semua', ...new Set(products.map(p => p.category))]

  // Tambah item ke keranjang
  const addToCart = (product: Product & { available_stock: number }) => {
    if (product.available_stock === 0) {
      toast({ title: 'Stok habis', description: `${product.name} tidak tersedia`, variant: 'destructive' })
      return
    }

    setCartItems(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      if (existing) {
        if (existing.quantity >= product.available_stock) {
          toast({ title: 'Stok tidak cukup', description: `Stok tersedia: ${product.available_stock}`, variant: 'destructive' })
          return prev
        }
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.unit_price }
            : item
        )
      }
      return [...prev, {
        product,
        quantity: 1,
        unit_price: product.selling_price,
        subtotal: product.selling_price,
        available_stock: product.available_stock,
      }]
    })
  }

  // Update jumlah item di keranjang
  const updateQuantity = (productId: string, newQty: number) => {
    if (newQty < 1) {
      removeFromCart(productId)
      return
    }
    const product = products.find(p => p.id === productId)
    if (product && newQty > product.available_stock) {
      toast({ title: 'Stok tidak cukup', description: `Stok tersedia: ${product.available_stock}`, variant: 'destructive' })
      return
    }
    setCartItems(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, quantity: newQty, subtotal: newQty * item.unit_price }
          : item
      )
    )
  }

  // Hapus item dari keranjang
  const removeFromCart = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.product.id !== productId))
  }

  // Kosongkan keranjang
  const clearCart = () => {
    setCartItems([])
    setSelectedCustomer(null)
    setDiscountAmount(0)
    setDeliveryFee(0)
    setNotes('')
  }

  // Kalkulasi total
  const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0)
  const totalAmount = subtotal - discountAmount + deliveryFee

  // Proses checkout
  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      toast({ title: 'Keranjang kosong', description: 'Tambahkan produk terlebih dahulu', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const orderNumber = generateOrderNumber()
      const isConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

      if (!isConfigured) {
        // Mode demo - simulasi sukses
        await new Promise(resolve => setTimeout(resolve, 1000))
        setLastOrderNumber(orderNumber)
        setShowSuccessDialog(true)
        clearCart()
        return
      }

      // Buat order di Supabase
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_id: selectedCustomer?.id || null,
          status: 'confirmed',
          subtotal,
          discount_amount: discountAmount,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          delivery_method: deliveryMethod,
          delivery_address: deliveryAddress || null,
          delivery_fee: deliveryFee,
          notes: notes || null,
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Buat order items
      const orderItemsData = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
      }))

      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData)
        .select()

      if (itemsError) throw itemsError

      // Kurangi stok FIFO
      for (const item of orderItems || []) {
        const cartItem = cartItems.find(c => c.product.id === item.product_id)
        if (!cartItem) continue

        let remainingQty = cartItem.quantity
        
        // Ambil stok per FIFO (oldest production_date first)
        const { data: stockBatches } = await supabase
          .from('stock_items')
          .select('id, quantity_remaining')
          .eq('product_id', item.product_id)
          .eq('is_active', true)
          .gt('expiry_date', new Date().toISOString().split('T')[0])
          .gt('quantity_remaining', 0)
          .order('production_date', { ascending: true })

        for (const batch of stockBatches || []) {
          if (remainingQty <= 0) break
          
          const taken = Math.min(remainingQty, batch.quantity_remaining)
          remainingQty -= taken

          // Catat pengambilan FIFO
          await supabase.from('order_item_stock').insert({
            order_item_id: item.id,
            stock_item_id: batch.id,
            quantity_taken: taken,
          })

          // Update stok
          const newQty = batch.quantity_remaining - taken
          await supabase
            .from('stock_items')
            .update({
              quantity_remaining: newQty,
              is_active: newQty > 0,
            })
            .eq('id', batch.id)
        }
      }

      // Update statistik pelanggan jika ada
      if (selectedCustomer) {
        await supabase
          .from('customers')
          .update({
            total_orders: selectedCustomer.total_orders + 1,
            total_spent: selectedCustomer.total_spent + totalAmount,
            last_order_date: new Date().toISOString().split('T')[0],
          })
          .eq('id', selectedCustomer.id)
      }

      setLastOrderNumber(orderNumber)
      setShowSuccessDialog(true)
      clearCart()
      await loadData() // Refresh stok
    } catch (error) {
      console.error('Gagal memproses pesanan:', error)
      toast({
        title: 'Gagal memproses pesanan',
        description: 'Terjadi kesalahan. Silakan coba lagi.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full flex gap-4">
      {/* Panel kiri: Daftar produk */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Pencarian dan filter produk */}
        <div className="space-y-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Cari produk..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {/* Filter kategori */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat === 'semua' ? 'Semua' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Grid produk */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredProducts.map(product => {
              const inCart = cartItems.find(item => item.product.id === product.id)
              const isOutOfStock = product.available_stock === 0

              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={isOutOfStock}
                  className={`text-left p-3 rounded-xl border-2 transition-all ${
                    isOutOfStock
                      ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                      : inCart
                      ? 'bg-emerald-50 border-emerald-300 shadow-sm'
                      : 'bg-white border-gray-200 hover:border-emerald-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="w-5 h-5 text-emerald-600" />
                    </div>
                    {inCart && (
                      <Badge className="bg-emerald-600 text-white text-xs px-1.5">
                        {inCart.quantity}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs font-medium text-gray-800 leading-tight line-clamp-2 mb-1">
                    {product.name}
                  </p>
                  <p className="text-sm font-bold text-emerald-700">
                    {formatCurrency(product.selling_price)}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-400">/{product.unit}</span>
                    <span className={`text-xs font-medium ${isOutOfStock ? 'text-red-500' : 'text-gray-500'}`}>
                      {isOutOfStock ? 'Habis' : `${product.available_stock} stok`}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Tidak ada produk ditemukan</p>
            </div>
          )}
        </div>
      </div>

      {/* Panel kanan: Keranjang dan checkout */}
      <div className="w-80 xl:w-96 flex-shrink-0 flex flex-col">
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="py-3 px-4 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-emerald-600" />
                Keranjang
                {cartItems.length > 0 && (
                  <Badge className="bg-emerald-600 text-white text-xs">
                    {cartItems.length}
                  </Badge>
                )}
              </CardTitle>
              {cartItems.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Kosongkan
                </button>
              )}
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-4 space-y-2">
            {cartItems.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Keranjang kosong</p>
                <p className="text-xs text-gray-300 mt-1">Klik produk untuk menambahkan</p>
              </div>
            ) : (
              cartItems.map(item => (
                <div
                  key={item.product.id}
                  className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{item.product.name}</p>
                    <p className="text-xs text-gray-500">{formatCurrency(item.unit_price)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="w-6 h-6 rounded-md bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="w-6 h-6 rounded-md bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="w-6 h-6 rounded-md text-red-400 hover:text-red-600 flex items-center justify-center"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-right w-20 flex-shrink-0">
                    <p className="text-xs font-semibold text-emerald-700">
                      {formatCurrency(item.subtotal)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>

          {/* Summary dan form checkout */}
          <div className="border-t p-4 space-y-3">
            {/* Pelanggan */}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600">Pelanggan (opsional)</Label>
              {selectedCustomer ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-emerald-800 truncate">{selectedCustomer.name}</p>
                    <p className="text-xs text-emerald-600">{selectedCustomer.phone}</p>
                  </div>
                  <button onClick={() => setSelectedCustomer(null)} className="text-emerald-600 hover:text-emerald-800 ml-2">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Select
                  onValueChange={(value) => {
                    const customer = customers.find(c => c.id === value)
                    if (customer) setSelectedCustomer(customer)
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Pilih pelanggan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                        {customer.phone && ` - ${customer.phone}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Pembayaran dan pengiriman */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Pembayaran</Label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tunai">Tunai</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="qris">QRIS</SelectItem>
                    <SelectItem value="cod">COD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Pengiriman</Label>
                <Select value={deliveryMethod} onValueChange={(v) => setDeliveryMethod(v as DeliveryMethod)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grab_express">Grab Express</SelectItem>
                    <SelectItem value="go_delivery">GoSend</SelectItem>
                    <SelectItem value="kurir_lokal">Kurir Lokal</SelectItem>
                    <SelectItem value="kurir_sendiri">Kurir Sendiri</SelectItem>
                    <SelectItem value="ambil_sendiri">Ambil Sendiri</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Ongkir dan diskon */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Ongkir (Rp)</Label>
                <Input
                  type="number"
                  value={deliveryFee || ''}
                  onChange={(e) => setDeliveryFee(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Diskon (Rp)</Label>
                <Input
                  type="number"
                  value={discountAmount || ''}
                  onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Ringkasan harga */}
            <div className="space-y-1.5 py-2 border-t border-dashed">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-xs text-green-600">
                  <span>Diskon</span>
                  <span>- {formatCurrency(discountAmount)}</span>
                </div>
              )}
              {deliveryFee > 0 && (
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Ongkir</span>
                  <span>{formatCurrency(deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm pt-1 border-t">
                <span>Total</span>
                <span className="text-emerald-700">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            {/* Tombol checkout */}
            <Button
              onClick={handleCheckout}
              disabled={cartItems.length === 0 || loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 h-10"
            >
              {loading ? (
                <>Memproses...</>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Bayar {formatCurrency(totalAmount)}
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>

      {/* Dialog sukses */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
              Pesanan Berhasil!
            </DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-2 py-2">
            <p className="text-sm text-gray-600">Nomor Pesanan</p>
            <p className="text-lg font-bold text-emerald-700">{lastOrderNumber}</p>
            <p className="text-xs text-gray-500">
              Pesanan telah dicatat dan stok telah diperbarui
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowSuccessDialog(false)}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              Pesanan Baru
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
