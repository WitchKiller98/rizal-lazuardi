'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { StockAdjustmentModal } from './StockAdjustmentModal'
import { toast } from '@/hooks/use-toast'
import { formatCurrency, formatNumber } from '@/lib/utils'
import type { RawMaterial } from '@/lib/types'
import { Search, Plus, Settings, RefreshCw, Pencil, ShoppingBag } from 'lucide-react'

const DEMO_MATERIALS: RawMaterial[] = [
  { id: '1', name: 'Dada Ayam Fillet', unit: 'gram', current_stock: 2500, min_stock_alert: 500, cost_per_unit: 0.04, supplier_info: 'Pasar Segar', is_active: true, created_at: '', updated_at: '' },
  { id: '2', name: 'Fillet Salmon', unit: 'gram', current_stock: 800, min_stock_alert: 300, cost_per_unit: 0.12, supplier_info: 'Toko Ikan Segar', is_active: true, created_at: '', updated_at: '' },
  { id: '3', name: 'Bayam Segar', unit: 'gram', current_stock: 0, min_stock_alert: 300, cost_per_unit: 0.01, is_active: true, created_at: '', updated_at: '' },
  { id: '4', name: 'Wortel', unit: 'gram', current_stock: 1500, min_stock_alert: 500, cost_per_unit: 0.008, is_active: true, created_at: '', updated_at: '' },
  { id: '5', name: 'Beras Merah', unit: 'gram', current_stock: 5000, min_stock_alert: 1000, cost_per_unit: 0.02, is_active: true, created_at: '', updated_at: '' },
]

export function RawMaterialList() {
  const [materials, setMaterials] = useState<RawMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null)
  const [showAdjustment, setShowAdjustment] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editMaterial, setEditMaterial] = useState<RawMaterial | null>(null)
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false)
  const supabase = createClient()

  useEffect(() => { loadMaterials() }, [])

  const loadMaterials = async () => {
    setLoading(true)
    try {
      const isConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

      if (!isConfigured) {
        setMaterials(DEMO_MATERIALS)
        return
      }

      const { data } = await supabase
        .from('raw_materials')
        .select('*')
        .order('name')

      setMaterials(data || [])
    } catch (error) {
      setMaterials(DEMO_MATERIALS)
    } finally {
      setLoading(false)
    }
  }

  const filteredMaterials = materials.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.unit.toLowerCase().includes(search.toLowerCase())
  )

  const getStockStatus = (material: RawMaterial) => {
    if (material.current_stock === 0) return { label: 'Habis', variant: 'danger' as const }
    if (material.current_stock <= material.min_stock_alert) return { label: 'Menipis', variant: 'warning' as const }
    return { label: 'Cukup', variant: 'success' as const }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Cari bahan baku..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadMaterials}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            onClick={() => setShowAddDialog(true)}
            className="bg-emerald-600 hover:bg-emerald-700 gap-2"
          >
            <Plus className="w-4 h-4" />
            Tambah Bahan
          </Button>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Bahan</TableHead>
              <TableHead>Satuan</TableHead>
              <TableHead className="text-right">Stok Saat Ini</TableHead>
              <TableHead className="text-right">Stok Minimum</TableHead>
              <TableHead className="text-right">Harga/Satuan</TableHead>
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
            ) : filteredMaterials.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                  Tidak ada bahan baku ditemukan
                </TableCell>
              </TableRow>
            ) : (
              filteredMaterials.map(material => {
                const status = getStockStatus(material)
                return (
                  <TableRow key={material.id}>
                    <TableCell>
                      <p className="font-medium text-sm text-gray-900">{material.name}</p>
                      {material.supplier_info && (
                        <p className="text-xs text-gray-500">{material.supplier_info}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{material.unit}</TableCell>
                    <TableCell className="text-right">
                      <span className={`font-medium ${
                        material.current_stock === 0 ? 'text-red-600' :
                        material.current_stock <= material.min_stock_alert ? 'text-orange-600' :
                        'text-gray-900'
                      }`}>
                        {formatNumber(material.current_stock)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm text-gray-600">
                      {formatNumber(material.min_stock_alert)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatCurrency(material.cost_per_unit)}/{material.unit}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setSelectedMaterial(material)
                            setShowPurchaseDialog(true)
                          }}
                          title="Catat pembelian"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditMaterial(material)}
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setSelectedMaterial(material)
                            setShowAdjustment(true)
                          }}
                          title="Penyesuaian stok"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {selectedMaterial && (
        <StockAdjustmentModal
          open={showAdjustment}
          onOpenChange={setShowAdjustment}
          item={{ ...selectedMaterial, type: 'raw_material' }}
          onSuccess={loadMaterials}
        />
      )}

      <RawMaterialFormDialog
        open={showAddDialog || !!editMaterial}
        onOpenChange={(open) => { if (!open) { setShowAddDialog(false); setEditMaterial(null) } }}
        material={editMaterial}
        onSuccess={() => { setShowAddDialog(false); setEditMaterial(null); loadMaterials() }}
      />

      {selectedMaterial && (
        <PurchaseDialog
          open={showPurchaseDialog}
          onOpenChange={setShowPurchaseDialog}
          material={selectedMaterial}
          onSuccess={loadMaterials}
        />
      )}
    </div>
  )
}

