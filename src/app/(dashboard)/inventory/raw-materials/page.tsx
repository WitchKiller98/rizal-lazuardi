import { RawMaterialList } from '@/components/inventory/RawMaterialList'

export default function RawMaterialsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bahan Baku</h1>
        <p className="text-sm text-gray-500 mt-0.5">Kelola stok bahan baku produksi MPASI</p>
      </div>
      <RawMaterialList />
    </div>
  )
}
