import { CustomerList } from '@/components/customers/CustomerList'

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manajemen Pelanggan</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Data pelanggan, riwayat pembelian, dan program loyalitas
        </p>
      </div>
      <CustomerList />
    </div>
  )
}
