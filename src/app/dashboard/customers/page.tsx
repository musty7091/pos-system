'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Search, Plus, Edit, Trash2, User, Truck, Phone, Mail, MapPin, 
  Building2, Save, X, Loader2, Wallet, ScrollText, Printer
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

// --- TİPLER ---
type Transaction = {
  id: string;
  date: string;
  type: 'invoice' | 'return' | 'payment';
  description: string;
  amount_in: number;  // Borç (Alış)
  amount_out: number; // Alacak (Ödeme/İade)
  balance: number;    // Kümülatif Bakiye
  method?: string;
};

export default function ContactsPage() {
  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>('customers');
  
  // Veri State'leri
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. MODAL: EKLE / DÜZENLE FORM
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '', contact_name: '', phone: '', email: '', 
    tax_no: '', tax_office: '', address: '', city: '', district: '', 
    type: 'retail', credit_limit: 0
  });

  // 2. MODAL: DETAY & EKSTRE
  const [selectedPerson, setSelectedPerson] = useState<any | null>(null);
  const [statement, setStatement] = useState<Transaction[]>([]);

  // 3. MODAL: ÖDEME YAP
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [payDesc, setPayDesc] = useState('');
  
  // Çek detayları
  const [checkNo, setCheckNo] = useState('');
  const [checkDate, setCheckDate] = useState('');
  const [bankName, setBankName] = useState('');

  // --- ESC TUŞU İLE KAPATMA ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isPaymentModalOpen) setIsPaymentModalOpen(false);
        else if (isFormModalOpen) setIsFormModalOpen(false);
        else if (selectedPerson) setSelectedPerson(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPaymentModalOpen, isFormModalOpen, selectedPerson]);

  // --- VERİ ÇEKME ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const [custRes, supRes] = await Promise.all([
        supabase.from('customers').select('*').order('name'),
        supabase.from('suppliers').select('*').order('name')
      ]);

      if (custRes.error) throw custRes.error;
      if (supRes.error) throw supRes.error;

      setCustomers(custRes.data || []);
      setSuppliers(supRes.data || []);
    } catch (error: any) {
      console.error(error);
      toast.error('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- EKSTRE ÇEKME VE KÜMÜLATİF HESAPLAMA ---
  const fetchStatement = async (supplierId: string) => {
    // Alışlar, İadeler ve Ödemeleri çek
    const { data: invoices } = await supabase.from('purchase_invoices').select('*').eq('supplier_id', supplierId);
    const { data: returns } = await supabase.from('purchase_returns').select('*').eq('supplier_id', supplierId);
    const { data: payments } = await supabase.from('supplier_payments').select('*').eq('supplier_id', supplierId);

    let rawTransactions: any[] = [];

    // 1. Faturaları Ekle (Borç Artırır)
    invoices?.forEach((inv: any) => rawTransactions.push({
      id: inv.id, date: inv.issue_date, type: 'invoice', 
      description: `Alış Faturası (${inv.invoice_no})`, amount_in: inv.total_amount, amount_out: 0
    }));

    // 2. İadeleri Ekle (Borç Azaltır -> Alacak)
    returns?.forEach((ret: any) => rawTransactions.push({
      id: ret.id, date: ret.created_at, type: 'return', 
      description: `İade Faturası (${ret.invoice_no || '-'})`, amount_in: 0, amount_out: ret.total_amount
    }));

    // 3. Ödemeleri Ekle (Borç Azaltır -> Alacak)
    payments?.forEach((pay: any) => {
      let desc = 'Ödeme';
      if(pay.payment_method === 'check') desc = `Çek (${pay.check_no})`;
      if(pay.payment_method === 'cash') desc = 'Nakit Ödeme';
      if(pay.payment_method === 'card') desc = 'Kredi Kartı';
      rawTransactions.push({
        id: pay.id, date: pay.payment_date, type: 'payment', 
        description: desc + (pay.description ? ` - ${pay.description}` : ''), 
        amount_in: 0, amount_out: pay.amount, method: pay.payment_method
      });
    });

    // Tarihe göre sırala (Eskiden yeniye)
    rawTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Kümülatif Bakiye Hesapla
    let runningBalance = 0;
    const finalTransactions: Transaction[] = rawTransactions.map(t => {
      // Tedarikçi mantığı: Fatura (Alış) borcu artırır (+), Ödeme/İade borcu azaltır (-)
      runningBalance = runningBalance + t.amount_in - t.amount_out;
      return { ...t, balance: runningBalance };
    });

    setStatement(finalTransactions);
  };

  const openDetailModal = (person: any) => {
    setSelectedPerson(person);
    if (activeTab === 'suppliers') {
      fetchStatement(person.id);
    }
  };

  // --- YAZDIRMA FONKSİYONU ---
  const handlePrint = () => {
    window.print();
  };

  // --- CRUD İŞLEMLERİ ---
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading('Kaydediliyor...');
    try {
      if (!formData.name) throw new Error('İsim zorunludur');
      
      const table = activeTab === 'customers' ? 'customers' : 'suppliers';
      const payload: any = { ...formData };
      
      if (activeTab === 'suppliers') {
        delete payload.type;
        delete payload.credit_limit;
      } else {
        delete payload.contact_name;
      }

      if (editingId) {
        const { error } = await supabase.from(table).update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Güncellendi', { id: toastId });
      } else {
        const { error } = await supabase.from(table).insert([payload]);
        if (error) throw error;
        toast.success('Eklendi', { id: toastId });
      }

      setIsFormModalOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Silmek istediğine emin misin?')) return;
    const table = activeTab === 'customers' ? 'customers' : 'suppliers';
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (!error) {
       toast.success('Silindi');
       fetchData();
    } else {
       toast.error('Silinemedi (İşlem geçmişi olabilir)');
    }
  };

  // --- ÖDEME SİLME FONKSİYONU (YENİ EKLEME) ---
  const handleDeletePayment = async (trans: Transaction) => {
    if (!confirm('Bu ödeme kaydını silmek istediğinize emin misiniz? Cari bakiye otomatik olarak borç tarafına geri eklenecektir.')) return;
    
    const toastId = toast.loading('Ödeme siliniyor...');
    try {
      const { error } = await supabase.from('supplier_payments').delete().eq('id', trans.id);
      
      if (error) throw error;

      toast.success('Ödeme başarıyla silindi', { id: toastId });
      
      // ANLIK BAKİYE GÜNCELLEME: Ödeme silindiği için tedarikçiye olan borç geri artar
      setSelectedPerson((prev: any) => ({
        ...prev,
        balance: (prev.balance || 0) + trans.amount_out 
      }));

      // Listeyi ve ekstre verilerini tazele
      fetchStatement(selectedPerson.id);
      fetchData();

    } catch (err: any) {
      toast.error('Silme hatası: ' + err.message, { id: toastId });
    }
  };

  const openEditModal = (item: any) => {
    setEditingId(item.id);
    setFormData({
      name: item.name || '', contact_name: item.contact_name || '', phone: item.phone || '', 
      email: item.email || '', tax_no: item.tax_no || '', tax_office: item.tax_office || '', 
      address: item.address || '', city: item.city || '', district: item.district || '', 
      type: item.type || 'retail', credit_limit: item.credit_limit || 0
    });
    setIsFormModalOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: '', contact_name: '', phone: '', email: '', tax_no: '', tax_office: '', 
      address: '', city: '', district: '', type: 'retail', credit_limit: 0
    });
  };

  // --- ÖDEME KAYDETME ---
  const handleSavePayment = async () => {
    if (!payAmount || parseFloat(payAmount) <= 0) return toast.error('Tutar giriniz');
    const toastId = toast.loading('Ödeme işleniyor...');
    
    try {
      const amountVal = parseFloat(payAmount);
      const payload: any = {
        supplier_id: selectedPerson.id,
        amount: amountVal,
        payment_method: payMethod,
        description: payDesc,
        payment_date: new Date().toISOString()
      };

      if (payMethod === 'check') {
        payload.check_no = checkNo;
        payload.check_date = checkDate;
        payload.bank_name = bankName;
      }

      const { error } = await supabase.from('supplier_payments').insert([payload]);
      if (error) throw error;

      toast.success('Ödeme kaydedildi', { id: toastId });
      setIsPaymentModalOpen(false);
      
      // ANLIK BAKİYE GÜNCELLEME (Sayfa yenilemeden)
      setSelectedPerson((prev: any) => ({
        ...prev,
        balance: (prev.balance || 0) - amountVal // Ödeme yapınca borç düşer
      }));

      // Güncel verileri çek (Arka planda)
      fetchStatement(selectedPerson.id);
      fetchData(); 

      // Temizle
      setPayAmount(''); setPayDesc(''); setCheckNo(''); setBankName('');
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    }
  };

  // FİLTRELEME
  const list = activeTab === 'customers' ? customers : suppliers;
  const filteredData = list.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-6 space-y-6 bg-[#F8FAFC] min-h-screen">
      
      {/* YAZDIRMA STİLİ (A4 UYUMLU) */}
      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body * { visibility: hidden; }
          
          #printable-modal, #printable-modal * { 
            visibility: visible; 
            color: black !important; /* Tasarruf modu için siyah yazı */
          }

          #printable-modal { 
            position: fixed; 
            left: 0; 
            top: 0; 
            width: 100% !important; 
            max-width: none !important;
            height: auto !important; 
            background: white; 
            padding: 0; 
            margin: 0; 
            z-index: 9999;
            box-shadow: none !important;
            border-radius: 0 !important;
            overflow: visible !important;
          }
          
          /* Kaydırma alanlarını aç */
          .overflow-y-auto { 
            overflow: visible !important; 
            height: auto !important; 
            max-height: none !important; 
          }

          /* Yazdırırken gizlenecekler */
          .no-print { display: none !important; }
          
          /* Tabloyu güzelleştir */
          table { width: 100% !important; border-collapse: collapse; }
          th, td { border: 1px solid #ddd !important; padding: 8px !important; text-align: left; }
          thead { background-color: #f0f0f0 !important; -webkit-print-color-adjust: exact; }
        }
      `}</style>

      {/* BAŞLIK VE TABLAR */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
           <h1 className="text-2xl font-black text-slate-800 tracking-tight">Cari Yönetimi</h1>
           <p className="text-slate-500 text-sm font-medium mt-1">Müşteri ve Tedarikçi hesapları</p>
        </div>
        <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-sm flex">
           <button onClick={() => setActiveTab('customers')} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'customers' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
             <User size={18} /> MÜŞTERİLER
           </button>
           <button onClick={() => setActiveTab('suppliers')} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'suppliers' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
             <Truck size={18} /> TEDARİKÇİLER
           </button>
        </div>
      </div>

      {/* ARAMA VE YENİ EKLE */}
      <div className="flex gap-3">
         <div className="bg-white flex-1 p-2 rounded-2xl border border-slate-200 shadow-sm relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="İsim, telefon veya vergi no ara..." className="w-full h-full pl-10 pr-4 py-2 bg-transparent outline-none text-sm font-bold text-slate-700"/>
         </div>
         <button onClick={() => { resetForm(); setIsFormModalOpen(true); }} className={`px-6 py-3 rounded-2xl font-bold text-sm text-white flex items-center gap-2 shadow-lg transition-all active:scale-95 ${activeTab === 'customers' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}>
            <Plus size={18} /> YENİ EKLE
         </button>
      </div>

      {/* LİSTE */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
         {loading ? <div className="col-span-3 flex justify-center p-10"><Loader2 className="animate-spin text-slate-400"/></div> : filteredData.length === 0 ? <div className="col-span-3 text-center p-10 text-slate-400 font-bold opacity-50">Kayıt bulunamadı.</div> : (
           filteredData.map((item: any) => (
             <div key={item.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-20 h-20 rounded-bl-[4rem] -mr-4 -mt-4 opacity-10 ${activeTab === 'customers' ? 'bg-blue-600' : 'bg-green-600'}`}></div>
                
                <div className="flex justify-between items-start mb-4 relative z-10">
                   <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${activeTab === 'customers' ? 'bg-blue-600 shadow-blue-200' : 'bg-green-600 shadow-green-200'}`}>
                         {activeTab === 'customers' ? <User size={20}/> : <Truck size={20}/>}
                      </div>
                      <div>
                         <h3 className="font-black text-slate-800 text-sm line-clamp-1">{item.name}</h3>
                         {activeTab === 'suppliers' && item.contact_name && <span className="text-[10px] font-bold text-slate-400 block">{item.contact_name}</span>}
                      </div>
                   </div>
                   <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditModal(item)} className="p-2 hover:bg-slate-100 rounded-lg text-blue-600"><Edit size={16}/></button>
                      <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-slate-100 rounded-lg text-red-600"><Trash2 size={16}/></button>
                   </div>
                </div>

                <div className="space-y-2 relative z-10">
                   {item.phone && <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><Phone size={14} className="text-slate-300"/> {item.phone}</div>}
                   {(item.city || item.district) && <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><MapPin size={14} className="text-slate-300"/> {item.city} / {item.district}</div>}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                   <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Bakiye</span>
                      <span className={`text-lg font-black ${item.balance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        ₺{Math.abs(item.balance || 0).toFixed(2)}
                      </span>
                   </div>
                   <button onClick={() => openDetailModal(item)} className="p-2 bg-slate-50 rounded-xl text-slate-500 hover:bg-slate-800 hover:text-white transition-colors flex items-center gap-2 font-bold text-[10px] px-3">
                      <ScrollText size={16}/> {activeTab === 'suppliers' ? 'EKSTRE' : 'DETAY'}
                   </button>
                </div>
             </div>
           ))
         )}
      </div>

      {/* 1. MODAL: EKLE / DÜZENLE FORM */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
           <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                 <h2 className="text-xl font-black text-slate-800">{editingId ? 'Düzenle' : 'Yeni Ekle'}</h2>
                 <button onClick={() => setIsFormModalOpen(false)} className="p-2 bg-slate-100 rounded-full hover:bg-red-500 hover:text-white transition-all"><X size={20}/></button>
              </div>
              <form onSubmit={handleSaveContact} className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-2">
                       <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">İsim / Unvan *</label>
                       <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"/>
                    </div>
                    {activeTab === 'suppliers' && (
                      <div className="col-span-2">
                         <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Yetkili Kişi</label>
                         <input value={formData.contact_name} onChange={e => setFormData({...formData, contact_name: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"/>
                      </div>
                    )}
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Telefon</label><input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"/></div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">E-Posta</label><input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"/></div>
                 </div>
                 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                    <div className="flex items-center gap-2 text-slate-400"><Building2 size={16}/><span className="text-xs font-black uppercase tracking-widest">Resmi Bilgiler</span></div>
                    <div className="grid grid-cols-2 gap-4">
                       <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Vergi No</label><input value={formData.tax_no} onChange={e => setFormData({...formData, tax_no: e.target.value})} className="w-full p-2 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none"/></div>
                       <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Vergi Dairesi</label><input value={formData.tax_office} onChange={e => setFormData({...formData, tax_office: e.target.value})} className="w-full p-2 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none"/></div>
                       <div className="col-span-2"><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Adres</label><textarea rows={2} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full p-2 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none"/></div>
                       <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">İl</label><input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full p-2 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none"/></div>
                       <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">İlçe</label><input value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})} className="w-full p-2 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none"/></div>
                    </div>
                 </div>
                 <button type="submit" className={`w-full py-4 rounded-xl font-bold text-white uppercase shadow-lg transition-all active:scale-95 ${activeTab === 'customers' ? 'bg-blue-600' : 'bg-green-600'}`}>KAYDET</button>
              </form>
           </div>
        </div>
      )}

      {/* 2. MODAL: DETAY & EKSTRE (YAZDIRILABİLİR ALAN) */}
      {selectedPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
           <div id="printable-modal" className="bg-white w-full max-w-5xl h-[85vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden">
              <div className="p-8 bg-slate-900 text-white flex justify-between items-start no-print">
                 <div>
                    <h2 className="text-2xl font-black">{selectedPerson.name}</h2>
                    <div className="flex gap-4 mt-2 text-slate-400 text-xs font-bold">
                       <span>{selectedPerson.phone}</span><span>•</span><span>{selectedPerson.city} / {selectedPerson.district}</span>
                    </div>
                 </div>
                 <div className="text-right">
                    <div className="text-xs font-bold text-slate-400 uppercase">Güncel Bakiye</div>
                    <div className={`text-3xl font-black ${selectedPerson.balance > 0 ? 'text-red-400' : 'text-green-400'}`}>₺{selectedPerson.balance?.toFixed(2) || '0.00'}</div>
                 </div>
                 {/* X Butonu (Sağ Üst Köşeye Sabitlendi) */}
                 <button onClick={() => setSelectedPerson(null)} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-red-500 hover:text-white rounded-full transition-all no-print"><X size={20}/></button>
              </div>

              {/* Yazdırma İçin Özel Başlık (Sadece Yazdırırken Çıkar) */}
              <div className="hidden print:block p-4 border-b border-black">
                 <h2 className="text-xl font-bold">{selectedPerson.name} - Hesap Ekstresi</h2>
                 <p className="text-sm">Tarih: {new Date().toLocaleDateString('tr-TR')}</p>
              </div>

              <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
                 {activeTab === 'suppliers' && (
                   <div className="flex justify-between items-center mb-6 no-print">
                      <h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><ScrollText className="text-blue-600"/> Hesap Ekstresi</h3>
                      <div className="flex gap-2">
                         {/* YAZDIR BUTONU */}
                         <button onClick={handlePrint} className="bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-300 flex items-center gap-2">
                            <Printer size={18}/> Yazdır
                         </button>
                         {/* ÖDEME YAP BUTONU */}
                         <button onClick={() => setIsPaymentModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-green-200 active:scale-95 flex items-center gap-2">
                            <Wallet size={18}/> Ödeme Yap
                         </button>
                      </div>
                   </div>
                 )}

                 {activeTab === 'suppliers' ? (
                   <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm print:shadow-none print:border-black">
                      <table className="w-full text-left">
                         <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 print:bg-gray-100 print:text-black">
                            <tr>
                              <th className="p-4">Tarih</th>
                              <th className="p-4">Açıklama</th>
                              <th className="p-4 text-right">Borç (Alış)</th>
                              <th className="p-4 text-right">Alacak (Ödeme)</th>
                              <th className="p-4 text-right bg-slate-100 print:bg-gray-200">Bakiye</th>
                              <th className="p-4 text-center no-print">İşlem</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-50 print:divide-black">
                            {statement.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400">İşlem yok.</td></tr>}
                            {statement.map((t) => (
                              <tr key={t.id} className="hover:bg-slate-50 print:hover:bg-transparent">
                                 <td className="p-4 text-xs font-bold text-slate-500 print:text-black">{format(new Date(t.date), 'd.MM.yyyy HH:mm', { locale: tr })}</td>
                                 <td className="p-4"><div className="text-xs font-bold text-slate-700 print:text-black">{t.description}</div></td>
                                 <td className="p-4 text-right font-bold text-slate-800 text-sm print:text-black">{t.amount_in > 0 ? `₺${t.amount_in.toFixed(2)}` : '-'}</td>
                                 <td className="p-4 text-right font-bold text-green-600 text-sm print:text-black">{t.amount_out > 0 ? `₺${t.amount_out.toFixed(2)}` : '-'}</td>
                                 <td className="p-4 text-right font-black text-slate-900 text-sm bg-slate-50 print:bg-transparent print:text-black">
                                   ₺{t.balance.toFixed(2)}
                                 </td>
                                 <td className="p-4 text-center no-print">
                                   {t.type === 'payment' && (
                                     <button 
                                      onClick={() => handleDeletePayment(t)}
                                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                      title="Ödemeyi Sil"
                                     >
                                       <Trash2 size={16}/>
                                     </button>
                                   )}
                                 </td>
                              </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                 ) : (
                    <div className="text-center text-slate-400 font-bold p-10">Müşteri detay ekranı yakında eklenecek. </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* 3. MODAL: ÖDEME YAP */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in zoom-in duration-200 no-print">
           <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-6">
              <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-black text-slate-800">Ödeme Yap</h3><button onClick={() => setIsPaymentModalOpen(false)} className="p-2 bg-slate-100 rounded-full hover:bg-red-500 hover:text-white transition-all"><X size={20}/></button></div>
              <div className="space-y-4">
                 <div className="grid grid-cols-3 gap-2">
                    {['cash', 'card', 'check'].map(m => (
                      <button key={m} onClick={() => setPayMethod(m)} className={`p-3 rounded-xl text-xs font-bold border ${payMethod === m ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200'}`}>{m === 'cash' ? 'Nakit' : m === 'card' ? 'K. Kartı' : 'Çek'}</button>
                    ))}
                 </div>
                 <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₺</span><input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} className="w-full p-3 pl-8 bg-slate-50 border border-slate-200 rounded-xl font-black text-xl outline-none" placeholder="0.00"/></div>
                 {payMethod === 'check' && (
                    <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 space-y-3">
                       <input type="text" value={checkNo} onChange={e => setCheckNo(e.target.value)} placeholder="Çek No" className="w-full p-2 bg-white border border-purple-200 rounded-lg text-xs font-bold"/>
                       <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Banka" className="w-full p-2 bg-white border border-purple-200 rounded-lg text-xs font-bold"/>
                       <input type="date" value={checkDate} onChange={e => setCheckDate(e.target.value)} className="w-full p-2 bg-white border border-purple-200 rounded-lg text-xs font-bold"/>
                    </div>
                 )}
                 <textarea value={payDesc} onChange={e => setPayDesc(e.target.value)} rows={2} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none resize-none" placeholder="Açıklama..."></textarea>
                 <button onClick={handleSavePayment} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95">ÖDEMEYİ KAYDET</button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}