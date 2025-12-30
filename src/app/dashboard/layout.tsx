'use client';

import Sidebar from '@/components/ui/Sidebar'; 
import Header from '@/components/ui/Header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#F1F5F9] flex">
      {/* Sidebar - Sabit Sol Panel */}
      <aside className="w-64 fixed inset-y-0 left-0 z-50">
        <Sidebar />
      </aside>
      
      {/* Ana İçerik Alanı */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Header - Üst Bilgi Satırı */}
        <Header />
        
        {/* Dinamik Sayfa İçeriği */}
        <main className="flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}