// Form tambah/edit bahan baku
function RawMaterialFormDialog({
  open, onOpenChange, material, onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  material: RawMaterial | null
  onSuccess: () => void
}) {
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('gram')
  const [minStock, setMinStock] = useState('')
  const [costPerUnit, setCostPerUnit] = useState('')
  const [supplier, setSupplier] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (material) {
      setName(material.name); setUnit(material.unit)
      setMinStock(material.min_stock_alert.toString())
      setCostPerUnit(material.cost_per_unit.toString())
      setSupplier(material.supplier_info || '')
    } else {
      setName(''); setUnit('gram'); setMinStock(''); setCostPerUnit(''); setSupplier('')
    }
  }, [material])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const isConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

      const data = { name, unit, min_stock_alert: Number(minStock), cost_per_unit: Number(costPerUnit), supplier_info: supplier || null }
      
      if (!isConfigured) {
        await new Promise(r => setTimeout(r, 500))
        toast({ title: 'Berhasil (Demo)', description: `Bahan baku ${material ? 'diperbarui' : 'ditambahkan'}` })
        onSuccess(); return
      }

      if (material) {
        await supabase.from('raw_materials').update(data).eq('id', material.id)
      } else {
        await supabase.from('raw_materials').insert(data)
      }
      toast({ title: 'Berhasil', description: `Bahan baku berhasil ${material ? 'diperbarui' : 'ditambahkan'}` })
      onSuccess()
    } catch {
      toast({ title: 'Error', description: 'Gagal menyimpan', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{material ? 'Edit Bahan Baku' : 'Tambah Bahan Baku'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nama Bahan <span className="text-red-500">*</span></Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Satuan</Label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="gram, ml, pcs..." />
            </div>
            <div className="space-y-2">
              <Label>Stok Minimum Alert</Label>
              <Input type="number" value={minStock} onChange={(e) => setMinStock(e.target.value)} min="0" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Harga per Satuan (Rp)</Label>
            <Input type="number" value={costPerUnit} onChange={(e) => setCostPerUnit(e.target.value)} min="0" step="0.001" />
          </div>
          <div className="space-y-2">
            <Label>Informasi Supplier</Label>
            <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Nama toko/supplier..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
              {loading ? 'Menyimpan...' : material ? 'Simpan' : 'Tambah'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Dialog catat pembelian bahan baku
function PurchaseDialog({
  open, onOpenChange, material, onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  material: RawMaterial
  onSuccess: () => void
}) {
  const [quantity, setQuantity] = useState('')
  const [unitCost, setUnitCost] = useState(material.cost_per_unit.toString())
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])
  const [supplier, setSupplier] = useState(material.supplier_info || '')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const totalCost = Number(quantity) * Number(unitCost)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const isConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
      
      const qty = Number(quantity)
      const cost = Number(unitCost)

      if (!isConfigured) {
        await new Promise(r => setTimeout(r, 500))
        toast({ title: 'Berhasil (Demo)', description: `Pembelian ${material.name} dicatat` })
        onSuccess(); onOpenChange(false); return
      }

      await supabase.from('raw_material_purchases').insert({
        raw_material_id: material.id,
        quantity: qty,
        unit_cost: cost,
        total_cost: totalCost,
        purchase_date: purchaseDate,
        supplier: supplier || null,
        notes: notes || null,
      })

      // Update stok bahan baku
      await supabase
        .from('raw_materials')
        .update({ current_stock: material.current_stock + qty, cost_per_unit: cost })
        .eq('id', material.id)

      toast({ title: 'Berhasil', description: `Pembelian ${material.name} berhasil dicatat` })
      onSuccess(); onOpenChange(false)
    } catch {
      toast({ title: 'Error', description: 'Gagal mencatat pembelian', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Catat Pembelian Bahan Baku</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
            <p className="font-medium text-emerald-800">{material.name}</p>
            <p className="text-xs text-emerald-600">Stok saat ini: {formatNumber(material.current_stock)} {material.unit}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Jumlah ({material.unit}) <span className="text-red-500">*</span></Label>
              <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="0" step="0.001" required />
            </div>
            <div className="space-y-2">
              <Label>Harga/Satuan (Rp)</Label>
              <Input type="number" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} min="0" step="0.001" />
            </div>
          </div>
          {quantity && unitCost && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Total Pembelian: <span className="font-bold text-gray-900">{formatCurrency(totalCost)}</span></p>
            </div>
          )}
          <div className="space-y-2">
            <Label>Tanggal Pembelian</Label>
            <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Supplier</Label>
            <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Catatan</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
              {loading ? 'Menyimpan...' : 'Catat Pembelian'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
