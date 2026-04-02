import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { Toaster } from '@/components/ui/toaster'

// Layout utama untuk semua halaman dashboard
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar - hanya tampil di desktop (hidden di mobile, pakai sheet) */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Konten utama */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header dengan user menu dan notifikasi */}
        <Header />
        
        {/* Area konten halaman */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
      
      {/* Toast notifications */}
      <Toaster />
    </div>
  )
}
