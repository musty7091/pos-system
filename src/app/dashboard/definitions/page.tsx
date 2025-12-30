'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Layers, 
  Factory, 
  Truck, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X,
  Search,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

// Tip tanımları
type DefinitionItem = {
  id: string;
  name: string;
};

export default function DefinitionsPage() {
  const [activeTab, setActiveTab] = useState<'categories' | 'brands' | 'suppliers'>('categories');
  const [items, setItems] = useState<DefinitionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Ekleme / Düzenleme State'leri
  const [newItemName, setNewItemName] = useState('');
  const [editingItem, setEditingItem] = useState<DefinitionItem | null>(null);

  // Veri Çekme
  const fetchData = async () => {
    setLoading(true);
    const table = activeTab; // categories, brands, suppliers
    
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('name', { ascending: true });
        
      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      toast.error('Veri çekilemedi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Tab değişince veriyi yenile
  useEffect(() => {
    fetchData();
    setNewItemName('');
    setEditingItem(null);
    setSearchTerm('');
  }, [activeTab]);

  // EKLEME
  const handleAdd = async () => {
    if (!newItemName.trim()) return;
    
    try {
      const { error } = await supabase
        .from(activeTab)
        .insert([{ name: newItemName }]);

      if (error) throw error;

      toast.success('Başarıyla eklendi');
      setNewItemName('');
      fetchData();
    } catch (error: any) {
      toast.error('Hata: ' + error.message);
    }
  };

  // SİLME
  const handleDelete = async (id: string) => {
    if (!confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from(activeTab)
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Silindi');
      fetchData();
    } catch (error: any) {
      toast.error('Silinemedi (Kullanımda olabilir)');
    }
  };

  // DÜZENLEME BAŞLAT
  const startEdit = (item: DefinitionItem) => {
    setEditingItem(item);
    setNewItemName(item.name); // Mevcut ismi inputa doldur
  };

  // DÜZENLEME KAYDET
  const handleUpdate = async () => {
    if (!editingItem || !newItemName.trim()) return;

    try {
      const { error } = await supabase
        .from(activeTab)
        .update({ name: newItemName })
        .eq('id', editingItem.id);

      if (error) throw error;

      toast.success('Güncellendi');
      setEditingItem(null);
      setNewItemName('');
      fetchData();
    } catch (error: any) {
      toast.error('Güncelleme hatası: ' + error.message);
    }
  };

  // İPTAL
  const handleCancel = () => {
    setEditingItem(null);
    setNewItemName('');
  };

  // Filtreleme
  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 bg-[#F8FAFC] min-h-screen font-sans space-y-6">
      
      {/* BAŞLIK */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Tanımlamalar</h1>
        <p className="text-slate-500 text-sm font-medium mt-1">
          Kategori, Marka ve Tedarikçi yönetimi
        </p>
      </div>

      {/* TABLAR (SEKMELER) */}
      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-fit">
        <button 
          onClick={() => setActiveTab('categories')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'categories' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <Layers size={18} /> Kategoriler
        </button>
        <button 
          onClick={() => setActiveTab('brands')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'brands' ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <Factory size={18} /> Markalar
        </button>
        <button 
          onClick={() => setActiveTab('suppliers')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'suppliers' ? 'bg-green-600 text-white shadow-lg shadow-green-200' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <Truck size={18} /> Tedarikçiler
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SOL TARAF: EKLEME / DÜZENLEME FORMU */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm sticky top-6">
            <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
              {editingItem ? <Edit2 size={20} className="text-blue-600"/> : <Plus size={20} className="text-blue-600"/>}
              {editingItem ? 'Düzenle' : 'Yeni Ekle'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 mb-1 block">
                  {activeTab === 'categories' ? 'Kategori Adı' : activeTab === 'brands' ? 'Marka Adı' : 'Tedarikçi Adı'}
                </label>
                <input 
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:border-blue-500 transition-all"
                  placeholder="İsim giriniz..."
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                {editingItem && (
                  <button onClick={handleCancel} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold hover:bg-slate-200 transition-colors">
                    İptal
                  </button>
                )}
                <button 
                  onClick={editingItem ? handleUpdate : handleAdd}
                  className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2
                    ${editingItem ? 'bg-green-600 shadow-green-200' : 'bg-blue-600 shadow-blue-200'}
                  `}
                >
                  {editingItem ? <><Save size={18}/> Güncelle</> : <><Plus size={18}/> Ekle</>}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SAĞ TARAF: LİSTE */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Arama */}
          <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex gap-2">
            <Search className="text-slate-400 ml-3 self-center" size={20} />
            <input 
              type="text" 
              placeholder={`${activeTab === 'categories' ? 'Kategori' : activeTab === 'brands' ? 'Marka' : 'Tedarikçi'} ara...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-3 bg-transparent outline-none font-bold text-slate-700"
            />
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
            {loading ? (
              <div className="flex justify-center items-center h-40 text-slate-400 font-bold gap-2">
                <Loader2 className="animate-spin" /> Yükleniyor...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex justify-center items-center h-40 text-slate-400 font-bold">
                Kayıt bulunamadı.
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">İsim</th>
                      <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="group hover:bg-blue-50/50 transition-colors">
                        <td className="p-4 font-bold text-slate-700 text-sm">
                          {item.name}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => startEdit(item)}
                              className="p-2 bg-white border border-slate-200 text-blue-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDelete(item.id)}
                              className="p-2 bg-white border border-slate-200 text-red-600 rounded-lg hover:border-red-500 hover:bg-red-50 transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}