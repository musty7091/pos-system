'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Product, Customer, CartItem } from '@/types'; // Güncel tipleri kullanıyoruz
import { toast } from 'sonner';
import { 
  Search, 
  Trash2, 
  Delete, 
  Hash, 
  Loader2, 
  X, 
  RotateCcw, 
  Banknote, 
  CreditCard, 
  Wallet,
  Box as BoxIcon,
  User,
  AlertCircle
} from 'lucide-react';

// ---------------------------------------------------------------------------
// TYPES & CONSTANTS
// ---------------------------------------------------------------------------

const CART_STORAGE_KEY = 'pos_cart_backup';

type PaymentMethod = 'cash' | 'card' | 'on_account';

interface SelectionModalProps {
  isOpen: boolean;
  product: Product;
  boxQty: number;
}

// ---------------------------------------------------------------------------
// CUSTOM HOOK: POS Logic
// ---------------------------------------------------------------------------
function usePosLogic() {
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
  const [fastProducts, setFastProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  
  // State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartLoaded, setIsCartLoaded] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [manualInput, setManualInput] = useState(''); 
  const [multiplier, setMultiplier] = useState(1); 
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectionModal, setSelectionModal] = useState<SelectionModalProps | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. ADIM: LocalStorage'dan Sepeti Yükle
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        try {
          setCart(JSON.parse(saved));
        } catch (e) {
          console.error("Sepet yüklenirken hata:", e);
        }
      }
      setIsCartLoaded(true);
    }
  }, []);

  // 2. ADIM: Sepet değiştiğinde kaydet
  useEffect(() => {
    if (isCartLoaded) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    }
  }, [cart, isCartLoaded]);

  // 3. ADIM: Verileri Çek (YENİ TABLO İSİMLERİ İLE)
  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Ürünleri Çek
      const { data: fastData, error: fastError } = await supabase
        .from('products')
        .select('*, product_barcodes(*)') // İlişkisel barkodları da al
        .eq('is_active', true)
        // .eq('is_fast_product', true) // İstersek sadece hızlı ürünleri getiririz, şimdilik hepsi
        .order('name')
        .limit(50);

      if (fastError) throw fastError;

      // Müşterileri Çek (Contacts -> Customers)
      const { data: custData, error: custError } = await supabase
        .from('customers') // YENİ TABLO ADI
        .select('*')
        .order('name');
      
      if (custError) throw custError;

      const safeFastProducts = (fastData as Product[]) || [];
      const safeCustomers = (custData as Customer[]) || [];

      setFastProducts(safeFastProducts);
      setDisplayedProducts(safeFastProducts); 
      setCustomers(safeCustomers);
      
    } catch (err: any) {
      console.error('Veri çekme hatası:', err);
      // UX: Sayfa açılışında kırmızı toast göstermiyoruz, konsola basıyoruz.
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Arama Mantığı
  useEffect(() => {
    if (!searchTerm.trim()) {
      setDisplayedProducts(fastProducts);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    setIsSearching(true);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from('products')
          .select('*, product_barcodes(*)')
          .eq('is_active', true)
          .ilike('name', `%${searchTerm}%`)
          .limit(30);
        
        setDisplayedProducts((data as Product[]) || []);
      } catch (error) {
        console.error("Arama hatası:", error);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchTerm, fastProducts]);

  // Barkod Bulma
  const findProductByBarcode = async (barcode: string): Promise<{ product: Product; multiplier: number } | null> => {
    // 1. RAM'den kontrol (Hızlı Ürünler içinde var mı?)
    for (const p of fastProducts) {
       // Ana barkod kontrolü
       if (p.barcode === barcode) return { product: p, multiplier: 1 };
       
       // Ek barkod kontrolü
       const barcodeMatch = p.product_barcodes?.find(b => b.barcode === barcode);
       if (barcodeMatch) {
         return { product: p, multiplier: barcodeMatch.quantity_multiplier };
       }
    }

    // 2. DB'den kontrol (product_barcodes tablosu)
    const { data: barcodeData, error: barcodeError } = await supabase
      .from('product_barcodes')
      .select('quantity_multiplier, products(*, product_barcodes(*))') // İlişkisel sorgu
      .eq('barcode', barcode)
      .single();

    if (!barcodeError && barcodeData && barcodeData.products) {
        const prod = Array.isArray(barcodeData.products) ? barcodeData.products[0] : barcodeData.products;
        return { 
            product: prod as Product, 
            multiplier: barcodeData.quantity_multiplier || 1
        };
    }

    // 3. DB'den kontrol (products ana tablosu)
    const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*, product_barcodes(*)')
        .eq('barcode', barcode)
        .single();

    if (!productError && productData) {
        return { product: productData as Product, multiplier: 1 };
    }
    
    return null;
  };

  const addToCart = useCallback((product: Product, qty: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + qty } 
            : item
        );
      }
      return [...prev, { 
        id: product.id, 
        name: product.name, 
        sell_price: product.sell_price || 0,
        quantity: qty,
        vat_rate: product.sell_vat_rate || 0,
        stock_quantity: product.stock_quantity // UI'da uyarı göstermek için
      }];
    });

    setMultiplier(1);
    setManualInput('');
    setSearchTerm('');
    setSelectionModal(null);
    searchInputRef.current?.focus();
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  }, []);

  const totals = useMemo(() => {
    let total = 0;
    let totalVat = 0;
    
    cart.forEach(item => {
      const price = item.sell_price || 0;
      const qty = item.quantity || 0;
      const lineGross = price * qty;
      const vatRate = item.vat_rate > 0 ? item.vat_rate : 0;
      const lineNet = lineGross / (1 + vatRate / 100);
      const lineVat = lineGross - lineNet;
      
      total += lineGross;
      totalVat += lineVat;
    });
    
    return { total, totalVat, subTotal: total - totalVat };
  }, [cart]);

  const completeSale = async (method: PaymentMethod) => {
    if (cart.length === 0) return;
    
    setPaymentProcessing(true);
    const loadingToast = toast.loading('Satış işleniyor...');

    try {
      const rpcParams = {
        p_customer_id: selectedCustomer || null,
        p_payment_method: method,
        p_items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity
        }))
      };

      const { error } = await supabase.rpc('create_sale_transaction', rpcParams);
      if (error) throw error;

      setCart([]);
      localStorage.removeItem(CART_STORAGE_KEY);
      setSelectedCustomer('');
      setIsPaymentModalOpen(false);
      setMultiplier(1);
      
      // Stoklar değiştiği için listeyi tazele
      await fetchInitialData();
      
      toast.dismiss(loadingToast);
      toast.success('Satış Başarıyla Tamamlandı 🎉', {
        duration: 4000,
        style: { background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }
      });
      
    } catch (error: any) {
      console.error(error);
      toast.dismiss(loadingToast);
      toast.error('Satış Hatası: ' + error.message);
    } finally {
      setPaymentProcessing(false);
    }
  };

  return {
    displayedProducts,
    cart,
    customers,
    selectedCustomer,
    searchTerm,
    isSearching,
    isLoading,
    manualInput,
    multiplier,
    isPaymentModalOpen,
    selectionModal,
    paymentProcessing,
    totals,
    searchInputRef,
    setSearchTerm,
    setManualInput,
    setMultiplier,
    setSelectedCustomer,
    setIsPaymentModalOpen,
    setSelectionModal,
    addToCart,
    removeFromCart,
    completeSale,
    findProductByBarcode,
    setCart
  };
}

