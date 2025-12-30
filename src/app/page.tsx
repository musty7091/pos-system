// src/app/dashboard/page.tsx
'use client';

import React from 'react';
import { Users, ShoppingCart, DollarSign, AlertTriangle, Loader2 } from 'lucide-react';
import { useDashboardStats } from '@/features/dashboard/hooks/useDashboardStats';
import StatsCard from '@/features/dashboard/components/StatsCard';

export default function DashboardPage() {
  const { stats, isLoading } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-slate-800">Genel Bakış</h1>
        <p className="text-slate-500 text-sm">İşletmenizin anlık durum özeti.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Toplam Ciro */}
        <StatsCard 
          title="Toplam Ciro" 
          value={`₺${stats.totalSales.toFixed(2)}`} 
          icon={DollarSign} 
          color="green"
        />

        {/* Toplam Satış Adedi */}
        <StatsCard 
          title="Toplam Satış" 
          value={stats.totalOrders} 
          icon={ShoppingCart} 
          color="blue"
        />

        {/* Müşteri Sayısı */}
        <StatsCard 
          title="Müşteri Sayısı" 
          value={stats.totalCustomers} 
          icon={Users} 
          color="purple"
        />

        {/* Kritik Stok Uyarısı */}
        <StatsCard 
          title="Kritik Stok" 
          value={stats.lowStockCount} 
          icon={AlertTriangle} 
          color="orange"
          trend={stats.lowStockCount > 0 ? 'İlgilenmelisiniz' : 'Sorun Yok'}
        />
      </div>

      {/* İleride buraya 'Son Satışlar Tablosu' veya 'Grafikler' de ekleyebiliriz */}
      <div className="mt-8 p-8 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200 text-center">
        <p className="text-slate-400 font-bold text-sm">
          Grafikler ve Detaylı Raporlar Çok Yakında...
        </p>
      </div>
    </div>
  );
}