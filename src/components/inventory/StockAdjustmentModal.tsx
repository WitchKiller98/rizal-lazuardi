'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/hooks/use-toast'
import type { AdjustmentType, Product, RawMaterial } from '@/lib/types'

interface StockAdjustmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: (Product | RawMaterial) & { type: 'product' | 'raw_material' }
  onSuccess: () => void
}

export function StockAdjustmentModal({
  open,
  onOpenChange,
  item,
  onSuccess,
}: StockAdjustmentModalProps) {
  const [quantity, setQuantity] = useState('')
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('waste')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!quantity || Number(quantity) === 0) {
      toast({ title: 'Error', description: 'Masukkan jumlah penyesuaian', variant: 'destructive' })
      return
    }
    if (!reason.trim()) {
      toast({ title: 'Error', description: 'Masukkan alasan penyesuaian', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const isConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

      const qtyValue = Number(quantity)
      const isNegative = ['waste', 'expired', 'error'].includes(adjustmentType)
      const finalQty = isNegative ? -Math.abs(qtyValue) : Math.abs(qtyValue)

      if (!isConfigured) {
        await new Promise(r => setTimeout(r, 500))
        toast({ title: 'Berhasil (Demo)', description: 'Penyesuaian stok berhasil dicatat' })
        onSuccess()
        onOpenChange(false)
        return
      }

      // Catat penyesuaian
      const adjustmentData: Record<string, unknown> = {
        quantity: finalQty,
        reason,
        adjustment_type: adjustmentType,
        notes: notes || null,
      }

      if (item.type === 'product') {
        adjustmentData.product_id = item.id
      } else {
        adjustmentData.raw_material_id = item.id
      }

      await supabase.from('stock_adjustments').insert(adjustmentData)

      // Update stok bahan baku langsung
      if (item.type === 'raw_material') {
        const currentStock = (item as RawMaterial).current_stock
        await supabase
          .from('raw_materials')
          .update({ current_stock: Math.max(0, currentStock + finalQty) })
          .eq('id', item.id)
      }

      toast({ title: 'Berhasil', description: 'Penyesuaian stok berhasil dicatat' })
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error('Gagal menyesuaikan stok:', error)
      toast({ title: 'Error', description: 'Gagal menyesuaikan stok', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const adjustmentTypeOptions = [
    { value: 'waste', label: 'Terbuang/Rusak', isNegative: true },
    { value: 'expired', label: 'Kedaluwarsa', isNegative: true },
    { value: 'error', label: 'Kesalahan Input', isNegative: false },
    { value: 'return', label: 'Retur/Pengembalian', isNegative: false },
    { value: 'restock', label: 'Penambahan Stok', isNegative: false },
    { value: 'other', label: 'Lainnya', isNegative: false },
  ]

  const currentType = adjustmentTypeOptions.find(t => t.value === adjustmentType)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Penyesuaian Stok</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700">{item.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Stok saat ini:{' '}
              {item.type === 'raw_material'
                ? `${(item as RawMaterial).current_stock} ${(item as RawMaterial).unit}`
                : '-'}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Jenis Penyesuaian</Label>
            <Select
              value={adjustmentType}
              onValueChange={(v) => setAdjustmentType(v as AdjustmentType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {adjustmentTypeOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>
              Jumlah{' '}
              {item.type === 'raw_material' ? `(${(item as RawMaterial).unit})` : '(unit)'}
              {currentType?.isNegative && (
                <span className="text-xs text-red-500 ml-1">(akan dikurangi dari stok)</span>
              )}
            </Label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              min="0"
              step="0.001"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Alasan <span className="text-red-500">*</span></Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Produk terjatuh dan rusak"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Catatan Tambahan</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan opsional..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
              {loading ? 'Menyimpan...' : 'Simpan Penyesuaian'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
