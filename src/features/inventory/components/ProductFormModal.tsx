'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Save, Box, Barcode, Loader2, Zap, Tag, Wallet, Truck } from 'lucide-react';

type ProductFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product?: any; 
};

const VAT_RATES = [
  { label: '%0', value: 0 },
  { label: '%5', value: 5 },
  { label: '%10', value: 10 },
  { label: '%16', value: 16 },
  { label: '%20', value: 20 },
  { label: 'Özel Matrah', value: -1 },
];

export default function ProductFormModal({ isOpen, onClose, onSuccess, product }: ProductFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [isActive, setIsActive] = useState(true);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('Adet');
  const [supplierId, setSupplierId] = useState('');
  const [isFastProduct, setIsFastProduct] = useState(false);
  const [buyPrice, setBuyPrice] = useState('');
  const [buyVat, setBuyVat] = useState('20');
  const [sellPrice, setSellPrice] = useState('');
  const [sellVat, setSellVat] = useState('20');
  const [singleBarcode, setSingleBarcode] = useState('');
  const [boxBarcode, setBoxBarcode] = useState('');
  const [boxMultiplier, setBoxMultiplier] = useState('');
  const [stock, setStock] = useState('0');
  const [criticalStock, setCriticalStock] = useState('10');

  useEffect(() => {
    if (isOpen) {
      fetchSuppliers();
      if (product) {
        setIsActive(product.is_active ?? true);
        setName(product.name || '');
        setUnit(product.unit || 'Adet');
        setSupplierId(product.supplier_id || '');
        setIsFastProduct(product.is_fast_product || false);
        setBuyPrice(product.buy_price?.toString() || '');
        setBuyVat(product.buy_vat_rate?.toString() || '20');
        setSellPrice(product.sell_price?.toString() || '');
        setSellVat(product.sell_vat_rate?.toString() || '20');
        setStock(product.stock_quantity?.toString() || '0');
        setCriticalStock(product.critical_stock_level?.toString() || '10');
        
        if (product.product_barcodes) {
          const single = product.product_barcodes.find((b: any) => b.quantity_multiplier === 1);
          const box = product.product_barcodes.find((b: any) => b.quantity_multiplier > 1);
          setSingleBarcode(single?.barcode || '');
          setBoxBarcode(box?.barcode || '');
          setBoxMultiplier(box?.quantity_multiplier?.toString() || '');
        }
      } else {
        resetForm();
      }
    }
  }, [isOpen, product]);

  const fetchSuppliers = async () => {
    const { data } = await supabase
      .from('contacts')
      .select('id, name')
      .eq('type', 'supplier')
      .order('name', { ascending: true });
    
    if (data) setSuppliers(data);
  };

  const resetForm = () => {
    setIsActive(true); setName(''); setUnit('Adet'); setSupplierId(''); setIsFastProduct(false);
    setBuyPrice(''); setBuyVat('20'); setSellPrice(''); setSellVat('20');
    setSingleBarcode(''); setBoxBarcode(''); setBoxMultiplier('');
    setStock('0'); setCriticalStock('10'); setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user?.id).single();
      const tenantId = profile?.tenant_id;

      if (!tenantId) throw new Error("Oturum açmış dükkan bilgisi bulunamadı.");

      // HATA ÇÖZÜMÜ: supplierId boş string ise veritabanına null gönderilir.
      const payload = {
        name, 
        is_active: isActive, 
        is_fast_product: isFastProduct, 
        unit, 
        supplier_id: supplierId === "" ? null : supplierId, 
        buy_price: Number(buyPrice) || 0, 
        buy_vat_rate: Number(buyVat), 
        sell_price: Number(sellPrice) || 0, 
        sell_vat_rate: Number(sellVat), 
        stock_quantity: Number(stock) || 0, 
        critical_stock_level: Number(criticalStock) || 0, 
        tenant_id: tenantId 
      };

      let productId = product?.id;
      if (product) {
        const { error: upError } = await supabase.from('products').update(payload).eq('id', product.id);
        if (upError) throw upError;
        await supabase.from('product_barcodes').delete().eq('product_id', product.id);
      } else {
        const { data: newP, error: insError } = await supabase.from('products').insert(payload).select().single();
        if (insError) throw insError;
        productId = newP.id;
      }

      const barcodes = [];
      if (singleBarcode) barcodes.push({ barcode: singleBarcode, product_id: productId, tenant_id: tenantId, quantity_multiplier: 1 });
      if (boxBarcode && boxMultiplier) barcodes.push({ barcode: boxBarcode, product_id: productId, tenant_id: tenantId, quantity_multiplier: Number(boxMultiplier) });
      
      if (barcodes.length > 0) {
        const { error: bError } = await supabase.from('product_barcodes').insert(barcodes);
        if (bError) throw bError;
      }

      onSuccess();
      onClose();
    } catch (err: any) { 
      setError(err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl flex flex-col max-h-[95vh] border border-slate-100 animate-in zoom-in">
        <div className="px-8 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/30 rounded-t-[2rem]">
          <div className="flex items-center gap-3">
            <Box size={22} className="text-blue-600"/>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-none uppercase">Ürün Tanımlama</h3>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">Kart Bilgileri</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors"><X size={22}/></button>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-5 space-y-5 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Satışta (Aktif)</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:bg-green-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
              </label>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Hızlı Ürün</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={isFastProduct} onChange={e => setIsFastProduct(e.target.checked)} />
                <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:bg-yellow-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-3">
              <label className="label-style">Ürün Adı</label>
              <input required type="text" className="input-style" placeholder="Ürün ismini yazınız" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="col-span-1">
              <label className="label-style">Birim</label>
              <select className="input-style" value={unit} onChange={e => setUnit(e.target.value)}>
                <option value="Adet">Adet</option><option value="Kg">Kg</option><option value="Lt">Lt</option><option value="Paket">Paket</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="label-style flex items-center gap-1.5"><Truck size={12}/> Tedarikçi Firma</label>
            <select className="input-style" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
              <option value="">Tedarikçi Seçiniz (Opsiyonel)</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-6 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-400 mb-1"><Wallet size={14}/><span className="text-[10px] font-bold uppercase tracking-widest">Alış</span></div>
              <div><label className="text-[9px] font-bold text-slate-400 ml-1 mb-1 block uppercase">FİYAT (₺)</label><input type="number" step="0.01" className="input-style !bg-white !py-2" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} /></div>
              <div><label className="text-[9px] font-bold text-slate-400 ml-1 mb-1 block uppercase">KDV ORANI</label><select className="input-style !bg-white !py-2" value={buyVat} onChange={e => setBuyVat(e.target.value)}>{VAT_RATES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select></div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-blue-600 mb-1"><Tag size={14}/><span className="text-[10px] font-bold uppercase tracking-widest">Satış</span></div>
              <div><label className="text-[9px] font-bold text-blue-500 ml-1 mb-1 block uppercase">FİYAT (₺)</label><input required type="number" step="0.01" className="input-style !bg-white !py-2 border-blue-100 text-blue-600 font-bold" value={sellPrice} onChange={e => setSellPrice(e.target.value)} /></div>
              <div><label className="text-[9px] font-bold text-blue-500 ml-1 mb-1 block uppercase">KDV ORANI</label><select className="input-style !bg-white !py-2 border-blue-100 text-blue-500 font-bold" value={sellVat} onChange={e => setSellVat(e.target.value)}>{VAT_RATES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select></div>
            </div>
          </div>

          <div className="bg-orange-50/30 p-5 rounded-2xl border border-orange-100/50 space-y-3">
            <div className="flex items-center gap-2 text-orange-600"><Barcode size={16}/><h4 className="text-[10px] font-bold uppercase tracking-widest">Barkod Tanımları</h4></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-[9px] font-bold text-orange-400 ml-1 mb-1 block uppercase">TEKİL BARKOD</label><input type="text" className="input-style !bg-white !py-2 border-orange-100" value={singleBarcode} onChange={e => setSingleBarcode(e.target.value)} /></div>
              <div className="flex gap-2">
                <div className="flex-1"><label className="text-[9px] font-bold text-orange-400 ml-1 mb-1 block uppercase">KOLİ BARKODU</label><input type="text" className="input-style !bg-white !py-2 border-orange-100" value={boxBarcode} onChange={e => setBoxBarcode(e.target.value)} /></div>
                <div className="w-16"><label className="text-[9px] font-bold text-orange-400 ml-1 mb-1 block uppercase text-center">İÇ ADET</label><input type="number" className="input-style !bg-white !py-2 border-orange-100 text-center" value={boxMultiplier} onChange={e => setBoxMultiplier(e.target.value)} /></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className="label-style">Stok Miktarı</label><input type="number" className="input-style !py-2" value={stock} onChange={e => setStock(e.target.value)} /></div>
            <div><label className="label-style !text-red-400">Kritik Stok</label><input type="number" className="input-style !py-2 border-red-50" value={criticalStock} onChange={e => setCriticalStock(e.target.value)} /></div>
          </div>

          {error && <div className="p-2 bg-red-50 text-red-600 text-[9px] font-bold uppercase rounded-lg border border-red-100 text-center tracking-tighter">{error}</div>}

          <div className="flex gap-4 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 text-slate-400 font-bold uppercase tracking-widest text-[10px] hover:text-slate-600 transition-all">İptal</button>
            <button type="submit" disabled={loading} className="flex-[2] btn-primary h-14 shadow-blue-500/10 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /><span className="uppercase tracking-widest text-xs">{product ? 'Güncelle' : 'Kaydet'}</span></>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}