'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Search, 
  Calendar, 
  CreditCard, 
  Banknote, 
  User, 
  ChevronDown, 
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Package,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';

// Tipler
type SaleItem = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product: {
    name: string;
    barcode: string;
  };
};

type Transaction = {
  id: string;
  created_at: string;
  total_amount: number;
  payment_method: 'cash' | 'card' | 'on_account';
  customer?: {
    name: string;
  } | null;
  sale_items?: SaleItem[];
};

export default function SalesPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sayfalama Durumları
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  const fetchSales = async () => {
    setLoading(true);
    try {
      /**
       * ÖNEMLİ: POS ekranındaki RPC fonksiyonu 'sale_transactions' tablosunu kullanıyor olabilir.
       * Eğer 'sales' tablosu boş geliyorsa, bu değişkeni 'sale_transactions' olarak değiştirin.
       */
      const ACTIVE_TABLE = 'sale_transactions'; 

      // 1. Toplam Sayıyı Al
      const { count, error: countError } = await supabase
        .from(ACTIVE_TABLE)
        .select('*', { count: 'exact', head: true });
      
      // Eğer tablo bulunamadı hatası alırsak diğer tabloyu deneyelim (Otomatik Kurtarma)
      if (countError) {
        console.warn(`${ACTIVE_TABLE} bulunamadı, 'sales' tablosu deneniyor...`);
        const { count: countAlt, data: dataAlt, error: errorAlt } = await supabase
          .from('sales')
          .select(`*, customer:customers(name), sale_items:sale_items(*, product:products(name, barcode))`)
          .order('created_at', { ascending: false })
          .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);
        
        if (!errorAlt) {
          setTotalCount(countAlt || 0);
          setTransactions(dataAlt || []);
          setLoading(false);
          return;
        }
        throw countError;
      }
      
      const currentCount = count || 0;
      setTotalCount(currentCount);

      if (currentCount === 0) {
        setTransactions([]);
        setLoading(false);
        return;
      }

      // 2. Sayfaya Göre Aralığı Hesapla
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      // 3. Veriyi Çek
      const { data, error } = await supabase
        .from(ACTIVE_TABLE)
        .select(`
          *,
          customer:customers(name),
          sale_items:sale_items(
            *,
            product:products(name, barcode)
          )
        `)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      console.error('Veri Çekme Hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [currentPage]);

  const toggleRow = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const getPaymentIcon = (method: string) => {
    if (method === 'cash' || method === 'Nakit') return <Banknote className="text-green-600" size={18} />;
    if (method === 'card' || method === 'Kredi Kartı') return <CreditCard className="text-blue-600" size={18} />;
    return <User className="text-orange-500" size={18} />;
  };

  const getPaymentLabel = (method: string) => {
    if (method === 'cash') return 'Nakit';
    if (method === 'card') return 'Kredi Kartı';
    if (method === 'on_account' || method === 'open_account') return 'Veresiye';
    return method;
  };

  const filteredTransactions = transactions.filter(t => 
    (t.customer?.name || 'Misafir').toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.id.includes(searchTerm)
  );

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="p-6 bg-[#F8FAFC] min-h-screen font-sans space-y-6">
      
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Satış Geçmişi</h1>
        <p className="text-slate-500 text-sm font-medium mt-1 uppercase tracking-widest text-[10px]">Yapılan tüm işlemler ve detayları</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bugünkü Ciro</span>
          <div className="text-2xl font-black text-slate-800 mt-1">
            ₺{transactions
                .filter(t => new Date(t.created_at).toDateString() === new Date().toDateString())
                .reduce((sum, t) => sum + Number(t.total_amount), 0)
                .toFixed(2)}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Toplam İşlem</span>
          <div className="text-2xl font-black text-blue-600 mt-1">{totalCount}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ortalama Sepet</span>
          <div className="text-2xl font-black text-green-600 mt-1">
            ₺{(totalCount > 0 && transactions.length > 0
                ? transactions.reduce((sum, t) => sum + Number(t.total_amount), 0) / transactions.length 
                : 0).toFixed(2)}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex gap-2">
          <div className="relative flex-1">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             <input 
               type="text" 
               placeholder="Müşteri adı veya işlem no ara..." 
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-xl font-bold text-sm text-slate-700 outline-none focus:ring-2 ring-blue-100 transition-all"
             />
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar h-[calc(100vh-450px)] min-h-[400px]">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest shadow-sm">
              <tr>
                <th className="p-4">Tarih</th>
                <th className="p-4">Müşteri</th>
                <th className="p-4">Ödeme</th>
                <th className="p-4 text-right">Tutar</th>
                <th className="p-4 text-center">Detay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                 <tr><td colSpan={5} className="p-20 text-center text-slate-400 font-bold"><Loader2 className="animate-spin inline mr-2" size={32}/> Yükleniyor...</td></tr>
              ) : filteredTransactions.length === 0 ? (
                 <tr><td colSpan={5} className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest opacity-50">Henüz kayıtlı bir satış bulunmuyor.</td></tr>
              ) : (
                filteredTransactions.map((sale) => (
                  <React.Fragment key={sale.id}>
                    <tr 
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${expandedRow === sale.id ? 'bg-slate-50' : ''}`}
                      onClick={() => toggleRow(sale.id)}
                    >
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700">
                            {format(new Date(sale.created_at), 'd MMMM yyyy', { locale: tr })}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            {format(new Date(sale.created_at), 'HH:mm')}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${sale.customer ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                             <User size={14} />
                          </div>
                          <span className="text-sm font-bold text-slate-700">
                            {sale.customer ? sale.customer.name : 'Misafir Müşteri'}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white w-fit">
                          {getPaymentIcon(sale.payment_method)}
                          <span className="text-[10px] font-black text-slate-600 uppercase">
                            {getPaymentLabel(sale.payment_method)}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-lg font-black text-slate-800">
                          ₺{Number(sale.total_amount).toFixed(2)}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button className="text-slate-400 hover:text-blue-600 transition-colors">
                          {expandedRow === sale.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>
                      </td>
                    </tr>

                    {expandedRow === sale.id && (
                      <tr className="bg-slate-50/50 animate-in fade-in slide-in-from-top-2 duration-200">
                        <td colSpan={5} className="p-4 pt-0 border-b border-slate-100">
                          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <div className="px-4 py-2 bg-slate-100 text-[10px] font-black text-slate-500 uppercase flex justify-between tracking-widest">
                              <span>Ürün Adı</span>
                              <span>Adet x Fiyat = Tutar</span>
                            </div>
                            <div className="divide-y divide-slate-50">
                              {sale.sale_items?.map((item) => (
                                <div key={item.id} className="px-4 py-3 flex justify-between items-center hover:bg-slate-50">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center border border-blue-100">
                                      <Package size={14}/>
                                    </div>
                                    <div>
                                      <div className="text-sm font-bold text-slate-700 uppercase">{item.product?.name || 'Silinmiş Ürün'}</div>
                                      <div className="text-[10px] font-mono text-slate-400">{item.product?.barcode}</div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs font-bold text-slate-600">{item.quantity} x ₺{Number(item.unit_price).toFixed(2)}</div>
                                    <div className="text-sm font-black text-slate-800">= ₺{Number(item.total_price).toFixed(2)}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
             Toplam <span className="text-slate-800">{totalCount}</span> işlem • Sayfa {currentPage} / {totalPages || 1}
           </p>

           <div className="flex gap-2">
              <button 
                disabled={currentPage === 1 || loading}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
              >
                <ChevronLeft size={20}/>
              </button>
              
              <div className="flex gap-1">
                 {[...Array(totalPages)].map((_, i) => (
                   <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-10 h-10 rounded-xl text-xs font-black transition-all active:scale-95 ${
                      currentPage === i + 1 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                      : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                   >
                     {i + 1}
                   </button>
                 )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}
              </div>

              <button 
                disabled={currentPage === totalPages || loading || totalCount === 0}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
              >
                <ChevronRight size={20}/>
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}