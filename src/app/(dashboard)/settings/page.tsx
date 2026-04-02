'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { Settings, User, Bell, Database, Bot, Shield } from 'lucide-react'

export default function SettingsPage() {
  const [businessName, setBusinessName] = useState('Dapur MPASI Sehat')
  const [businessPhone, setBusinessPhone] = useState('+62812345678')
  const [businessAddress, setBusinessAddress] = useState('Jakarta, Indonesia')
  const [telegramToken, setTelegramToken] = useState('')
  const [webhookUrl, setWebhookUrl] = useState(
    process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/telegram/webhook` : ''
  )
  const [isSaving, setIsSaving] = useState(false)

  const isSupabaseConfigured = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
  )

  const handleSaveSettings = async () => {
    setIsSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setIsSaving(false)
    toast({ title: 'Pengaturan disimpan', description: 'Perubahan berhasil disimpan' })
  }

  const handleSetupWebhook = async () => {
    if (!telegramToken) {
      toast({ title: 'Error', description: 'Masukkan Telegram Bot Token terlebih dahulu', variant: 'destructive' })
      return
    }
    toast({ title: 'Info', description: 'Setup webhook melalui perintah: POST /api/telegram/webhook/setup' })
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan</h1>
        <p className="text-sm text-gray-500 mt-0.5">Konfigurasi aplikasi MPASI POS</p>
      </div>

      {/* Status sistem */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="w-4 h-4" />
            Status Sistem
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium">Supabase Database</span>
            </div>
            <Badge variant={isSupabaseConfigured ? 'success' : 'warning'}>
              {isSupabaseConfigured ? 'Terhubung' : 'Demo Mode'}
            </Badge>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium">Telegram Bot</span>
            </div>
            <Badge variant={process.env.NEXT_PUBLIC_TELEGRAM_BOT_CONFIGURED === 'true' ? 'default' : 'secondary'}>
              {process.env.NEXT_PUBLIC_TELEGRAM_BOT_CONFIGURED === 'true' ? 'Aktif' : 'Belum Dikonfigurasi'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="bisnis">
        <TabsList>
          <TabsTrigger value="bisnis">Bisnis</TabsTrigger>
          <TabsTrigger value="telegram">Telegram Bot</TabsTrigger>
          <TabsTrigger value="akun">Akun</TabsTrigger>
        </TabsList>

        <TabsContent value="bisnis">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informasi Bisnis</CardTitle>
              <CardDescription>Nama dan kontak bisnis yang ditampilkan di struk</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nama Bisnis</Label>
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>No. HP/WhatsApp Bisnis</Label>
                <Input value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Alamat</Label>
                <Input value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} />
              </div>
              <Button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="telegram">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="w-4 h-4" />
                Konfigurasi Telegram Bot
              </CardTitle>
              <CardDescription>
                Setup bot Telegram untuk notifikasi dan perintah jarak jauh
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                <p className="font-medium text-blue-800 mb-2">Cara Setup Telegram Bot:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-700">
                  <li>Buka Telegram, cari @BotFather</li>
                  <li>Kirim /newbot dan ikuti instruksi</li>
                  <li>Copy token yang diberikan</li>
                  <li>Paste token di field di bawah</li>
                  <li>Klik Setup Webhook</li>
                </ol>
              </div>
              
              <div className="space-y-2">
                <Label>Telegram Bot Token</Label>
                <Input
                  value={telegramToken}
                  onChange={(e) => setTelegramToken(e.target.value)}
                  placeholder="1234567890:ABCdefGHIjklmNOPqrstUVwxyz"
                  type="password"
                />
                <p className="text-xs text-gray-500">Dapatkan dari @BotFather di Telegram</p>
              </div>

              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <Input
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://yourdomain.com/api/telegram/webhook"
                />
              </div>

              <Button
                onClick={handleSetupWebhook}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Setup Webhook
              </Button>

              <Separator />

              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Perintah Bot yang Tersedia:</p>
                <div className="space-y-2">
                  {[
                    { cmd: '/start', desc: 'Tampilkan menu utama' },
                    { cmd: '/stok', desc: 'Cek stok produk MPASI' },
                    { cmd: '/stokbahan', desc: 'Cek stok bahan baku' },
                    { cmd: '/jual [produk] [qty]', desc: 'Catat penjualan cepat' },
                    { cmd: '/laporan', desc: 'Laporan penjualan hari ini' },
                    { cmd: '/expired', desc: 'Produk yang akan kedaluwarsa' },
                    { cmd: '/restock', desc: 'Rekomendasi restock' },
                    { cmd: '/pelanggan [nama/telp]', desc: 'Cari data pelanggan' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                      <code className="font-mono font-bold text-emerald-700">{item.cmd}</code>
                      <span className="text-gray-600">{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="akun">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4" />
                Pengaturan Akun
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nama Lengkap</Label>
                <Input defaultValue="Admin MPASI" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" defaultValue="admin@mpasi.com" />
              </div>
              
              <Separator />
              
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Ubah Password</p>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Password Saat Ini</Label>
                    <Input type="password" placeholder="••••••••" />
                  </div>
                  <div className="space-y-2">
                    <Label>Password Baru</Label>
                    <Input type="password" placeholder="••••••••" />
                  </div>
                  <div className="space-y-2">
                    <Label>Konfirmasi Password Baru</Label>
                    <Input type="password" placeholder="••••••••" />
                  </div>
                </div>
              </div>

              <Button className="bg-emerald-600 hover:bg-emerald-700">
                Simpan Perubahan
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
