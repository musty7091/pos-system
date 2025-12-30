'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Plus, Search, Trash2, Save, Loader2, User, Edit,
  Barcode, X, FileText, Calendar, Tag, Percent, PackageSearch, ArrowLeftRight
} from 'lucide-react';
import { toast } from 'sonner';

export default function PurchasesPage() {
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'purchase' | 'return'>('purchase');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form Alanları
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [purchaseItems, setPurchaseItems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [processing, setProcessing] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const inputsRef = useRef<any>({});

  useEffect(() => { fetchInitialData(); }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const { data: purData } = await supabase
        .from('purchase_invoices')
        .select('*, supplier:suppliers(name)')
        .order('created_at', { ascending: false });

      const { data: retData } = await supabase
        .from('purchase_returns')
        .select('*, supplier:suppliers(name)')
        .order('created_at', { ascending: false });

      const { data: supData } = await supabase.from('suppliers').select('*').order('name');
      
      const { data: prodData } = await supabase
        .from('products')
        .select('*, product_barcodes (barcode)')
        .order('name');

      const combined = [
        ...(purData || []).map((p: any) => ({ ...p, doc_type: 'purchase', contact_name: p.supplier?.name })),
        ...(retData || []).map((r: any) => ({ ...r, doc_type: 'return', contact_name: r.supplier?.name }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setPurchases(combined);
      setSuppliers(supData || []);
      setProducts(prodData || []);
    } catch (err) {
      console.error(err);
      toast.error("Veriler yüklenirken hata oluştu");
    } finally { 
      setLoading(false); 
    }
  };

  // --- SİLME FONKSİYONU (YENİ) ---
  const handleDeleteInvoice = async (invoice: any) => {
    if (!confirm('Bu evrağı silmek istediğinize emin misiniz? Bu işlem stokları ve bakiyeleri otomatik geri alacaktır.')) return;
    
    const toastId = toast.loading('İşlem yapılıyor...');
    try {
      const table = invoice.doc_type === 'purchase' ? 'purchase_invoices' : 'purchase_returns';
      const { error } = await supabase.from(table).delete().eq('id', invoice.id);
      
      if (error) throw error;
      
      toast.success('Evrak başarıyla silindi', { id: toastId });
      fetchInitialData();
    } catch (err: any) {
      toast.error('Silme hatası: ' + err.message, { id: toastId });
    }
  };

  // --- DÜZENLEME MODU AÇILIŞI (YENİ) ---
  const handleEditInvoice = async (invoice: any) => {
    setProcessing(true);
    try {
      setEditingId(invoice.id);
      setFormMode(invoice.doc_type);
      setSelectedSupplier(invoice.supplier_id);
      setInvoiceNo(invoice.invoice_no || '');
      setInvoiceDate(new Date(invoice.created_at).toISOString().split('T')[0]);

      const itemTable = invoice.doc_type === 'purchase' ? 'purchase_items' : 'purchase_return_items';
      const foreignKey = invoice.doc_type === 'purchase' ? 'invoice_id' : 'return_id';

      const { data: items, error } = await supabase
        .from(itemTable)
        .select('*, products(name, barcode)')
        .eq(foreignKey, invoice.id);

      if (error) throw error;

      if (items) {
        const loadedItems = items.map(it => ({
          tempId: Math.random().toString(),
          product_id: it.product_id,
          name: it.products?.name,
          barcode: it.products?.barcode || 'BARKODSUZ',
          quantity: it.quantity,
          unit_price: it.unit_price,
          vat_rate: it.vat_rate,
          discount1: it.discount1_rate || 0,
          discount2: it.discount2_rate || 0,
          total_line: (it.quantity * it.unit_price) * (1 - (it.discount1_rate || 0) / 100) * (1 - (it.discount2_rate || 0) / 100)
        }));
        setPurchaseItems(loadedItems);
        setIsModalOpen(true);
      }
    } catch (err: any) {
      toast.error("Bilgiler yüklenemedi: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const addProductToInvoice = (product: any, barcodeUsed?: string) => {
    const tempId = Date.now().toString();
    const newItem = {
      tempId,
      product_id: product.id,
      barcode: barcodeUsed || (product.barcode || 'BARKODSUZ'),
      name: product.name,
      quantity: 1,
      unit_price: product.buy_price || 0,
      vat_rate: product.sell_vat_rate || 20,
      discount1: 0,
      discount2: 0,
      total_line: product.buy_price || 0
    };
    
    setPurchaseItems([newItem, ...purchaseItems]);
    setSearchTerm('');

    setTimeout(() => {
      const target = inputsRef.current[`${tempId}-quantity`];
      if (target) { target.focus(); target.select(); }
    }, 100);
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm) return;
    let found = products.find((p: any) => 
      p.barcode === searchTerm.trim() || 
      p.product_barcodes?.some((b: any) => b.barcode.trim() === searchTerm.trim())
    );
    if (!found) found = products.find((p: any) => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (found) {
      addProductToInvoice(found, searchTerm);
      toast.success("Ürün eklendi");
    } else {
      toast.error("Ürün bulunamadı!");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, tempId: string, currentField: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const fields = ['quantity', 'unit_price', 'vat_rate', 'discount1', 'discount2'];
      const currentIndex = fields.indexOf(currentField);
      if (currentIndex < fields.length - 1) {
        const nextField = fields[currentIndex + 1];
        const nextInput = inputsRef.current[`${tempId}-${nextField}`];
        if (nextInput) { nextInput.focus(); nextInput.select(); }
      } else { barcodeInputRef.current?.focus(); }
    }
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...purchaseItems];
    updated[index][field] = Number(value);
    const gross = updated[index].quantity * updated[index].unit_price;
    const afterD1 = gross * (1 - updated[index].discount1 / 100);
    const afterD2 = afterD1 * (1 - updated[index].discount2 / 100);
    updated[index].total_line = afterD2;
    setPurchaseItems(updated);
  };

  const calculateInvoiceTotals = () => {
    let subTotal = 0, totalDiscount = 0, totalVat = 0;
    purchaseItems.forEach(item => {
      const gross = item.quantity * item.unit_price;
      const net = item.total_line;
      const vatAmount = net * (item.vat_rate / 100);
      subTotal += gross;
      totalDiscount += (gross - net);
      totalVat += vatAmount;
    });
    return { subTotal, totalDiscount, totalVat, grandTotal: subTotal - totalDiscount + totalVat };
  };

  const invTotals = calculateInvoiceTotals();

  const saveDocument = async () => {
    if (!selectedSupplier || purchaseItems.length === 0) {
      toast.error('Lütfen tedarikçi seçin ve ürün ekleyin');
      return;
    }
    setProcessing(true);
    const toastId = toast.loading('Kaydediliyor...');

    try {
      // DÜZENLEME VARSA ÖNCE ESKİSİNİ SİL (Bakiye ve Stok Tetikleyicileri Sayesinde Geri Alınır)
      if (editingId) {
        const deleteTable = formMode === 'purchase' ? 'purchase_invoices' : 'purchase_returns';
        await supabase.from(deleteTable).delete().eq('id', editingId);
      }

      const isReturn = formMode === 'return';
      const mainTable = isReturn ? 'purchase_returns' : 'purchase_invoices';
      const itemTable = isReturn ? 'purchase_return_items' : 'purchase_items';
      const foreignKey = isReturn ? 'return_id' : 'invoice_id';

      const { data: doc, error: dError } = await supabase.from(mainTable).insert([{
        supplier_id: selectedSupplier, 
        invoice_no: invoiceNo, 
        total_amount: invTotals.grandTotal, 
        total_vat: invTotals.totalVat, 
        created_at: invoiceDate
      }]).select().single();
      
      if (dError) throw dError;

      const itemsToSave = purchaseItems.map(item => ({
        [foreignKey]: doc.id, 
        product_id: item.product_id, 
        quantity: item.quantity, 
        unit_price: item.unit_price, 
        vat_rate: item.vat_rate, 
        discount1_rate: item.discount1, 
        discount2_rate: item.discount2, 
        net_cost: ((item.total_line + (item.total_line * item.vat_rate / 100)) / item.quantity),
        total_line_amount: item.total_line + (item.total_line * item.vat_rate / 100)
      }));
      
      const { error: iError } = await supabase.from(itemTable).insert(itemsToSave);
      if (iError) throw iError;

      // Stokları Güncelle
      for (const item of itemsToSave) {
        const { data: prod } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).single();
        if(prod) {
           const currentStock = prod.stock_quantity || 0;
           const newStock = isReturn ? currentStock - item.quantity : currentStock + item.quantity;
           const updatePayload: any = { stock_quantity: newStock };
           if (!isReturn) updatePayload.buy_price = item.unit_price; 
           await supabase.from('products').update(updatePayload).eq('id', item.product_id);
        }
      }

      toast.success('İşlem başarıyla tamamlandı.', { id: toastId });
      setIsModalOpen(false);
      setEditingId(null);
      setPurchaseItems([]);
      setInvoiceNo('');
      fetchInitialData();
    } catch (error: any) { 
      toast.error("İşlem Başarısız: " + error.message, { id: toastId }); 
    } finally { 
      setProcessing(false); 
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  return (
    <div className="p-6 bg-[#F8FAFC] min-h-screen font-sans space-y-6">
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">ALIŞ & İADE YÖNETİMİ</h1>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Stok girişlerini ve iadeleri buradan yönetin.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setFormMode('return'); setEditingId(null); setPurchaseItems([]); setInvoiceNo(''); setIsModalOpen(true); }} className="bg-orange-50 text-orange-600 border border-orange-200 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-orange-100 transition-all active:scale-95 flex items-center gap-2">
            <ArrowLeftRight size={16}/> İADE DÜZENLE
          </button>
          <button onClick={() => { setFormMode('purchase'); setEditingId(null); setPurchaseItems([]); setInvoiceNo(''); setIsModalOpen(true); }} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold text-xs shadow-xl shadow-blue-200 transition-all uppercase tracking-widest active:scale-95 flex items-center gap-2">
            <Plus size={16}/> YENİ ALIŞ GİR
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase">
            <tr>
              <th className="p-5">Tarih</th>
              <th className="p-5">Tip</th>
              <th className="p-5">Tedarikçi Firma</th>
              <th className="p-5">Fatura No</th>
              <th className="p-5 text-right">Net Tutar</th>
              <th className="p-5 text-center">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-slate-700">
            {purchases.length === 0 && (
               <tr><td colSpan={6} className="p-8 text-center text-slate-400 font-bold">Kayıt bulunamadı.</td></tr>
            )}
            {purchases.map(p => (
              <tr key={`${p.doc_type}-${p.id}`} className="hover:bg-slate-50/50 transition-all group">
                <td className="p-5 text-xs font-bold text-slate-500">{new Date(p.created_at).toLocaleDateString('tr-TR')}</td>
                <td className="p-5">
                  <span className={`text-[9px] font-black px-2 py-1 rounded uppercase ${p.doc_type === 'purchase' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                    {p.doc_type === 'purchase' ? 'Alış' : 'İade'}
                  </span>
                </td>
                <td className="p-5 text-xs font-black uppercase">{p.contact_name || 'Bilinmiyor'}</td>
                <td className="p-5 text-xs font-mono text-slate-400">{p.invoice_no || '---'}</td>
                <td className={`p-5 text-sm font-black text-right ${p.doc_type === 'purchase' ? 'text-blue-600' : 'text-orange-600'}`}>
                    ₺{p.total_amount.toFixed(2)}
                </td>
                <td className="p-5 text-center">
                  <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => handleEditInvoice(p)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                      <Edit size={16}/>
                    </button>
                    <button onClick={() => handleDeleteInvoice(p)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">
                      <Trash2 size={16}/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-7xl h-[95vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden border border-slate-100 animate-in zoom-in">
            
            <div className={`p-8 flex justify-between items-center text-white ${formMode === 'purchase' ? 'bg-slate-900' : 'bg-orange-900'}`}>
              <div className="grid grid-cols-3 gap-6 flex-1 mr-10">
                <div>
                  <label className="text-[9px] font-black text-white/60 uppercase block mb-1">Tedarikçi / Firma</label>
                  <select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)} className="w-full bg-white/10 border-none rounded-xl p-2.5 text-white font-bold text-xs outline-none appearance-none cursor-pointer">
                    <option value="" className="text-slate-900">-- Firma Seçin --</option>
                    {suppliers.map(s => <option key={s.id} value={s.id} className="text-slate-900">{s.name.toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-white/60 uppercase block mb-1">Evrak No</label>
                  <input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} type="text" className="w-full bg-white/10 border-none rounded-xl p-2.5 text-white font-bold text-xs outline-none" placeholder="No..." />
                </div>
                <div>
                  <label className="text-[9px] font-black text-white/60 uppercase block mb-1">Tarih</label>
                  <input value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} type="date" className="w-full bg-white/10 border-none rounded-xl p-2.5 text-white font-bold text-xs outline-none" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase opacity-50">{editingId ? 'DÜZENLEME' : 'YENİ KAYIT'}</p>
                  <p className="text-lg font-black uppercase tracking-widest">{formMode === 'purchase' ? 'ALIŞ FATURASI' : 'İADE FATURASI'}</p>
                </div>
                <button onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="p-2 hover:bg-white/10 rounded-full text-white ml-4"><X size={24}/></button>
              </div>
            </div>

            <div className="px-8 py-5 bg-slate-50 border-b border-slate-100">
              <form onSubmit={handleBarcodeSubmit} className="relative">
                <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input ref={barcodeInputRef} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} autoFocus className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all" placeholder="Barkod okutun veya ürün ismi yazın..." />
              </form>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white">
              <table className="w-full text-left border-separate border-spacing-0">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="text-[9px] font-black text-slate-400 uppercase border-b border-slate-100">
                    <th className="pb-4">Ürün Detayı</th>
                    <th className="pb-4 text-center">Miktar</th>
                    <th className="pb-4 text-center">Birim Fiyat</th>
                    <th className="pb-4 text-center">KDV %</th>
                    <th className="pb-4 text-center">İnd (1+2) %</th>
                    <th className="pb-4 text-right">Net Tutar (KDV'siz)</th>
                    <th className="pb-4 text-center">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {purchaseItems.map((item, idx) => (
                    <tr key={item.tempId} className="group hover:bg-slate-50/30 transition-all">
                      <td className="py-4">
                        <div className="text-[9px] font-mono text-slate-400">{item.barcode}</div>
                        <div className="text-xs font-black text-slate-800 uppercase">{item.name}</div>
                      </td>
                      <td className="py-4">
                        <input ref={el => inputsRef.current[`${item.tempId}-quantity`] = el} type="number" value={item.quantity} 
                          onKeyDown={e => handleKeyDown(e, item.tempId, 'quantity')}
                          onChange={e => updateItem(idx, 'quantity', e.target.value)} 
                          className="w-20 mx-auto block p-2 bg-slate-50 rounded-lg text-center font-bold text-xs focus:bg-white border border-transparent focus:border-blue-500 transition-all outline-none" 
                        />
                      </td>
                      <td className="py-4">
                        <input ref={el => inputsRef.current[`${item.tempId}-unit_price`] = el} type="number" value={item.unit_price} 
                          onKeyDown={e => handleKeyDown(e, item.tempId, 'unit_price')} 
                          onChange={e => updateItem(idx, 'unit_price', e.target.value)} 
                          className="w-24 mx-auto block p-2 bg-slate-50 rounded-lg text-center font-bold text-xs focus:bg-white border border-transparent focus:border-blue-500 transition-all outline-none" 
                        />
                      </td>
                      <td className="py-4 text-center">
                        <select ref={el => inputsRef.current[`${item.tempId}-vat_rate`] = el} value={item.vat_rate} 
                          onKeyDown={e => handleKeyDown(e, item.tempId, 'vat_rate')} 
                          onChange={e => updateItem(idx, 'vat_rate', e.target.value)} 
                          className="w-20 mx-auto block p-2 bg-slate-50 rounded-lg text-center font-bold text-xs outline-none focus:bg-white appearance-none cursor-pointer"
                        >
                          {[0, 5, 10, 16, 20].map(v => <option key={v} value={v}>%{v}</option>)}
                        </select>
                      </td>
                      <td className="py-4 text-center">
                        <div className="flex gap-1 justify-center">
                          <input ref={el => inputsRef.current[`${item.tempId}-discount1`] = el} type="number" value={item.discount1} 
                            onKeyDown={e => handleKeyDown(e, item.tempId, 'discount1')} 
                            onChange={e => updateItem(idx, 'discount1', e.target.value)} 
                            className="w-12 p-2 bg-blue-50 rounded-lg text-center font-bold text-xs text-blue-600 focus:bg-white outline-none" 
                            placeholder="1"
                          />
                          <input ref={el => inputsRef.current[`${item.tempId}-discount2`] = el} type="number" value={item.discount2} 
                            onKeyDown={e => handleKeyDown(e, item.tempId, 'discount2')} 
                            onChange={e => updateItem(idx, 'discount2', e.target.value)} 
                            className="w-12 p-2 bg-blue-50 rounded-lg text-center font-bold text-xs text-blue-600 focus:bg-white outline-none" 
                            placeholder="2"
                          />
                        </div>
                      </td>
                      <td className="py-4 text-right font-black text-slate-900 text-xs">
                        ₺{item.total_line.toFixed(2)}
                      </td>
                      <td className="py-4 text-center">
                        <button onClick={() => setPurchaseItems(purchaseItems.filter((it) => it.tempId !== item.tempId))} className="text-slate-300 hover:text-red-500 transition-colors">
                          <Trash2 size={16}/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-between items-end">
              <div className="text-slate-400 text-[9px] font-bold uppercase space-y-1 italic">
                {editingId && <div className="text-blue-600 mb-2 not-italic font-black underline underline-offset-4">DÜZENLEME MODU: KAYDETTİĞİNİZDE ESKİ BELGE SİLİNİP YENİSİ OLUŞTURULACAK.</div>}
                {formMode === 'purchase' ? '• Alış Modu: Stok Girişi Yapılır.' : '• İade Modu: Stok Çıkışı Yapılır.'}
                <p className="mt-1 normal-case not-italic">* Enter tuşu ile hücreler arası hızlı geçiş yapabilirsiniz.</p>
              </div>
              <div className="w-80 space-y-2 text-right">
                <div className="flex justify-between text-xs font-bold text-slate-500 uppercase"><span>Ara Toplam (Brüt)</span><span className="text-slate-900">₺{invTotals.subTotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-xs font-bold text-red-500 uppercase"><span>Toplam İskonto</span><span>- ₺{invTotals.totalDiscount.toFixed(2)}</span></div>
                <div className="flex justify-between text-xs font-bold text-slate-500 uppercase"><span>KDV Toplamı</span><span className="text-slate-900">₺{invTotals.totalVat.toFixed(2)}</span></div>
                <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                  <span className="text-xs font-black text-slate-900 uppercase">Genel Toplam</span>
                  <span className={`text-3xl font-black tracking-tighter ${formMode === 'purchase' ? 'text-blue-600' : 'text-orange-600'}`}>₺{invTotals.grandTotal.toFixed(2)}</span>
                </div>
                <button disabled={processing || !selectedSupplier || purchaseItems.length === 0} onClick={saveDocument} className={`w-full py-4 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl mt-3 active:scale-95 disabled:opacity-50 transition-all flex justify-center ${formMode === 'purchase' ? 'bg-slate-900 hover:bg-black' : 'bg-orange-600 hover:bg-orange-700'}`}>
                  {processing ? <Loader2 className="animate-spin"/> : (editingId ? 'DEĞİŞİKLİKLERİ KAYDET' : 'BELGEYİ KAYDET')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}