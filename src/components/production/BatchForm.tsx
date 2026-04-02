'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/hooks/use-toast'
import {
  formatCurrency,
  generateBatchNumber,
  calculateHPP,
  calculateExpiryDate,
  formatStorageType,
} from '@/lib/utils'
import type { Product, RawMaterial, ProductRecipe, StorageType } from '@/lib/types'
import { Plus, Trash2, FlaskConical, Calculator } from 'lucide-react'
import { format } from 'date-fns'

interface BatchItemForm {
  product_id: string
  product?: Product
  quantity_produced: number
  storage_type: StorageType
  expiry_date: string
  hpp_per_unit: number
  raw_material_cost: number
}

interface BatchFormProps {
  onSuccess: () => void
  onCancel: () => void
}

const DEMO_PRODUCTS: Product[] = [
  { id: '1', name: 'MPASI Ayam Brokoli (6M+)', category: 'mpasi', selling_price: 35000, unit: 'porsi', is_active: true, shelf_life_freezer_days: 30, shelf_life_fridge_days: 3, shelf_life_room_temp_hours: 4, created_at: '', updated_at: '' },
  { id: '2', name: 'MPASI Salmon Bayam (8M+)', category: 'mpasi', selling_price: 45000, unit: 'porsi', is_active: true, shelf_life_freezer_days: 30, shelf_life_fridge_days: 3, shelf_life_room_temp_hours: 4, created_at: '', updated_at: '' },
  { id: '3', name: 'Bubur Tim Sapi Wortel', category: 'mpasi', selling_price: 38000, unit: 'porsi', is_active: true, shelf_life_freezer_days: 30, shelf_life_fridge_days: 3, shelf_life_room_temp_hours: 4, created_at: '', updated_at: '' },
]

const DEMO_RECIPES: Record<string, { raw_material: RawMaterial; quantity_needed: number }[]> = {
  '1': [
    { raw_material: { id: '1', name: 'Dada Ayam Fillet', unit: 'gram', current_stock: 2500, min_stock_alert: 500, cost_per_unit: 0.04, is_active: true, created_at: '', updated_at: '' }, quantity_needed: 80 },
    { raw_material: { id: '3', name: 'Bayam Segar', unit: 'gram', current_stock: 500, min_stock_alert: 300, cost_per_unit: 0.01, is_active: true, created_at: '', updated_at: '' }, quantity_needed: 30 },
  ],
  '2': [
    { raw_material: { id: '2', name: 'Fillet Salmon', unit: 'gram', current_stock: 800, min_stock_alert: 300, cost_per_unit: 0.12, is_active: true, created_at: '', updated_at: '' }, quantity_needed: 100 },
    { raw_material: { id: '3', name: 'Bayam Segar', unit: 'gram', current_stock: 500, min_stock_alert: 300, cost_per_unit: 0.01, is_active: true, created_at: '', updated_at: '' }, quantity_needed: 40 },
  ],
}

