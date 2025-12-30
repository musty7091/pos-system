'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Plus, Loader2, Eye, Banknote, CreditCard, Wallet, X, ShoppingBag, 
  TrendingUp, HandCoins, ArrowDownRight, Activity // <-- Activity buraya eklendi
} from 'lucide-react';

export default function FinancePage() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState({ 
    totalIncome: 0, totalExpense: 0, netBalance: 0, 
    cashIncome: 0, cardIncome: 0, onAccountIncome: 0 
  });
  const [selectedSale, setSelectedSale] = useState<any>(null);

  useEffect(() => { fetchFinanceData(); }, []);

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      // 1. Verileri Çekelim (Satışlar, Giderler ve Cari Hareketler)
      const { data: sales } = await supabase.from('sales').select('*, contacts(name)').order('created_at', { ascending: false });
      const { data: expenses } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
      const { data: contactPayments } = await supabase.from('contact_payments').select('*, contacts(name, type)').order('created_at', { ascending: false });

      // 2. Satışları (Gelir) Haritalayalım
      const incomes = (sales || []).map(s => ({ 
        id: s.id, type: 'income', title: 'Satış İşlemi', 
        customer: s.contacts?.name || 'Peşin Satış',
        amount: s.total_amount, method: s.payment_method, date: s.created_at 
      }));
      
      // 3. Genel Giderleri Haritalayalım
      const exps = (expenses || []).map(e => ({ 
        id: e.id, type: 'expense', title: e.title, amount: e.amount, method: e.payment_method, date: e.created_at 
      }));

      // 4. Cari Tahsilat ve Ödemeleri Haritalayalım
      const cPayments = (contactPayments || []).map(p => ({
        id: p.id,
        // Müşteriden alıyorsak GELİR (Tahsilat), Tedarikçiye veriyorsak GİDER (Ödeme)
        type: p.contacts?.type === 'customer' ? 'income' : 'expense',
        title: p.contacts?.type === 'customer' ? 'Cari Tahsilat' : 'Cari Ödeme',
        customer: p.contacts?.name || 'Bilinmeyen Cari',
        amount: p.amount,
        method: p.payment_method,
        date: p.created_at,
        isCari: true // Listede ikon ayrımı için
      }));

      // 5. Hepsini birleştir ve sırala
      const all = [...incomes, ...exps, ...cPayments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(all);

      // 6. Dashboard Özet Rakamlarını Hesaplayalım
      let inc = 0, exp = 0, cash = 0, card = 0, account = 0;

      all.forEach(t => { 
        if(t.type === 'income') {
          inc += t.amount;
          if(t.method === 'cash') cash += t.amount;
          if(t.method === 'card') card += t.amount;
          if(t.method === 'on_account') account += t.amount;
        } else { 
          exp += t.amount;
          // Nakit veya Kart ile dükkandan para çıkıyorsa (Gider veya Cari Ödeme) kasadan düşelim
          if(t.method === 'cash') cash -= t.amount;
          if(t.method === 'card') card -= t.amount;
        }
      });

      setSummary({ 
        totalIncome: inc, totalExpense: exp, netBalance: inc - exp, 
        cashIncome: cash, cardIncome: card, onAccountIncome: account 
      });
    } finally { setLoading(false); }
  };

  const showSaleDetails = async (saleId: string) => {
    try {
      const { data, error } = await supabase
        .from('sale_items')
        .select(`quantity, total_price, products ( name )`)
        .eq('sale_id', saleId);
      if (error) throw error;
      setSelectedSale(data || []);
    } catch (err) {
      alert("Detaylar yüklenemedi.");
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-blue-500" size={40} /></div>;

  return (
    <div className="page-container flex flex-col h-screen overflow-hidden p-6 bg-slate-50">
      
      {/* DETAY MODALI */}
      {selectedSale && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in">
            <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
              <div className="flex items-center gap-3">
                <ShoppingBag size={20} className="text-blue-400"/>
                <span className="font-bold uppercase tracking-widest text-[10px]">Satış İçeriği Detayı</span>
              </div>
              <button onClick={() => setSelectedSale(null)}><X size={24}/></button>
            </div>
            <div className="p-8 max-h-[60vh] overflow-y-auto">
              {selectedSale.length > 0 ? (
                <table className="w-full text-left border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="pb-2">Ürün</th>
                      <th className="pb-2 text-center">Miktar</th>
                      <th className="pb-2 text-right">Tutar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSale.map((item: any, idx: number) => (
                      <tr key={idx} className="bg-slate-50/50">
                        <td className="p-3 rounded-l-xl text-[11px] font-bold text-slate-700 uppercase">{item.products?.name}</td>
                        <td className="p-3 text-[11px] font-bold text-slate-500 text-center">{item.quantity} Adet</td>
                        <td className="p-3 rounded-r-xl text-xs font-black text-slate-900 text-right">₺{item.total_price.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-center py-10 text-xs font-bold text-slate-400 uppercase tracking-widest">İçerik Bulunamadı.</p>
              )}
            </div>
            <div className="p-6 bg-slate-50 flex justify-end">
               <button onClick={() => setSelectedSale(null)} className="px-10 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">ANLADIM</button>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD KARTLARI */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-6 rounded-[2rem] border-l-4 border-emerald-500 shadow-sm">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><TrendingUp size={10}/> TOPLAM GELİR</span>
          <h2 className="text-2xl font-black text-emerald-600 mt-1">₺{summary.totalIncome.toFixed(2)}</h2>
        </div>
        <div className="bg-slate-900 p-6 rounded-[2rem] border-l-4 border-blue-500 shadow-xl text-white">
          <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1"><Wallet size={10}/> KASA NAKİT</span>
          <h2 className="text-2xl font-black mt-1 text-white">₺{summary.cashIncome.toFixed(2)}</h2>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border-l-4 border-purple-500 shadow-sm">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><CreditCard size={10}/> KREDİ KARTI</span>
          <h2 className="text-2xl font-black text-slate-800 mt-1">₺{summary.cardIncome.toFixed(2)}</h2>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border-l-4 border-orange-500 shadow-sm">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">AÇIK HESAP (VER.)</span>
          <h2 className="text-2xl font-black text-slate-800 mt-1">₺{summary.onAccountIncome.toFixed(2)}</h2>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border-l-4 border-red-500 shadow-sm">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">TOPLAM GİDER</span>
          <h2 className="text-2xl font-black text-red-600 mt-1">₺{summary.totalExpense.toFixed(2)}</h2>
        </div>
      </div>

      {/* İŞLEM LİSTESİ */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center">
           <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
             <Activity className="text-blue-500" size={18}/> Finansal Hareketler
           </h3>
           <button onClick={fetchFinanceData} className="p-2 hover:bg-slate-50 rounded-full transition-all text-slate-400"><Loader2 size={18}/></button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="bg-slate-50/50">
                <th className="p-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">İşlem Türü</th>
                <th className="p-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Açıklama / Kaynak</th>
                <th className="p-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Ödeme Yöntemi</th>
                <th className="p-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Tutar</th>
                <th className="p-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {transactions.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-all">
                  <td className="p-5">
                    <div className="flex items-center gap-2">
                      {t.isCari ? <HandCoins size={14} className={t.type === 'income' ? 'text-blue-500' : 'text-orange-500'}/> : <TrendingUp size={14} className={t.type === 'income' ? 'text-green-500' : 'text-red-500'}/>}
                      <span className={`text-[9px] font-bold px-3 py-1 rounded-full ${t.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        {t.type === 'income' ? 'GELİR' : 'GİDER'}
                      </span>
                    </div>
                  </td>
                  <td className="p-5">
                    <div className="font-bold text-slate-700 text-xs uppercase">{t.title}</div>
                    <div className="text-[9px] text-slate-400 uppercase mt-0.5 font-bold">{t.customer} <span className="mx-1 opacity-30">•</span> {new Date(t.date).toLocaleString('tr-TR')}</div>
                  </td>
                  <td className="p-5 text-center">
                    <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-xl border ${
                      t.method === 'cash' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      t.method === 'card' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                      'bg-orange-50 text-orange-700 border-orange-100'
                    }`}>
                      {t.method === 'cash' ? 'Nakit' : t.method === 'card' ? 'Kredi Kartı' : 'Veresiye / Açık Hesap'}
                    </span>
                  </td>
                  <td className={`p-5 text-right font-black text-sm ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === 'income' ? '+' : '-'} ₺{t.amount.toFixed(2)}
                  </td>
                  <td className="p-5 text-right">
                    {t.title === 'Satış İşlemi' ? (
                      <button onClick={() => showSaleDetails(t.id)} className="p-2.5 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all">
                        <Eye size={18}/>
                      </button>
                    ) : (
                      <div className="p-2.5 text-slate-200"><ArrowDownRight size={18}/></div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 && (
            <div className="py-20 text-center text-slate-400 font-bold uppercase text-xs tracking-[0.2em]">Henüz finansal hareket bulunmuyor.</div>
          )}
        </div>
      </div>
    </div>
  );
}