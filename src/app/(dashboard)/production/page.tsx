'use client'

import { useState } from 'react'
import { BatchList } from '@/components/production/BatchList'
import { BatchForm } from '@/components/production/BatchForm'

export default function ProductionPage() {
  const [showForm, setShowForm] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleSuccess = () => {
    setShowForm(false)
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manajemen Produksi</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Kelola batch produksi MPASI, HPP otomatis, dan tracking stok
        </p>
      </div>

      {showForm ? (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Batch Produksi Baru</h2>
            <p className="text-sm text-gray-500">Isi detail produksi dan HPP akan dihitung otomatis</p>
          </div>
          <BatchForm
            onSuccess={handleSuccess}
            onCancel={() => setShowForm(false)}
          />
        </div>
      ) : (
        <BatchList
          key={refreshKey}
          onAddBatch={() => setShowForm(true)}
        />
      )}
    </div>
  )
}