// ---------------------------------------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------------------------------------
export default function PosPage() {
  const {
    displayedProducts, cart, customers, selectedCustomer,
    searchTerm, isSearching, isLoading, manualInput, multiplier,
    isPaymentModalOpen, selectionModal, paymentProcessing, totals, searchInputRef,
    setSearchTerm, setManualInput, setMultiplier, setSelectedCustomer,
    setIsPaymentModalOpen, setSelectionModal, addToCart, removeFromCart,
    completeSale, findProductByBarcode, setCart
  } = usePosLogic();

  const barcodeBuffer = useRef<string>('');
  const lastKeyTime = useRef<number>(0);

  const handleNumpad = (value: string) => {
    if (value === 'C') setManualInput('');
    else if (value === 'back') setManualInput(prev => prev.slice(0, -1));
    else setManualInput(prev => prev + value);
  };

  const handleSetMultiplier = () => {
    if (!manualInput) return;
    const val = parseInt(manualInput);
    if (val > 0) {
      setMultiplier(val);
      setManualInput('');
    }
  };

  const handleBarcodeSubmit = async (codeOverride?: string) => {
    const codeToSearch = codeOverride || manualInput;
    if (!codeToSearch) return;
    
    const result = await findProductByBarcode(codeToSearch);
    
    if (result) {
      addToCart(result.product, result.multiplier);
      setManualInput('');
    } else {
      toast.error('Barkod Bulunamadı!', {
        description: `Aranan kod: ${codeToSearch}`
      });
    }
  };

  const handleProductSelection = (product: Product) => {
    const boxBarcode = product.product_barcodes?.find((b) => b.quantity_multiplier > 1);
    
    if (boxBarcode) {
      setSelectionModal({ 
        isOpen: true, 
        product: product, 
        boxQty: boxBarcode.quantity_multiplier 
      });
    } else {
      addToCart(product, multiplier);
    }
  };

  // Global Klavye Dinleyici (Barkod Okuyucu İçin)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Eğer arama kutusundaysak barkod buffer'ı doldurma
      if (document.activeElement === searchInputRef.current) return;
      
      const currentTime = Date.now();
      // 100ms'den uzun süre geçtiyse buffer'ı sıfırla (Manuel giriş vs Scanner ayrımı)
      if (currentTime - lastKeyTime.current > 100) {
        if (barcodeBuffer.current.length > 0 && barcodeBuffer.current.length < 3) {
           // Kısa girişleri buffer'dan temizle
           barcodeBuffer.current = '';
        }
      }
      lastKeyTime.current = currentTime;

      if (e.key === 'Enter') {
        e.preventDefault();
        
        if (barcodeBuffer.current.length > 0) {
          handleBarcodeSubmit(barcodeBuffer.current);
          barcodeBuffer.current = ''; 
          setManualInput(''); 
        } 
        else if (manualInput.length > 0) {
          handleBarcodeSubmit(manualInput);
        }
      } else if (e.key === 'Backspace') {
        barcodeBuffer.current = barcodeBuffer.current.slice(0, -1);
        setManualInput(prev => prev.slice(0, -1));
      } else if (e.key === 'Escape') {
        barcodeBuffer.current = '';
        setManualInput('');
        setMultiplier(1);
        setIsPaymentModalOpen(false);
        setSelectionModal(null);
      } else if (e.key.length === 1 && e.key >= '0' && e.key <= '9') {
        barcodeBuffer.current += e.key;
        setManualInput(prev => prev + e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualInput]); 

  if (isLoading && !displayedProducts.length) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] bg-[#F1F5F9] p-3 gap-3 overflow-hidden font-sans">
      
      {/* ------------------- MODALS ------------------- */}
      
      {selectionModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl border border-slate-100 animate-in zoom-in duration-200">
            <h3 className="text-xl font-black text-slate-800 uppercase text-center mb-2">
              {selectionModal.product.name}
            </h3>
            <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest mb-8">
              Miktar Seçimi
            </p>
            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={() => addToCart(selectionModal.product, 1)} 
                className="h-20 bg-slate-100 hover:border-blue-500 border-2 border-transparent rounded-3xl flex flex-col items-center justify-center transition-all group"
              >
                <span className="text-xs font-black uppercase tracking-widest">TEKLİ ADET</span>
                <span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-500 uppercase">
                  1 Adet Ekle
                </span>
              </button>
              
              <button 
                onClick={() => addToCart(selectionModal.product, selectionModal.boxQty)} 
                className="h-20 bg-blue-50 hover:bg-blue-600 border-2 border-blue-100 hover:border-blue-600 rounded-3xl flex flex-col items-center justify-center transition-all group"
              >
                <span className="text-xs font-black text-blue-600 group-hover:text-white uppercase tracking-widest">
                  KOLİ PAKET
                </span>
                <span className="text-[10px] font-bold text-blue-400 group-hover:text-blue-100 uppercase">
                  {selectionModal.boxQty} Adet Ekle
                </span>
              </button>
              
              <button 
                onClick={() => setSelectionModal(null)} 
                className="mt-4 text-[10px] font-bold text-slate-300 hover:text-red-500 uppercase text-center"
              >
                İptal Et
              </button>
            </div>
          </div>
        </div>
      )}

      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-slate-900 p-10 text-center relative">
              <span className="text-blue-400 text-[10px] font-black uppercase tracking-[0.3em]">
                Ödenecek Toplam
              </span>
              <h2 className="text-5xl font-black text-white mt-2 tracking-tighter">
                ₺{totals.total.toFixed(2)}
              </h2>
              <button 
                onClick={() => setIsPaymentModalOpen(false)} 
                className="absolute top-6 right-6 p-2 bg-slate-800 hover:bg-red-500 rounded-full text-white transition-all"
              >
                <X size={20}/>
              </button>
            </div>
            <div className="p-10 grid grid-cols-1 gap-4">
              <button 
                disabled={paymentProcessing} 
                onClick={() => completeSale('cash')} 
                className="h-16 bg-green-500 hover:bg-green-600 text-white rounded-2xl flex items-center justify-center gap-4 font-black text-xs tracking-widest uppercase active:scale-95 shadow-lg disabled:opacity-50"
              >
                <Banknote size={24}/> NAKİT ÖDEME
              </button>
              
              <button 
                disabled={paymentProcessing} 
                onClick={() => completeSale('card')} 
                className="h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex items-center justify-center gap-4 font-black text-xs tracking-widest uppercase active:scale-95 shadow-lg disabled:opacity-50"
              >
                <CreditCard size={24}/> KREDİ KARTI
              </button>
              
              <button 
                disabled={paymentProcessing || !selectedCustomer} 
                onClick={() => completeSale('on_account')} 
                className={`h-16 rounded-2xl flex items-center justify-center gap-4 font-black text-xs tracking-widest uppercase transition-all disabled:opacity-50 ${
                  selectedCustomer ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-100 text-slate-300'
                }`}
              >
                <Wallet size={24}/> VERESİYE / AÇIK HESAP
              </button>
              
              {!selectedCustomer && (
                <p className="text-[10px] text-center text-red-400 font-bold mt-2">
                  Veresiye için müşteri seçmelisiniz.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------- SOL KOLON: Panel (Numpad) ------------------- */}
      <div className="w-[280px] shrink-0 flex flex-col gap-3">
        <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-200 flex-1 flex flex-col">
          <div className="bg-slate-900 rounded-2xl p-4 mb-4 flex flex-col justify-center items-end h-28 border border-slate-800 shadow-inner">
            <span className="text-blue-400 text-[9px] font-bold uppercase self-start tracking-widest">
              Giriş Paneli
            </span>
            <span className="text-3xl font-mono font-bold text-white tracking-widest">
              {manualInput || '0'}
            </span>
          </div>
          
          <div className="grid grid-cols-3 gap-2 flex-1 content-start">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
              <button 
                key={n} 
                onClick={() => handleNumpad(n.toString())} 
                className="bg-slate-50 border border-slate-100 rounded-xl text-xl font-bold text-slate-700 hover:border-blue-500 hover:text-blue-600 transition-all active:scale-95 h-14"
              >
                {n}
              </button>
            ))}
            
            <button 
              onClick={() => { setManualInput(''); setMultiplier(1); }} 
              className="bg-red-50 text-red-600 border border-red-100 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-red-100 active:scale-95"
            >
               <RotateCcw size={16} /> 
               <span className="text-[8px] font-black uppercase tracking-tighter">SIFIRLA</span>
            </button>
            
            <button 
              onClick={() => handleNumpad('0')} 
              className="bg-slate-50 border border-slate-100 rounded-xl text-xl font-bold text-slate-700 active:scale-95"
            >
              0
            </button>
            
            <button 
              onClick={() => handleNumpad('back')} 
              className="bg-orange-50 text-orange-500 border border-orange-100 rounded-xl flex items-center justify-center active:scale-95 hover:bg-orange-100"
            >
              <Delete size={20}/>
            </button>
            
            <div className="col-span-3 mt-2 grid grid-cols-2 gap-2">
              <button 
                onClick={handleSetMultiplier} 
                className="h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.1em] shadow-lg shadow-orange-100 active:scale-95 transition-all"
              >
                X (ADET)
              </button>

              <button 
                onClick={() => handleBarcodeSubmit()} 
                className="h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.1em] flex items-center justify-center gap-2 shadow-lg shadow-blue-100 active:scale-95 transition-all"
              >
                <Hash size={16}/> BARKOD
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------- ORTA KOLON: Ürün Listesi ------------------- */}
      <div className="flex-1 flex flex-col gap-3 overflow-hidden">
        <div className="flex gap-3 h-14">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            {isSearching && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" size={18} />
            )}
            <input 
              ref={searchInputRef} 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              placeholder="Ürün adı, barkod veya açıklama..." 
              className="w-full h-full pl-11 pr-10 bg-white border border-slate-200 rounded-2xl outline-none font-bold text-slate-700 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-300" 
            />
          </div>
          <div className="px-6 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center shrink-0 min-w-[100px]">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">
              Aktif Çarpan
            </span>
            <span className="text-xl font-black text-blue-600">
              x{multiplier}
            </span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
          {!searchTerm && displayedProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
               <BoxIcon size={48} className="opacity-20" />
               <span className="text-xs font-bold uppercase tracking-widest opacity-50">
                 Görünürde Ürün Yok... (Admin Panelinden Ürün Ekleyin)
               </span>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {displayedProducts.map(product => (
                <button 
                  key={product.id} 
                  onClick={() => handleProductSelection(product)} 
                  className="bg-white p-4 border border-slate-100 rounded-[1.8rem] shadow-sm hover:border-blue-400 hover:shadow-md transition-all text-left flex flex-col justify-between min-h-[120px] active:scale-95 group relative overflow-hidden"
                >
                  <span className="text-slate-800 font-bold text-[11px] uppercase line-clamp-2 leading-tight group-hover:text-blue-600 z-10">
                    {product.name}
                  </span>
                  
                  {/* Stok Uyarısı */}
                  {(product.stock_quantity || 0) <= (product.critical_stock_level || 0) && (
                    <div className="absolute top-0 right-0 p-2 z-20">
                        <span className="w-2 h-2 bg-red-500 rounded-full block animate-pulse"></span>
                    </div>
                  )}

                  <div className="flex flex-col mt-2 z-10">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">
                      KDV %{product.sell_vat_rate || 0}
                    </span>
                    <span className="text-lg font-black text-blue-600 tracking-tighter">
                      ₺{(product.sell_price || 0).toFixed(2)}
                    </span>
                    <span className={`text-[9px] font-bold mt-1 ${
                      (product.stock_quantity || 0) <= (product.critical_stock_level || 0) 
                        ? 'text-red-500' 
                        : 'text-slate-400'
                    }`}>
                      STOK: {product.stock_quantity || 0}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ------------------- SAĞ KOLON: Sepet ve Müşteri ------------------- */}
      <div className="w-[320px] shrink-0 flex flex-col gap-3 overflow-hidden">
        <div className="bg-white rounded-[2.5rem] flex-1 flex flex-col border border-slate-200 shadow-sm overflow-hidden">
          
          {/* Müşteri Seçimi */}
          <div className="p-4 bg-slate-50 border-b border-slate-100">
            <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <select 
                value={selectedCustomer} 
                onChange={e => setSelectedCustomer(e.target.value)} 
                className="w-full p-3 pl-9 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors cursor-pointer appearance-none"
                >
                <option value="">PEŞİN / PERAKENDE MÜŞTERİ</option>
                {customers.map(c => (
                    <option key={c.id} value={c.id}>
                    {c.name.toUpperCase()} {c.type === 'wholesale' ? '(TOPTAN)' : ''}
                    </option>
                ))}
                </select>
            </div>
          </div>
          
          {/* Sepet Listesi */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {cart.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-30">
                    <BoxIcon size={32} className="mb-2"/>
                    <span className="text-[10px] font-black uppercase">Sepet Boş</span>
                </div>
            )}
            {cart.map(item => (
              <div 
                key={item.id} 
                className="p-4 bg-white rounded-2xl flex flex-col gap-1 border border-slate-100 relative group hover:bg-slate-50 transition-all hover:shadow-sm"
              >
                <span className="text-[10px] font-bold text-slate-800 uppercase pr-8 line-clamp-2 leading-tight">
                  {item.name}
                </span>
                
                {/* Stok Aşımı Uyarısı */}
                {(item.stock_quantity !== undefined && item.quantity > item.stock_quantity) && (
                     <div className="flex items-center gap-1 text-[9px] font-bold text-orange-500 mb-1">
                        <AlertCircle size={10} />
                        <span>Stok Yetersiz ({item.stock_quantity})</span>
                     </div>
                )}

                <div className="flex justify-between items-end mt-1">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-blue-500 uppercase tracking-tighter">
                      {item.quantity} ADET x ₺{(item.sell_price || 0).toFixed(2)}
                    </span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">
                      KDV %{item.vat_rate || 0}
                    </span>
                  </div>
                  <span className="text-sm font-black text-slate-900 tracking-tighter">
                    ₺{((item.sell_price || 0) * item.quantity).toFixed(2)}
                  </span>
                </div>
                <button 
                  onClick={() => removeFromCart(item.id)} 
                  className="absolute top-3 right-3 text-slate-200 hover:text-red-500 transition-colors p-1"
                >
                  <Trash2 size={16}/>
                </button>
              </div>
            ))}
          </div>
          
          {/* Sepet Özeti ve Butonlar */}
          <div className="p-6 bg-white border-t-2 border-slate-100 z-10">
            <div className="space-y-1.5 mb-6">
              <div className="flex justify-between text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                <span>Ara Toplam</span>
                <span>₺{totals.subTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                <span>KDV Toplam</span>
                <span>₺{totals.totalVat.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                <span className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em]">
                  Genel Toplam
                </span>
                <span className="text-3xl font-black text-blue-600 tracking-tighter">
                  ₺{totals.total.toFixed(2)}
                </span>
              </div>
            </div>
            
            <div className="flex gap-2">
                {cart.length > 0 && (
                    <button 
                        onClick={() => setCart([])}
                        className="w-14 h-14 flex items-center justify-center bg-red-50 text-red-500 rounded-[1.2rem] hover:bg-red-500 hover:text-white transition-all active:scale-95"
                    >
                        <Trash2 size={20} />
                    </button>
                )}
                <button 
                disabled={cart.length === 0} 
                onClick={() => setIsPaymentModalOpen(true)}
                className="flex-1 py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] hover:bg-black transition-all shadow-2xl active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                >
                ÖDEMEYE GEÇ
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}