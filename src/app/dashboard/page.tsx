'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  TrendingUp, Calendar, 
  ArrowDownCircle, ArrowUpCircle, 
  Banknote, CreditCard, Receipt, PieChart, Coins,
  AlertTriangle, Loader2, History, RefreshCcw
} from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [stats, setStats] = useState({
    activeSales: 0,       // Aktif Vardiya Cirosu
    lifetimeSales: 0,     // Tüm Zamanlar Ciro
    activeCount: 0,       // Aktif İşlem Sayısı
    totalStockValue: 0,   // Stok Değeri
    lowStockItems: [] as any[], 
    activeProfit: 0,      // Aktif Kâr
    paymentDistribution: { cash: 0, card: 0, credit: 0 },
    pastCollections: 0,   
    totalPayments: 0,
    customerCount: 0,
    lastZDate: null as string | null // Son Z Raporu Tarihi
  });

  // Veri çekme fonksiyonunu useCallback ile sarmaladık ki tekrar kullanabilelim
  const fetchDashboardStats = useCallback(async () => {
    try {
      // 1. Önce En Son Z Raporu Tarihini Bulalım
      const { data: lastZ, error: zError } = await supabase
        .from('z_reports')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(); // single() yerine maybeSingle() hata riskini azaltır
      
      // Eğer hiç Z raporu yoksa milat (1970) kabul et
      const cutoffDateStr = lastZ?.created_at || new Date(0).toISOString();

      // 2. AKTİF SATIŞLAR (Doğrudan veritabanında filtreliyoruz)
      // Sadece son Z raporundan SONRAKİ kayıtları getirir.
      const { data: activeSalesData } = await supabase
        .from('sale_transactions') 
        .select('*, sale_items(*)')
        .gt('created_at', cutoffDateStr); // Server-side filtreleme (Garanti çözüm)
      
      // 3. TÜM ZAMANLAR (Sadece toplam ciro için basit sorgu)
      const { data: totalSalesData } = await supabase
        .from('sale_transactions')
        .select('total_amount');
      
      let tSales = totalSalesData?.reduce((acc, s) => acc + Number(s.total_amount), 0) || 0;
      let aSales = 0; 
      let aProfit = 0;
      let aCount = 0;
      let dist = { cash: 0, card: 0, credit: 0 };

      // Aktif verileri işle
      if (activeSalesData) {
        activeSalesData.forEach(s => {
          const amt = Number(s.total_amount) || 0;
          aSales += amt;
          aCount++;

          // Ödeme Dağılımı
          const method = s.payment_method;
          if (method === 'cash') dist.cash += amt;
          else if (method === 'card') dist.card += amt;
          else dist.credit += amt;

          // Kâr Hesabı
          s.sale_items?.forEach((item: any) => {
            const quantity = Number(item.quantity) || 0;
            const revenue = Number(item.unit_price) * quantity;
            const cost = Number(item.buy_price || 0) * quantity; 
            if (cost > 0) aProfit += (revenue - cost);
          });
        });
      }

      // 4. Stok ve Diğer Veriler (Anlık Durum)
      const { data: products } = await supabase.from('products').select('*');
      const stockVal = products?.reduce((sum, p) => sum + (Number(p.stock_quantity) * Number(p.buy_price || 0)), 0) || 0;
      const criticals = products?.filter(p => Number(p.stock_quantity) <= Number(p.critical_stock_level || 5)) || [];

      // Ekstra Ödemeler (Sadece Z raporundan sonrakiler)
      let totalOut = 0;
      let collections = 0;
      
      try {
        const { data: payments } = await supabase.from('supplier_payments').select('amount').gt('created_at', cutoffDateStr);
        totalOut = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

        const { data: custPayments } = await supabase.from('customer_payments').select('amount').gt('created_at', cutoffDateStr);
        collections = custPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      } catch (e) {}

      const { count: cCount } = await supabase.from('customers').select('*', { count: 'exact', head: true });

      setStats({
        activeSales: aSales,
        lifetimeSales: tSales,
        activeCount: aCount,
        totalStockValue: stockVal,
        lowStockItems: criticals,
        activeProfit: aProfit,
        paymentDistribution: dist,
        pastCollections: collections,
        totalPayments: totalOut,
        customerCount: cCount || 0,
        lastZDate: lastZ ? lastZ.created_at : null
      });

    } catch (error) {
      console.error('Veri çekme hatası:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchDashboardStats(); }, [fetchDashboardStats]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardStats();
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={40} /></div>;

  return (
    <div className="p-6 bg-[#F8FAFC] min-h-screen space-y-6 font-sans">
      
      {/* ÜST BAŞLIK */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">GENEL BAKIŞ</h1>
            <button 
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 bg-white border border-slate-200 rounded-full text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCcw size={16} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
          
          <div className="flex items-center gap-2 mt-1">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                SON Z RAPORU: {stats.lastZDate ? format(new Date(stats.lastZDate), 'd MMMM HH:mm', { locale: tr }) : 'YOK (BAŞLANGIÇ)'}
             </span>
             {stats.lastZDate && (
                <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold uppercase">
                  O ANDAN İTİBAREN
                </span>
             )}
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm font-bold text-slate-600 text-xs">
          <Calendar size={16} /> {new Date().toLocaleDateString('tr-TR')}
        </div>
      </div>

      {/* ANA KARTLAR (Z RAPORUNA GÖRE SIFIRLANAN VERİLER) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* AKTİF CİRO */}
        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm border-t-4 border-t-blue-500 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
             <TrendingUp size={60}/>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">AKTİF CİRO</p>
          <h2 className="text-2xl font-black text-slate-800">₺{stats.activeSales.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</h2>
          <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 w-fit px-2 py-0.5 rounded-full">
            <History size={12}/> SON Z'DEN BERİ
          </div>
        </div>

        {/* AKTİF KÂR */}
        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm border-t-4 border-t-emerald-500 relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
             <PieChart size={60}/>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">DÖNEM KÂRI</p>
          <h2 className={`text-2xl font-black ${stats.activeProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            ₺{stats.activeProfit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </h2>
          <p className="text-[9px] text-slate-400 font-bold mt-1">Bu vardiyadaki tahmini net kâr.</p>
        </div>

        {/* STOK VARLIK DEĞERİ (SIFIRLANMAZ) */}
        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm border-t-4 border-t-purple-500">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">TOPLAM STOK DEĞERİ</p>
          <h2 className="text-2xl font-black text-slate-800">₺{stats.totalStockValue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</h2>
          <p className="text-[9px] text-slate-400 font-bold mt-1">Depodaki malların maliyeti (Sabit).</p>
        </div>

        {/* İŞLEM ADEDİ */}
        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm border-t-4 border-t-slate-800">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">İŞLEM ADEDİ</p>
          <h2 className="text-2xl font-black text-slate-800">{stats.activeCount} ADET</h2>
          <p className="text-[9px] text-slate-400 font-bold mt-1">Son kapanıştan beri kesilen fiş.</p>
        </div>

      </div>

      {/* DETAYLAR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ÖDEME DAĞILIMI (AKTİF DÖNEM) */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
          <h3 className="text-sm font-black text-slate-800 uppercase mb-8 flex items-center gap-2">
            <PieChart size={18} className="text-blue-600"/> AKTİF ÖDEME DAĞILIMI
          </h3>
          {stats.activeSales === 0 ? (
             <div className="p-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <p className="text-xs font-bold text-slate-400">Henüz yeni bir işlem yapılmadı.</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                <Banknote className="text-emerald-500 mb-2" size={20}/>
                <p className="text-[9px] font-black text-slate-400 uppercase">NAKİT</p>
                <p className="text-lg font-black text-slate-800">₺{stats.paymentDistribution.cash.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                <CreditCard className="text-blue-500 mb-2" size={20}/>
                <p className="text-[9px] font-black text-slate-400 uppercase">KART</p>
                <p className="text-lg font-black text-slate-800">₺{stats.paymentDistribution.card.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="p-5 bg-orange-50 rounded-3xl border border-orange-100">
                <Receipt className="text-orange-500 mb-2" size={20}/>
                <p className="text-[9px] font-black text-orange-400 uppercase">VERESİYE</p>
                <p className="text-lg font-black text-orange-700">₺{stats.paymentDistribution.credit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
                </div>
            </div>
          )}
        </div>

        {/* KASA HAREKETLERİ (EKSTRALAR) */}
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
                 <span className="text-lg font-black text-blue-600">
                    ₺{(stats.paymentDistribution.cash + stats.pastCollections - stats.totalPayments).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                 </span>
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