'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Wallet, TrendingUp, History, ArrowRightLeft, 
  Banknote, CreditCard, Lock, Calendar, AlertCircle, Loader2,
  PlusCircle, MinusCircle, X, Save
} from 'lucide-react';
import { toast } from 'sonner';

export default function FinancePage() {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // Anlık Kasa Durumu (Son Z Raporundan sonraki işlemler)
  const [currentShift, setCurrentShift] = useState({
    startTime: null as string | null,
    totalSales: 0,
    cashTotal: 0,
    cardTotal: 0,
    creditTotal: 0,
    profitTotal: 0,
    transactionCount: 0
  });

  // Geçmiş ve Ana Kasa
  const [history, setHistory] = useState<any[]>([]);
  const [mainSafeBalance, setMainSafeBalance] = useState(0);

  // Manuel İşlem Modalı State'leri
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [manualAmount, setManualAmount] = useState('');
  const [manualDesc, setManualDesc] = useState('');

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      // 1. En son Z Raporu
      const { data: lastZ } = await supabase
        .from('z_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const lastZDate = lastZ ? lastZ.created_at : '1970-01-01T00:00:00.000Z';

      // 2. Aktif Satışlar
      const { data: activeSales } = await supabase
        .from('sale_transactions')
        .select('*, sale_items(*)')
        .gt('created_at', lastZDate);

      // 3. Vardiya İstatistikleri
      let stats = {
        startTime: lastZ ? lastZ.created_at : null,
        totalSales: 0,
        cashTotal: 0,
        cardTotal: 0,
        creditTotal: 0,
        profitTotal: 0,
        transactionCount: activeSales?.length || 0
      };

      if (activeSales) {
        activeSales.forEach(sale => {
          const amount = Number(sale.total_amount);
          stats.totalSales += amount;
          
          if (sale.payment_method === 'cash') stats.cashTotal += amount;
          else if (sale.payment_method === 'card') stats.cardTotal += amount;
          else stats.creditTotal += amount;

          sale.sale_items?.forEach((item: any) => {
             const cost = Number(item.buy_price || 0) * item.quantity;
             const revenue = Number(item.unit_price) * item.quantity;
             if (cost > 0) stats.profitTotal += (revenue - cost);
          });
        });
      }
      setCurrentShift(stats);

      // 4. Geçmiş Z Raporları
      const { data: zHistory } = await supabase
        .from('z_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      setHistory(zHistory || []);

      // 5. ANA KASA BAKİYESİ (DÜZELTİLDİ: Giriş - Çıkış)
      const { data: safeTransactions } = await supabase.from('main_safe_transactions').select('amount, transaction_type');
      
      let balance = 0;
      safeTransactions?.forEach(t => {
          if (t.transaction_type === 'deposit') balance += Number(t.amount);
          else if (t.transaction_type === 'withdrawal') balance -= Number(t.amount);
      });
      setMainSafeBalance(balance);

    } catch (error) {
      console.error('Hata:', error);
    } finally {
      setLoading(false);
    }
  };

  // Z RAPORU ALMA
  const handleCreateZReport = async () => {
    if (currentShift.transactionCount === 0) {
      toast.error('Kasa zaten boş, işlem yok.');
      return;
    }

    if (!confirm(`Toplam ₺${currentShift.totalSales.toFixed(2)} tutarında GÜN SONU alınacak ve kasa sıfırlanacak. Onaylıyor musunuz?`)) return;

    setProcessing(true);
    const loadingToast = toast.loading('Z Raporu oluşturuluyor...');

    try {
      // A. Raporu Kaydet
      const { data: zReport, error: zError } = await supabase
        .from('z_reports')
        .insert([{
          start_time: currentShift.startTime || new Date(0).toISOString(),
          end_time: new Date().toISOString(),
          total_sales: currentShift.totalSales,
          total_cash: currentShift.cashTotal,
          total_card: currentShift.cardTotal,
          total_credit: currentShift.creditTotal,
          total_profit: currentShift.profitTotal,
          transaction_count: currentShift.transactionCount,
          notes: 'Gün sonu kapanışı'
        }])
        .select()
        .single();

      if (zError) throw zError;

      // B. Nakit Parayı Ana Kasaya Aktar
      if (currentShift.cashTotal > 0) {
        const { error: safeError } = await supabase
          .from('main_safe_transactions')
          .insert([{
             amount: currentShift.cashTotal,
             transaction_type: 'deposit',
             source_type: 'z_report',
             reference_id: zReport.id,
             description: `${new Date().toLocaleDateString('tr-TR')} Z Raporu Devri`
          }]);
        if (safeError) throw safeError;
      }

      toast.success('Gün kapatıldı, kasa devredildi.', { id: loadingToast });
      fetchFinanceData();

    } catch (error: any) {
      toast.error(error.message, { id: loadingToast });
    } finally {
      setProcessing(false);
    }
  };

  // MANUEL KASA İŞLEMİ (Ekleme / Çıkarma)
  const handleManualTransaction = async () => {
      const amount = parseFloat(manualAmount);
      if (!amount || amount <= 0) {
          toast.error('Geçerli bir tutar giriniz.');
          return;
      }
      if (!manualDesc) {
          toast.error('Lütfen bir açıklama giriniz (Örn: Kira Ödemesi)');
          return;
      }

      setProcessing(true);
      try {
          const { error } = await supabase.from('main_safe_transactions').insert([{
              amount: amount,
              transaction_type: modalType, // 'deposit' veya 'withdrawal'
              source_type: 'manual',
              description: manualDesc
          }]);

          if (error) throw error;

          toast.success('İşlem başarıyla kaydedildi.');
          setIsModalOpen(false);
          setManualAmount('');
          setManualDesc('');
          fetchFinanceData();

      } catch (error: any) {
          toast.error(error.message);
      } finally {
          setProcessing(false);
      }
  };

  const openModal = (type: 'deposit' | 'withdrawal') => {
      setModalType(type);
      setManualAmount('');
      setManualDesc('');
      setIsModalOpen(true);
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={40} /></div>;

  return (
    <div className="p-6 bg-[#F8FAFC] min-h-screen space-y-6 font-sans">
      
      {/* BAŞLIK & ANA KASA */}
      <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">FİNANS YÖNETİMİ</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
            Kasa, Z Raporu ve Nakit Akışı
          </p>
        </div>

        {/* ANA KASA KARTI VE BUTONLAR */}
        <div className="flex flex-col md:flex-row gap-4">
             {/* KASA KARTI */}
            <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-4 min-w-[280px]">
                <div className="p-3 bg-slate-800 rounded-xl">
                    <Lock size={24} className="text-emerald-400"/>
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ANA KASA BAKİYESİ</p>
                    <p className="text-2xl font-black tracking-tight">₺{mainSafeBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
                </div>
            </div>

            {/* BUTONLAR */}
            <div className="flex gap-2">
                <button 
                    onClick={() => openModal('deposit')}
                    className="flex flex-col items-center justify-center px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl transition-all active:scale-95 shadow-lg shadow-emerald-200"
                >
                    <PlusCircle size={20} className="mb-1"/>
                    <span className="text-[9px] font-black uppercase">PARA GİRİŞİ</span>
                </button>
                <button 
                    onClick={() => openModal('withdrawal')}
                    className="flex flex-col items-center justify-center px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-2xl transition-all active:scale-95 shadow-lg shadow-red-200"
                >
                    <MinusCircle size={20} className="mb-1"/>
                    <span className="text-[9px] font-black uppercase">PARA ÇIKIŞI</span>
                </button>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SOL: GÜNCEL KASA (ÇEKMECE) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 p-6 opacity-5">
                <Wallet size={120} />
             </div>
             
             <div className="flex justify-between items-start mb-8">
                <div>
                   <h2 className="text-lg font-black text-slate-800 uppercase flex items-center gap-2">
                     <History className="text-blue-600"/> GÜNCEL VARDIYA (ÇEKMECE)
                   </h2>
                   <p className="text-xs font-bold text-slate-400 mt-1">
                     Son Z Raporundan ({currentShift.startTime ? new Date(currentShift.startTime).toLocaleString('tr-TR') : 'Başlangıç'}) bu yana.
                   </p>
                </div>
                {currentShift.transactionCount > 0 ? (
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase animate-pulse">
                        Aktif
                    </span>
                ) : (
                    <span className="bg-slate-100 text-slate-400 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                        Beklemede
                    </span>
                )}
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                   <div className="flex items-center gap-2 mb-2 text-emerald-600">
                      <Banknote size={18}/>
                      <span className="text-[10px] font-black uppercase">NAKİT</span>
                   </div>
                   <span className="text-xl font-black text-slate-800">₺{currentShift.cashTotal.toFixed(2)}</span>
                </div>
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                   <div className="flex items-center gap-2 mb-2 text-blue-600">
                      <CreditCard size={18}/>
                      <span className="text-[10px] font-black uppercase">KREDİ KARTI</span>
                   </div>
                   <span className="text-xl font-black text-slate-800">₺{currentShift.cardTotal.toFixed(2)}</span>
                </div>
                <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                   <div className="flex items-center gap-2 mb-2 text-orange-600">
                      <AlertCircle size={18}/>
                      <span className="text-[10px] font-black uppercase">VERESİYE</span>
                   </div>
                   <span className="text-xl font-black text-slate-800">₺{currentShift.creditTotal.toFixed(2)}</span>
                </div>
             </div>

             <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center mb-8">
                <span className="text-xs font-bold text-slate-500 uppercase">Toplam Ciro</span>
                <span className="text-2xl font-black text-slate-800">₺{currentShift.totalSales.toFixed(2)}</span>
             </div>

             <button 
               onClick={handleCreateZReport}
               disabled={processing || currentShift.transactionCount === 0}
               className="w-full py-5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-3"
             >
               {processing ? <Loader2 className="animate-spin"/> : <Lock size={20} />}
               GÜNÜ KAPAT VE Z RAPORU AL
             </button>
             <p className="text-[10px] text-center text-slate-400 font-bold mt-3">
               * Çekmecedeki nakit 'Ana Kasa'ya devredilir, sayaçlar sıfırlanır.
             </p>
          </div>
        </div>

        {/* SAĞ: GEÇMİŞ RAPORLAR */}
        <div className="bg-white rounded-[2.5rem] p-6 border border-slate-200 shadow-sm flex flex-col h-full">
           <h3 className="text-sm font-black text-slate-800 uppercase mb-6 flex items-center gap-2">
             <History size={18} className="text-slate-400"/> RAPOR GEÇMİŞİ
           </h3>
           <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
             {history.length === 0 ? (
                <div className="text-center py-10 opacity-40">
                   <History size={48} className="mx-auto mb-2 text-slate-300"/>
                   <p className="text-xs font-bold text-slate-400">Henüz Z raporu yok.</p>
                </div>
             ) : (
                history.map((z) => (
                   <div key={z.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors group">
                      <div className="flex justify-between items-start mb-2">
                         <div className="flex items-center gap-2">
                            <div className="bg-white p-2 rounded-lg border border-slate-200 text-slate-400 group-hover:text-blue-500 group-hover:border-blue-200 transition-colors">
                               <Calendar size={14}/>
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-slate-800 uppercase">
                                 {new Date(z.created_at).toLocaleDateString('tr-TR')}
                               </p>
                               <p className="text-[9px] font-mono text-slate-400">
                                 {new Date(z.created_at).toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'})}
                               </p>
                            </div>
                         </div>
                         <span className="text-sm font-black text-slate-800">₺{z.total_sales.toFixed(2)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200/60">
                         <div className="text-[9px] font-bold text-slate-500">
                            Nakit Devir: <span className="text-slate-800">₺{z.total_cash}</span>
                         </div>
                         <div className="text-[9px] font-bold text-slate-500 text-right">
                            Kâr: <span className="text-emerald-600">₺{z.total_profit}</span>
                         </div>
                      </div>
                   </div>
                ))
             )}
           </div>
        </div>
      </div>

      {/* MANUEL İŞLEM MODALI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className={`text-lg font-black uppercase ${modalType === 'deposit' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {modalType === 'deposit' ? 'PARA GİRİŞİ' : 'PARA ÇIKIŞI'}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={20}/></button>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 mb-1 block">Tutar</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₺</span>
                            <input 
                                autoFocus
                                type="number" 
                                value={manualAmount}
                                onChange={e => setManualAmount(e.target.value)}
                                className="w-full p-4 pl-10 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-lg text-slate-800 outline-none focus:border-blue-500"
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 mb-1 block">Açıklama</label>
                        <input 
                            type="text" 
                            value={manualDesc}
                            onChange={e => setManualDesc(e.target.value)}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm text-slate-800 outline-none focus:border-blue-500"
                            placeholder="Örn: Kira Ödemesi, Elden Tahsilat..."
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-8">
                    <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold uppercase hover:bg-slate-200">İptal</button>
                    <button 
                        onClick={handleManualTransaction}
                        disabled={processing}
                        className={`flex-[2] py-4 text-white rounded-2xl font-bold uppercase shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${
                            modalType === 'deposit' 
                            ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200' 
                            : 'bg-red-500 hover:bg-red-600 shadow-red-200'
                        }`}
                    >
                        {processing ? <Loader2 className="animate-spin"/> : <Save size={18}/>}
                        KAYDET
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}