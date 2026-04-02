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
import { toast } from '@/hooks/use-toast'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'
import type { Customer } from '@/lib/types'
import { Search, Plus, Eye, RefreshCw, Users, Phone } from 'lucide-react'
import { CustomerDetail } from './CustomerDetail'

const DEMO_CUSTOMERS: Customer[] = [
  {
    id: '1', name: 'Ibu Sari Wulandari', phone: '0812-3456-7890',
    address: 'Jl. Melati No. 5, Jakarta Selatan',
    notes: 'Alergi kacang', total_orders: 12, total_spent: 456000,
    last_order_date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
    is_active: true, created_at: '', updated_at: '',
  },
  {
    id: '2', name: 'Bapak Rizki Pratama', phone: '0856-7890-1234',
    address: 'Perumahan Griya Asri Blok B No. 12',
    total_orders: 8, total_spent: 320000,
    last_order_date: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
    is_active: true, created_at: '', updated_at: '',
  },
  {
    id: '3', name: 'Ibu Dewi Rahayu', phone: '0877-6543-2109',
    address: 'Apartemen Sentosa Tower A Lt. 5 Unit 502',
    notes: 'Pelanggan setia, suka MPASI sayuran',
    total_orders: 25, total_spent: 875000,
    last_order_date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
    is_active: true, created_at: '', updated_at: '',
  },
]

export function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const supabase = createClient()

  useEffect(() => { loadCustomers() }, [])

  const loadCustomers = async () => {
    setLoading(true)
    try {
      const isConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

      if (!isConfigured) {
        setCustomers(DEMO_CUSTOMERS)
        return
      }

      const { data } = await supabase
        .from('customers')
        .select('*')
        .order('name')

      setCustomers(data || [])
    } catch {
      setCustomers(DEMO_CUSTOMERS)
    } finally {
      setLoading(false)
    }
  }

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search))
  )

  const getLoyaltyBadge = (totalOrders: number) => {
    if (totalOrders >= 20) return { label: 'Platinum', variant: 'default' as const, color: 'bg-purple-100 text-purple-800' }
    if (totalOrders >= 10) return { label: 'Gold', variant: 'warning' as const, color: 'bg-yellow-100 text-yellow-800' }
    if (totalOrders >= 5) return { label: 'Silver', variant: 'secondary' as const, color: 'bg-gray-100 text-gray-700' }
    return { label: 'Bronze', variant: 'secondary' as const, color: 'bg-amber-100 text-amber-700' }
  }

  return (
    <div className="space-y-4">
      {showDetail && selectedCustomer ? (
        <CustomerDetail
          customer={selectedCustomer}
          onBack={() => { setShowDetail(false); setSelectedCustomer(null) }}
        />
      ) : (
        <>
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Cari nama atau nomor HP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadCustomers}>
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                onClick={() => setShowAddDialog(true)}
                className="bg-emerald-600 hover:bg-emerald-700 gap-2"
              >
                <Plus className="w-4 h-4" />
                Tambah Pelanggan
              </Button>
            </div>
          </div>

          {/* Ringkasan statistik */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{customers.length}</p>
                  <p className="text-xs text-gray-500">Total Pelanggan</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Phone className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">
                    {customers.filter(c => c.last_order_date &&
                      new Date(c.last_order_date) >= new Date(Date.now() - 30 * 86400000)
                    ).length}
                  </p>
                  <p className="text-xs text-gray-500">Aktif 30 Hari</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">
                    {customers.filter(c => c.total_orders >= 10).length}
                  </p>
                  <p className="text-xs text-gray-500">Pelanggan Loyal</p>
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>No. HP</TableHead>
                  <TableHead className="text-right">Total Pesanan</TableHead>
                  <TableHead className="text-right">Total Belanja</TableHead>
                  <TableHead>Pesanan Terakhir</TableHead>
                  <TableHead>Loyalitas</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-400">Memuat data...</TableCell>
                  </TableRow>
                ) : filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">Tidak ada pelanggan ditemukan</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map(customer => {
                    const loyalty = getLoyaltyBadge(customer.total_orders)
                    return (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm text-gray-900">{customer.name}</p>
                            {customer.notes && (
                              <p className="text-xs text-gray-500 truncate max-w-[200px]">{customer.notes}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{customer.phone || '-'}</TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {formatNumber(customer.total_orders)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium text-emerald-700">
                          {formatCurrency(customer.total_spent)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {customer.last_order_date ? formatDate(customer.last_order_date) : '-'}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${loyalty.color}`}>
                            {loyalty.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setSelectedCustomer(customer)
                              setShowDetail(true)
                            }}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      <CustomerFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => { setShowAddDialog(false); loadCustomers() }}
      />
    </div>
  )
}

// Form tambah pelanggan
function CustomerFormDialog({
  open, onOpenChange, onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const isConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')

      if (!isConfigured) {
        await new Promise(r => setTimeout(r, 500))
        toast({ title: 'Berhasil (Demo)', description: 'Pelanggan berhasil ditambahkan' })
        onSuccess(); return
      }

      await supabase.from('customers').insert({
        name, phone: phone || null, address: address || null, notes: notes || null,
      })
      toast({ title: 'Berhasil', description: 'Pelanggan berhasil ditambahkan' })
      onSuccess()
    } catch {
      toast({ title: 'Error', description: 'Gagal menambahkan pelanggan', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Pelanggan Baru</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nama <span className="text-red-500">*</span></Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>No. HP / WhatsApp</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0812-xxxx-xxxx" />
          </div>
          <div className="space-y-2">
            <Label>Alamat Pengiriman</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Catatan (alergi, preferensi, dll)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Contoh: Alergi susu sapi" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
              {loading ? 'Menyimpan...' : 'Tambah Pelanggan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
