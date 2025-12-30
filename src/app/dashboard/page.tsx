'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  TrendingUp, Package, Users, ShoppingCart, Loader2, Calendar, Wallet,
  AlertTriangle, ArrowDownCircle, ArrowUpCircle, Activity, CreditCard,
  Banknote, Receipt, PieChart, Coins
} from 'lucide-react';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    dailySales: 0,        // Günlük Ciro
    totalSales: 0,        // Toplam Ciro
    saleCount: 0,         // Toplam İşlem Sayısı
    totalStockValue: 0,   // Stok Varlık Değeri
    lowStockItems: [] as any[], // Kritik Stok Listesi
    totalProfit: 0,       // Kâr Zarar Raporu
    paymentDistribution: { cash: 0, card: 0, credit: 0 }, // Nakit-Kart-Veresiye
    pastCollections: 0,   // Geriden Tahsilat
    totalPayments: 0,     // Kasadan Yapılan Ödemeler
    customerCount: 0
  });

  useEffect(() => { fetchDashboardStats(); }, []);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0,0,0,0);
      const todayISO = today.toISOString();

      // 1. Satışlar ve Kârlılık Analizi
      const { data: sales } = await supabase.from('sales').select('*, sale_items(*)');
      
      let tSales = 0;
      let dSales = 0;
      let tProfit = 0;
      let dist = { cash: 0, card: 0, credit: 0 };

      sales?.forEach(s => {
        const amt = Number(s.total_amount);
        tSales += amt;
        
        // Günlük Ciro Hesabı
        if (new Date(s.created_at) >= today) dSales += amt;

        // Ödeme Dağılımı
        if (s.payment_method === 'cash') dist.cash += amt;
        else if (s.payment_method === 'card') dist.card += amt;
        else dist.credit += amt;

        // Kâr Hesabı (Satış Fiyatı - Alış Maliyeti)
        s.sale_items?.forEach((item: any) => {
          const revenue = Number(item.unit_price) * item.quantity;
          const cost = Number(item.buy_price || 0) * item.quantity; // Ürün o anki maliyeti
          tProfit += (revenue - cost);
        });
      });

      // 2. Stok Varlık Değeri ve Kritik Stoklar
      const { data: products } = await supabase.from('products').select('*');
      const stockVal = products?.reduce((sum, p) => sum + (Number(p.stock_quantity) * Number(p.buy_price || 0)), 0) || 0;
      const criticals = products?.filter(p => Number(p.stock_quantity) <= Number(p.critical_limit || 5)) || [];

      // 3. Tahsilatlar ve Ödemeler (Kasadan Çıkan / Geriden Gelen)
      const { data: payments } = await supabase.from('supplier_payments').select('amount');
      const totalOut = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      // Müşteri Ödemeleri (Geriden Tahsilat)
      const { data: custPayments } = await supabase.from('customer_payments').select('amount');
      const collections = custPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      const { count: cCount } = await supabase.from('customers').select('*', { count: 'exact', head: true });

      setStats({
        dailySales: dSales,
        totalSales: tSales,
        saleCount: sales?.length || 0,
        totalStockValue: stockVal,
        lowStockItems: criticals,
        totalProfit: tProfit,
        paymentDistribution: dist,
        pastCollections: collections,
        totalPayments: totalOut,
        customerCount: cCount || 0
      });
    } catch (error) {
      console.error('Veri çekme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={40} /></div>;

  return (
    <div className="p-6 bg-[#F8FAFC] min-h-screen space-y-6 font-sans">
      
      {/* ÜST BAŞLIK */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">FİNANSAL ÖZET</h1>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">İşletme Kâr ve Nakit Durumu</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm font-bold text-slate-600 text-xs">
          <Calendar size={16} /> {new Date().toLocaleDateString('tr-TR')}
        </div>
      </div>

      {/* KRİTİK FİNANSAL KARTLAR */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* GÜNLÜK CİRO */}
        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm border-t-4 border-t-blue-500">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">GÜNLÜK CİRO</p>
          <h2 className="text-2xl font-black text-slate-800">₺{stats.dailySales.toLocaleString('tr-TR')}</h2>
          <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 w-fit px-2 py-0.5 rounded-full">
            <TrendingUp size={12}/> BUGÜNÜN VERİSİ
          </div>
        </div>

        {/* TOPLAM KÂR (Net Kâr Zarar) */}
        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm border-t-4 border-t-emerald-500">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">BRÜT KÂR DURUMU</p>
          <h2 className={`text-2xl font-black ${stats.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            ₺{stats.totalProfit.toLocaleString('tr-TR')}
          </h2>
          <p className="text-[9px] text-slate-400 font-bold mt-1">Satışlardan elde edilen tahmini kâr.</p>
        </div>

        {/* STOK VARLIK DEĞERİ */}
        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm border-t-4 border-t-purple-500">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">STOK VARLIK DEĞERİ</p>
          <h2 className="text-2xl font-black text-slate-800">₺{stats.totalStockValue.toLocaleString('tr-TR')}</h2>
          <p className="text-[9px] text-slate-400 font-bold mt-1">Depodaki malların alış maliyeti.</p>
        </div>

        {/* TOPLAM İŞLEM */}
        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm border-t-4 border-t-slate-800">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">TOPLAM İŞLEM SAYISI</p>
          <h2 className="text-2xl font-black text-slate-800">{stats.saleCount} ADET</h2>
          <p className="text-[9px] text-slate-400 font-bold mt-1">Sistemdeki toplam fiş/fatura sayısı.</p>
        </div>

      </div>

      {/* NAKİT AKIŞI VE ÖDEME DAĞILIMI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ÖDEME DAĞILIMI */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
          <h3 className="text-sm font-black text-slate-800 uppercase mb-8 flex items-center gap-2">
            <PieChart size={18} className="text-blue-600"/> SATIŞ ÖDEME DAĞILIMI
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
              <Banknote className="text-emerald-500 mb-2" size={20}/>
              <p className="text-[9px] font-black text-slate-400 uppercase">NAKİT</p>
              <p className="text-lg font-black text-slate-800">₺{stats.paymentDistribution.cash.toLocaleString()}</p>
            </div>
            <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
              <CreditCard className="text-blue-500 mb-2" size={20}/>
              <p className="text-[9px] font-black text-slate-400 uppercase">KART</p>
              <p className="text-lg font-black text-slate-800">₺{stats.paymentDistribution.card.toLocaleString()}</p>
            </div>
            <div className="p-5 bg-orange-50 rounded-3xl border border-orange-100">
              <Receipt className="text-orange-500 mb-2" size={20}/>
              <p className="text-[9px] font-black text-orange-400 uppercase">VERESİYE</p>
              <p className="text-lg font-black text-orange-700">₺{stats.paymentDistribution.credit.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* KASA HAREKETLERİ */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
          <h3 className="text-sm font-black text-slate-800 uppercase border-b pb-4 flex items-center gap-2">
            <Coins size={18} className="text-amber-500"/> KASA EKSTRALARI
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ArrowDownCircle className="text-emerald-500" size={16}/>
                <span className="text-xs font-bold text-slate-600">Geriden Tahsilat</span>
              </div>
              <span className="font-black text-slate-800 text-sm">₺{stats.pastCollections.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ArrowUpCircle className="text-red-500" size={16}/>
                <span className="text-xs font-bold text-slate-600">Yapılan Ödemeler</span>
              </div>
              <span className="font-black text-slate-800 text-sm">₺{stats.totalPayments.toLocaleString()}</span>
            </div>
            <div className="pt-4 border-t border-dashed">
               <div className="flex justify-between items-center">
                 <span className="text-[10px] font-black text-slate-400 uppercase">Net Kasa Değişimi</span>
                 <span className="text-lg font-black text-blue-600">₺{(stats.paymentDistribution.cash + stats.pastCollections - stats.totalPayments).toLocaleString()}</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* ALT LİSTE: KRİTİK STOKLAR */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-sm font-black text-slate-800 uppercase flex items-center gap-2">
            <AlertTriangle size={18} className="text-orange-500"/> KRİTİK STOK SEVİYESİNDEKİ ÜRÜNLER
          </h3>
          <span className="text-[10px] font-black bg-slate-100 px-3 py-1 rounded-full text-slate-500 uppercase">{stats.lowStockItems.length} ÜRÜN RİSKTE</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.lowStockItems.length === 0 ? (
            <div className="col-span-full p-10 text-center text-slate-400 font-bold bg-slate-50 rounded-[2rem] border-2 border-dashed">Tüm ürünlerin stoğu güvenli seviyede.</div>
          ) : (
            stats.lowStockItems.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-red-50/50 rounded-2xl border border-red-100">
                <div className="flex flex-col">
                  <span className="text-xs font-black text-slate-700 uppercase truncate max-w-[150px]">{item.name}</span>
                  <span className="text-[10px] font-bold text-slate-400">Maliyet: ₺{item.buy_price}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-red-600">Kalan: {item.stock_quantity}</span>
                  <div className="w-16 bg-red-200 h-1.5 rounded-full mt-1 overflow-hidden">
                    <div className="bg-red-600 h-full" style={{ width: `${(item.stock_quantity / (item.critical_limit || 10)) * 100}%` }}></div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}