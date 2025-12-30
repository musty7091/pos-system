'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  History, 
  Package, 
  FileText, 
  Wallet, 
  Users, 
  BarChart3,
  LogOut,
  Settings, // Yeni ikon
  Tags      // Alternatif ikon
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    toast.success('Çıkış yapıldı');
  };

  const menuItems = [
    {
      title: 'Genel Bakış',
      icon: LayoutDashboard,
      href: '/dashboard',
    },
    {
      title: 'Satış Ekranı (POS)',
      icon: ShoppingCart,
      href: '/dashboard/pos',
    },
    {
      title: 'Geçmiş Satışlar',
      icon: History,
      href: '/dashboard/sales',
    },
    {
      title: 'Stok Yönetimi',
      icon: Package,
      href: '/dashboard/inventory',
    },
    {
      title: 'Tanımlamalar', // YENİ EKLENEN SAYFA
      icon: Settings,        // Ayarlar ikonu uygun
      href: '/dashboard/definitions',
    },
    {
      title: 'Alış Faturaları',
      icon: FileText,
      href: '/dashboard/invoices',
    },
    {
      title: 'Finans & Kasa',
      icon: Wallet,
      href: '/dashboard/finance',
    },
    {
      title: 'Müşteri & Cari',
      icon: Users,
      href: '/dashboard/customers',
    },
    {
      title: 'Raporlar',
      icon: BarChart3,
      href: '/dashboard/reports',
    },
  ];

  return (
    <div className="w-64 bg-[#0F172A] text-white flex flex-col h-screen fixed left-0 top-0 z-50 shadow-xl">
      {/* LOGO */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/50">
          <ShoppingCart className="text-white" size={20} />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tighter">POS <span className="text-blue-500">SYSTEM</span></h1>
          <p className="text-[10px] text-slate-400 font-medium tracking-wide">Yönetim Paneli</p>
        </div>
      </div>

      {/* MENÜ */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-200
                ${isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 translate-x-1' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white hover:translate-x-1'
                }
              `}
            >
              <item.icon size={18} className={isActive ? 'text-white' : 'text-slate-500'} />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* ÇIKIŞ */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200"
        >
          <LogOut size={18} />
          <span>Sistemden Çık</span>
        </button>
      </div>
    </div>
  );
}