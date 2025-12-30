'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; // YÖNLENDİRME İÇİN EKLENDİ
import { supabase } from '@/lib/supabase';
import { Product, Category, Brand, Supplier } from '@/types';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Package, 
  X,
  Save,
  Loader2,
  Hash,
  Layers,
  Factory,
  Settings // AYARLAR IKONU
} from 'lucide-react';
import { toast } from 'sonner';

export default function InventoryPage() {
  const router = useRouter(); // Router'ı kullanacağız
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sadece Ürün Modalı kaldı, diğerleri gitti
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Ürün Formu (KDV Varsayılan: 20)
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    barcode: '',
    buy_price: 0,
    sell_price: 0,
    stock_quantity: 0,
    critical_stock_level: 5,
    unit: 'Adet',
    sell_vat_rate: 20, 
    is_active: true
  });

  // VERİ ÇEKME
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: prodData } = await supabase
        .from('products')
        .select(`*, category:categories(name), brand:brands(name), supplier:suppliers(name)`)
        .order('created_at', { ascending: false });

      // Dropdownlar için verileri çekmeye devam ediyoruz
      const { data: catData } = await supabase.from('categories').select('*').order('name');
      const { data: brandData } = await supabase.from('brands').select('*').order('name');
      const { data: supData } = await supabase.from('suppliers').select('*').order('name');

      setProducts(prodData || []);
      setCategories(catData || []);
      setBrands(brandData || []);
      setSuppliers(supData || []);

    } catch (error) {
      console.error('Veri hatası', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- ÜRÜN İŞLEMLERİ ---
  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading('İşleniyor...');

    try {
      if (!formData.name) throw new Error('Ürün adı giriniz');
      if (!formData.barcode) throw new Error('Barkod giriniz');

      const payload: any = {
        name: formData.name,
        barcode: formData.barcode,
        unit: formData.unit,
        buy_price: formData.buy_price,
        sell_price: formData.sell_price,
        sell_vat_rate: formData.sell_vat_rate,
        stock_quantity: formData.stock_quantity,
        is_active: formData.is_active,
        critical_stock_level: formData.critical_stock_level,
        category_id: formData.category_id || null,
        brand_id: formData.brand_id || null,
        supplier_id: formData.supplier_id || null,
      };

      if (editingProduct) {
        const { error } = await supabase.from('products').update(payload).eq('id', editingProduct.id);
        if (error) throw error;
        toast.success('Ürün güncellendi', { id: toastId });
      } else {
        const { error } = await supabase.from('products').insert([payload]);
        if (error) throw error;
        toast.success('Ürün eklendi', { id: toastId });
      }

      setIsProductModalOpen(false);
      setEditingProduct(null);
      resetForm();
      fetchData();

    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Silmek istediğine emin misin?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) {
        toast.success('Ürün silindi');
        setProducts(prev => prev.filter(p => p.id !== id));
    } else {
        toast.error('Hata: ' + error.message);
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({ ...product });
    setIsProductModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '', barcode: '', buy_price: 0, sell_price: 0, 
      stock_quantity: 0, critical_stock_level: 5, unit: 'Adet', 
      sell_vat_rate: 20, is_active: true
    });
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.barcode?.includes(searchTerm)
  );

  return (
    <div className="p-6 space-y-6 bg-[#F8FAFC] min-h-screen font-sans">
      
      {/* BAŞLIK */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Stok Yönetimi</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Toplam {products.length} ürün
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          
          {/* YENİ BUTON: Tanımlamalar sayfasına yönlendirir */}
          <button 
            onClick={() => router.push('/dashboard/definitions')}
            className="bg-white border border-slate-200 text-slate-600 hover:border-purple-500 hover:text-purple-600 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm"
          >
            <Settings size={16} />
            KATEGORİ & MARKA YÖNETİMİ
          </button>
          
          <button 
            onClick={() => {
              setEditingProduct(null);
              resetForm();
              setIsProductModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-200 transition-all active:scale-95 ml-2"
          >
            <Plus size={16} />
            YENİ ÜRÜN EKLE
          </button>
        </div>
      </div>

      {/* ARAMA */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Ürün adı, barkod..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-transparent outline-none text-sm font-bold text-slate-700 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* LİSTE */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-12">#</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ürün Bilgisi</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Detaylar</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Maliyet</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Satış</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Stok</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={7} className="p-10 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2"/> Yükleniyor...</td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan={7} className="p-10 text-center text-slate-400">Ürün bulunamadı.</td></tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                        <Package size={14} />
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 text-xs">{product.name}</span>
                        <span className="text-[10px] font-mono text-slate-400 mt-0.5">{product.barcode}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        {product.brand && <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1"><Factory size={10}/> {product.brand.name}</span>}
                        {product.category && <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Layers size={10}/> {product.category.name}</span>}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                       <span className="text-xs font-bold text-slate-400">₺{product.buy_price.toFixed(2)}</span>
                    </td>
                    <td className="p-4 text-right">
                       <span className="text-sm font-black text-slate-800">₺{product.sell_price.toFixed(2)}</span>
                       <div className="text-[9px] font-bold text-slate-400 mt-0.5">
                         {product.sell_vat_rate === -1 ? 'Özel Matrah' : `%${product.sell_vat_rate} KDV`}
                       </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                        product.stock_quantity <= product.critical_stock_level 
                        ? 'bg-red-100 text-red-600' 
                        : 'bg-green-100 text-green-700'
                      }`}>
                        {product.stock_quantity} {product.unit}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditModal(product)} className="p-1.5 hover:bg-blue-100 text-blue-600 rounded-md"><Edit size={14} /></button>
                        <button onClick={() => handleDeleteProduct(product.id)} className="p-1.5 hover:bg-red-100 text-red-600 rounded-md"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ÜRÜN MODALI */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-black text-slate-800">
                {editingProduct ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'}
              </h2>
              <button onClick={() => setIsProductModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmitProduct} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
              <div className="space-y-4">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 mb-1 block">Barkod</label>
                    <div className="relative">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                      <input required value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} className="w-full p-4 pl-11 bg-slate-50 border border-slate-200 rounded-2xl font-mono font-bold text-slate-700 focus:border-blue-500 outline-none transition-all" placeholder="Barkod"/>
                    </div>
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 mb-1 block">Ürün Adı</label>
                    <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-lg text-slate-800 focus:border-blue-500 outline-none transition-all" placeholder="Ürün Adı"/>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="col-span-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 mb-1 block">Birim Fiyat (Alış)</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₺</span>
                        <input type="number" step="0.01" value={formData.buy_price} onChange={e => setFormData({...formData, buy_price: parseFloat(e.target.value)})} className="w-full p-3 pl-8 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 focus:border-blue-500 outline-none"/>
                    </div>
                 </div>
                 
                 {/* KDV: 0, 5, 10, 16, 20 ve Özel Matrah */}
                 <div className="col-span-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 mb-1 block">KDV (%)</label>
                    <select value={formData.sell_vat_rate} onChange={e => setFormData({...formData, sell_vat_rate: parseFloat(e.target.value)})} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500">
                      <option value="0">%0</option>
                      <option value="5">%5</option>
                      <option value="10">%10</option>
                      <option value="16">%16</option>
                      <option value="20">%20</option>
                      <option value="-1">Özel Matrah</option>
                    </select>
                 </div>
                 
                 <div className="col-span-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 mb-1 block">Tedarikçi</label>
                    <select value={formData.supplier_id || ''} onChange={e => setFormData({...formData, supplier_id: e.target.value || undefined})} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500">
                      <option value="">Seçiniz...</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                 </div>
                 <div className="col-span-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 mb-1 block">Birim</label>
                    <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500">
                      <option value="Adet">Adet</option>
                      <option value="Kg">Kg</option>
                      <option value="Lt">Lt</option>
                      <option value="Koli">Koli</option>
                    </select>
                 </div>
              </div>

              <div className="p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-[10px] font-black text-blue-400 uppercase tracking-wider mb-1 block">Satış Fiyatı (KDV Dahil)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 font-black">₺</span>
                          <input type="number" step="0.01" value={formData.sell_price} onChange={e => setFormData({...formData, sell_price: parseFloat(e.target.value)})} className="w-full p-3 pl-8 bg-blue-50 border border-blue-200 rounded-xl font-black text-xl text-blue-700 focus:border-blue-500 outline-none"/>
                        </div>
                     </div>
                     <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Mevcut Stok</label>
                        <input type="number" value={formData.stock_quantity} onChange={e => setFormData({...formData, stock_quantity: parseFloat(e.target.value)})} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 focus:border-blue-500 outline-none"/>
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                     <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Kategori</label>
                        <select value={formData.category_id || ''} onChange={e => setFormData({...formData, category_id: e.target.value || undefined})} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none">
                            <option value="">Seçiniz...</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Marka</label>
                        <select value={formData.brand_id || ''} onChange={e => setFormData({...formData, brand_id: e.target.value || undefined})} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none">
                            <option value="">Seçiniz...</option>
                            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                     </div>
                  </div>
              </div>

            </form>
            
            <div className="p-6 border-t border-slate-100 flex gap-3">
               <button onClick={() => setIsProductModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold uppercase hover:bg-slate-200 transition-colors">İptal</button>
               <button onClick={handleSubmitProduct} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold uppercase hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 active:scale-95"><Save className="inline mr-2" size={18}/>Kaydet</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}