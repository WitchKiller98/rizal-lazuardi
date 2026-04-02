'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StockAdjustmentModal } from './StockAdjustmentModal'
import { toast } from '@/hooks/use-toast'
import { formatCurrency, formatDate, getExpiryStatus, getExpiryBadgeClass, getDaysUntilExpiry, formatStorageType } from '@/lib/utils'
import type { Product, StockItem } from '@/lib/types'
import { Search, Plus, Settings, BarChart2, Package, RefreshCw, Pencil } from 'lucide-react'

interface ProductWithStock extends Product {
  total_stock: number
  nearest_expiry?: string
  expiry_status?: 'expired' | 'critical' | 'warning' | 'safe'
  stock_items?: StockItem[]
}

// Demo data
const DEMO_PRODUCTS: ProductWithStock[] = [
  {
    id: '1', name: 'MPASI Ayam Brokoli (6M+)', category: 'mpasi',
    selling_price: 35000, unit: 'porsi', is_active: true, total_stock: 20,
    nearest_expiry: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    expiry_status: 'warning',
    shelf_life_freezer_days: 30, shelf_life_fridge_days: 3, shelf_life_room_temp_hours: 4,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: '2', name: 'MPASI Salmon Bayam (8M+)', category: 'mpasi',
    selling_price: 45000, unit: 'porsi', is_active: true, total_stock: 15,
    nearest_expiry: new Date(Date.now() + 25 * 86400000).toISOString().split('T')[0],
    expiry_status: 'safe',
    shelf_life_freezer_days: 30, shelf_life_fridge_days: 3, shelf_life_room_temp_hours: 4,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: '3', name: 'Bubur Tim Sapi Wortel', category: 'mpasi',
    selling_price: 38000, unit: 'porsi', is_active: true, total_stock: 18,
    nearest_expiry: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    expiry_status: 'critical',
    shelf_life_freezer_days: 30, shelf_life_fridge_days: 3, shelf_life_room_temp_hours: 4,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
]

export function ProductList() {
  const [products, setProducts] = useState<ProductWithStock[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<ProductWithStock | null>(null)
  const [showAdjustment, setShowAdjustment] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editProduct, setEditProduct] = useState<ProductWithStock | null>(null)
  const supabase = createClient()

  useEffect(() => { loadProducts() }, [])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const isConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

      if (!isConfigured) {
        setProducts(DEMO_PRODUCTS)
        return
      }

      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .order('name')

      if (!productsData) return

      // Ambil stok per produk
      const { data: stockData } = await supabase
        .from('stock_items')
        .select('product_id, quantity_remaining, expiry_date, storage_type')
        .eq('is_active', true)
        .gt('quantity_remaining', 0)

      const stockByProduct: Record<string, { total: number; nearestExpiry?: string }> = {}
      ;(stockData || []).forEach((s: { product_id: string; quantity_remaining: number; expiry_date: string }) => {
        if (!stockByProduct[s.product_id]) {
          stockByProduct[s.product_id] = { total: 0 }
        }
        stockByProduct[s.product_id].total += s.quantity_remaining
        if (!stockByProduct[s.product_id].nearestExpiry ||
          s.expiry_date < stockByProduct[s.product_id].nearestExpiry!) {
          stockByProduct[s.product_id].nearestExpiry = s.expiry_date
        }
      })

      setProducts(productsData.map((p: Product) => ({
        ...p,
        total_stock: stockByProduct[p.id]?.total || 0,
        nearest_expiry: stockByProduct[p.id]?.nearestExpiry,
        expiry_status: stockByProduct[p.id]?.nearestExpiry
          ? getExpiryStatus(stockByProduct[p.id].nearestExpiry!)
          : undefined,
      })))
    } catch (error) {
      console.error('Gagal memuat produk:', error)
      setProducts(DEMO_PRODUCTS)
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Cari produk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadProducts}
            className="gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            onClick={() => setShowAddDialog(true)}
            className="bg-emerald-600 hover:bg-emerald-700 gap-2"
          >
            <Plus className="w-4 h-4" />
            Tambah Produk
          </Button>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produk</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead className="text-right">Harga Jual</TableHead>
              <TableHead className="text-right">Stok</TableHead>
              <TableHead>Exp Terdekat</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Package className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Tidak ada produk ditemukan</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map(product => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm text-gray-900">{product.name}</p>
                      <p className="text-xs text-gray-500">/{product.unit}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {product.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(product.selling_price)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`font-medium ${product.total_stock === 0 ? 'text-red-600' : product.total_stock < 5 ? 'text-orange-600' : 'text-gray-900'}`}>
                      {product.total_stock}
                    </span>
                  </TableCell>
                  <TableCell>
                    {product.nearest_expiry ? (
                      <span className="text-xs text-gray-600">
                        {formatDate(product.nearest_expiry)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {product.expiry_status ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getExpiryBadgeClass(product.expiry_status)}`}>
                        {product.expiry_status === 'expired' ? 'Kedaluwarsa' :
                          product.expiry_status === 'critical' ? `${getDaysUntilExpiry(product.nearest_expiry!)}h lagi` :
                          product.expiry_status === 'warning' ? 'Segera' : 'Aman'}
                      </span>
                    ) : (
                      <Badge variant={product.is_active ? 'success' : 'secondary'}>
                        {product.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditProduct(product)}
                        title="Edit produk"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setSelectedProduct(product)
                          setShowAdjustment(true)
                        }}
                        title="Penyesuaian stok"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Modal penyesuaian stok */}
      {selectedProduct && (
        <StockAdjustmentModal
          open={showAdjustment}
          onOpenChange={setShowAdjustment}
          item={{ ...selectedProduct, type: 'product' }}
          onSuccess={loadProducts}
        />
      )}

      {/* Dialog tambah/edit produk */}
      <ProductFormDialog
        open={showAddDialog || !!editProduct}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false)
            setEditProduct(null)
          }
        }}
        product={editProduct}
        onSuccess={() => {
          setShowAddDialog(false)
          setEditProduct(null)
          loadProducts()
        }}
      />
    </div>
  )
}

// Form dialog untuk tambah/edit produk
function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: ProductWithStock | null
  onSuccess: () => void
}) {
  const [name, setName] = useState(product?.name || '')
  const [category, setCategory] = useState(product?.category || 'mpasi')
  const [sellingPrice, setSellingPrice] = useState(product?.selling_price?.toString() || '')
  const [unit, setUnit] = useState(product?.unit || 'porsi')
  const [freezerDays, setFreezerDays] = useState(product?.shelf_life_freezer_days?.toString() || '30')
  const [fridgeDays, setFridgeDays] = useState(product?.shelf_life_fridge_days?.toString() || '3')
  const [roomHours, setRoomHours] = useState(product?.shelf_life_room_temp_hours?.toString() || '4')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (product) {
      setName(product.name)
      setCategory(product.category)
      setSellingPrice(product.selling_price.toString())
      setUnit(product.unit)
      setFreezerDays(product.shelf_life_freezer_days.toString())
      setFridgeDays(product.shelf_life_fridge_days.toString())
      setRoomHours(product.shelf_life_room_temp_hours.toString())
    } else {
      setName('')
      setCategory('mpasi')
      setSellingPrice('')
      setUnit('porsi')
      setFreezerDays('30')
      setFridgeDays('3')
      setRoomHours('4')
    }
  }, [product])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const isConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

      const data = {
        name,
        category,
        selling_price: Number(sellingPrice),
        unit,
        shelf_life_freezer_days: Number(freezerDays),
        shelf_life_fridge_days: Number(fridgeDays),
        shelf_life_room_temp_hours: Number(roomHours),
      }

      if (!isConfigured) {
        await new Promise(r => setTimeout(r, 500))
        toast({ title: 'Berhasil (Demo)', description: `Produk ${product ? 'diperbarui' : 'ditambahkan'}` })
        onSuccess()
        return
      }

      if (product) {
        await supabase.from('products').update(data).eq('id', product.id)
      } else {
        await supabase.from('products').insert(data)
      }

      toast({ title: 'Berhasil', description: `Produk berhasil ${product ? 'diperbarui' : 'ditambahkan'}` })
      onSuccess()
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menyimpan produk', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Produk' : 'Tambah Produk Baru'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Nama Produk <span className="text-red-500">*</span></Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mpasi">MPASI</SelectItem>
                  <SelectItem value="camilan">Camilan</SelectItem>
                  <SelectItem value="minuman">Minuman</SelectItem>
                  <SelectItem value="lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Satuan</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="porsi">Porsi</SelectItem>
                  <SelectItem value="pcs">Pcs</SelectItem>
                  <SelectItem value="pack">Pack</SelectItem>
                  <SelectItem value="cup">Cup</SelectItem>
                  <SelectItem value="botol">Botol</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Harga Jual (Rp) <span className="text-red-500">*</span></Label>
              <Input type="number" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} min="0" required />
            </div>
            <div className="col-span-2">
              <p className="text-sm font-medium text-gray-700 mb-2">Masa Simpan</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Freezer (hari)</Label>
                  <Input type="number" value={freezerDays} onChange={(e) => setFreezerDays(e.target.value)} min="0" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Kulkas (hari)</Label>
                  <Input type="number" value={fridgeDays} onChange={(e) => setFridgeDays(e.target.value)} min="0" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Suhu Ruang (jam)</Label>
                  <Input type="number" value={roomHours} onChange={(e) => setRoomHours(e.target.value)} min="0" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
              {loading ? 'Menyimpan...' : product ? 'Simpan Perubahan' : 'Tambah Produk'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
