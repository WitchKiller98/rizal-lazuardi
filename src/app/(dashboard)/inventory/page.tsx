import { ProductList } from '@/components/inventory/ProductList'

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inventori Produk</h1>
        <p className="text-sm text-gray-500 mt-0.5">Kelola stok produk MPASI</p>
      </div>
      <ProductList />
    </div>
  )
}