export function BatchForm({ onSuccess, onCancel }: BatchFormProps) {
  const [batchNumber, setBatchNumber] = useState(generateBatchNumber())
  const [productionDate, setProductionDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [batchItems, setBatchItems] = useState<BatchItemForm[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [recipes, setRecipes] = useState<Record<string, { raw_material: RawMaterial; quantity_needed: number }[]>>({})
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => { loadProducts() }, [])

  const loadProducts = async () => {
    try {
      const isConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

      if (!isConfigured) {
        setProducts(DEMO_PRODUCTS)
        setRecipes(DEMO_RECIPES)
        return
      }

      const { data: productsData } = await supabase.from('products').select('*').eq('is_active', true).order('name')
      setProducts(productsData || [])

      // Load semua resep
      const { data: recipesData } = await supabase
        .from('product_recipes')
        .select('*, raw_materials(*)')

      const recipeMap: Record<string, { raw_material: RawMaterial; quantity_needed: number }[]> = {}
      ;(recipesData || []).forEach((r: ProductRecipe & { raw_materials: RawMaterial }) => {
        if (!recipeMap[r.product_id]) recipeMap[r.product_id] = []
        recipeMap[r.product_id].push({
          raw_material: r.raw_materials,
          quantity_needed: r.quantity_needed,
        })
      })
      setRecipes(recipeMap)
    } catch {
      setProducts(DEMO_PRODUCTS)
      setRecipes(DEMO_RECIPES)
    }
  }

  const addBatchItem = () => {
    setBatchItems(prev => [...prev, {
      product_id: '',
      quantity_produced: 1,
      storage_type: 'frozen',
      expiry_date: '',
      hpp_per_unit: 0,
      raw_material_cost: 0,
    }])
  }

  const removeBatchItem = (index: number) => {
    setBatchItems(prev => prev.filter((_, i) => i !== index))
  }

  const updateBatchItem = (index: number, field: keyof BatchItemForm, value: string | number | StorageType) => {
    setBatchItems(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }

      // Recalculate when product or quantity or storage type changes
      if (field === 'product_id' || field === 'quantity_produced' || field === 'storage_type') {
        const item = updated[index]
        const product = products.find(p => p.id === item.product_id)
        
        if (product) {
          updated[index].product = product
          
          // Calculate expiry date
          if (item.storage_type) {
            const expiryDate = calculateExpiryDate(
              productionDate,
              item.storage_type,
              product
            )
            updated[index].expiry_date = format(expiryDate, 'yyyy-MM-dd')
          }
          
          // Calculate HPP berdasarkan resep
          const productRecipes = recipes[product.id] || []
          const qty = Number(item.quantity_produced) || 1
          
          // Total biaya bahan baku = sum(quantity_needed × cost_per_unit) × quantity_produced
          const rawMaterialCost = productRecipes.reduce((sum, r) => {
            return sum + (r.quantity_needed * r.raw_material.cost_per_unit * qty)
          }, 0)
          
          // HPP = (raw_material_cost × 3) / quantity_produced
          const hppPerUnit = calculateHPP(rawMaterialCost, qty)
          
          updated[index].raw_material_cost = rawMaterialCost
          updated[index].hpp_per_unit = hppPerUnit
        }
      }

      return updated
    })
  }

  const totalHPP = batchItems.reduce((sum, item) => sum + item.raw_material_cost, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (batchItems.length === 0) {
      toast({ title: 'Error', description: 'Tambahkan minimal 1 item produksi', variant: 'destructive' })
      return
    }
    
    const invalidItems = batchItems.filter(item => !item.product_id || item.quantity_produced < 1)
    if (invalidItems.length > 0) {
      toast({ title: 'Error', description: 'Lengkapi semua item produksi', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const isConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

      if (!isConfigured) {
        await new Promise(r => setTimeout(r, 1000))
        toast({ title: 'Berhasil (Demo)', description: `Batch ${batchNumber} berhasil dibuat` })
        onSuccess()
        return
      }

      // Buat batch produksi
      const { data: batch, error: batchError } = await supabase
        .from('production_batches')
        .insert({
          batch_number: batchNumber,
          production_date: productionDate,
          notes: notes || null,
          total_hpp: totalHPP,
          status: 'completed',
        })
        .select()
        .single()

      if (batchError) throw batchError

      // Buat item batch dan stok
      for (const item of batchItems) {
        // Simpan item batch
        await supabase.from('production_batch_items').insert({
          batch_id: batch.id,
          product_id: item.product_id,
          quantity_produced: item.quantity_produced,
          hpp_per_unit: item.hpp_per_unit,
          production_date: productionDate,
          expiry_date: item.expiry_date,
          storage_type: item.storage_type,
          raw_material_cost: item.raw_material_cost,
        })

        // Tambahkan ke stock_items
        await supabase.from('stock_items').insert({
          product_id: item.product_id,
          batch_id: batch.id,
          quantity_remaining: item.quantity_produced,
          production_date: productionDate,
          expiry_date: item.expiry_date,
          storage_type: item.storage_type,
          hpp_per_unit: item.hpp_per_unit,
          is_active: true,
        })

        // Kurangi stok bahan baku berdasarkan resep
        const productRecipes = recipes[item.product_id] || []
        for (const recipe of productRecipes) {
          const { data: material } = await supabase
            .from('raw_materials')
            .select('current_stock')
            .eq('id', recipe.raw_material.id)
            .single()

          if (material) {
            const newStock = Math.max(0, material.current_stock - (recipe.quantity_needed * item.quantity_produced))
            await supabase
              .from('raw_materials')
              .update({ current_stock: newStock })
              .eq('id', recipe.raw_material.id)
          }
        }
      }

      toast({ title: 'Berhasil', description: `Batch ${batchNumber} berhasil dibuat` })
      onSuccess()
    } catch (error) {
      console.error('Gagal membuat batch:', error)
      toast({ title: 'Error', description: 'Gagal membuat batch produksi', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Info batch */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Informasi Batch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nomor Batch</Label>
              <Input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Tanggal Produksi</Label>
              <Input type="date" value={productionDate} onChange={(e) => {
                setProductionDate(e.target.value)
                // Recalculate expiry dates for all items
                setBatchItems(prev => prev.map(item => {
                  if (!item.product) return item
                  const expiryDate = calculateExpiryDate(e.target.value, item.storage_type, item.product)
                  return { ...item, expiry_date: format(expiryDate, 'yyyy-MM-dd') }
                }))
              }} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Catatan</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan batch produksi..." />
          </div>
        </CardContent>
      </Card>

      {/* Item produksi */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Item Produksi</CardTitle>
            <Button type="button" size="sm" onClick={addBatchItem} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              <Plus className="w-3.5 h-3.5" />
              Tambah Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {batchItems.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
              <FlaskConical className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Belum ada item produksi</p>
              <Button type="button" variant="ghost" size="sm" onClick={addBatchItem} className="mt-2 text-emerald-600">
                + Tambah Item
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {batchItems.map((item, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">Item #{index + 1}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-400 hover:text-red-600"
                      onClick={() => removeBatchItem(index)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Produk</Label>
                      <Select
                        value={item.product_id}
                        onValueChange={(v) => updateBatchItem(index, 'product_id', v)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Pilih produk..." />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Jumlah Produksi</Label>
                      <Input
                        type="number"
                        value={item.quantity_produced}
                        onChange={(e) => updateBatchItem(index, 'quantity_produced', Number(e.target.value))}
                        min="1"
                        className="h-8"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Penyimpanan</Label>
                      <Select
                        value={item.storage_type}
                        onValueChange={(v) => updateBatchItem(index, 'storage_type', v as StorageType)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="frozen">Beku (Freezer)</SelectItem>
                          <SelectItem value="fridge">Kulkas</SelectItem>
                          <SelectItem value="room_temp">Suhu Ruang</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Kalkulasi HPP */}
                  {item.product_id && item.quantity_produced > 0 && (
                    <div className="grid grid-cols-3 gap-2 p-3 bg-emerald-50 rounded-lg">
                      <div>
                        <p className="text-xs text-gray-500">Biaya Bahan Baku</p>
                        <p className="text-sm font-medium text-gray-800">{formatCurrency(item.raw_material_cost)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">HPP/Unit</p>
                        <p className="text-sm font-semibold text-emerald-700">{formatCurrency(item.hpp_per_unit)}</p>
                        <p className="text-xs text-gray-400">(biaya × 3 ÷ qty)</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Tgl Kedaluwarsa</p>
                        <p className="text-sm font-medium text-gray-800">{item.expiry_date || '-'}</p>
                      </div>
                    </div>
                  )}

                  {/* Resep bahan baku */}
                  {item.product_id && recipes[item.product_id] && (
                    <div className="text-xs text-gray-500 space-y-0.5">
                      <p className="font-medium text-gray-700">Bahan yang dibutuhkan:</p>
                      {recipes[item.product_id].map((r, ri) => (
                        <p key={ri}>• {r.raw_material.name}: {r.quantity_needed * item.quantity_produced} {r.raw_material.unit}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Total HPP */}
              {batchItems.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-medium text-gray-700">Total Biaya Bahan Baku Batch:</span>
                  </div>
                  <span className="text-base font-bold text-emerald-700">{formatCurrency(totalHPP)}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tombol submit */}
      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Batal</Button>
        <Button
          type="submit"
          disabled={loading || batchItems.length === 0}
          className="bg-emerald-600 hover:bg-emerald-700 gap-2"
        >
          <FlaskConical className="w-4 h-4" />
          {loading ? 'Memproses...' : 'Buat Batch Produksi'}
        </Button>
      </div>
    </form>
  )
}
