import { POSTerminal } from '@/components/pos/POSTerminal'

export default function POSPage() {
  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Kasir (POS)</h1>
        <p className="text-sm text-gray-500 mt-0.5">Catat transaksi penjualan MPASI</p>
      </div>
      <div className="flex-1 min-h-0">
        <POSTerminal />
      </div>
    </div>
  )
}
