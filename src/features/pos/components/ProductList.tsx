// src/features/pos/components/ProductList.tsx
import React, { useState } from 'react';
import { Search, Loader2, Box as BoxIcon } from 'lucide-react';
import { usePos } from '../context/PosContext';
import ProductCard from './ProductCard';
import QuantityModal from './QuantityModal';
import { Product } from '@/types';

export default function ProductList() {
  const { 
    displayedProducts, 
    isLoading, 
    searchTerm, 
    isSearching, 
    searchProducts, 
    addToCart 
  } = usePos();

  // Koli seçimi için local state
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    product: Product | null;
    boxQty: number;
  }>({ isOpen: false, product: null, boxQty: 0 });

  const handleProductClick = (product: Product) => {
    // Ürünün koli barkodu var mı kontrol et
    const boxBarcode = product.product_barcodes?.find((b) => b.quantity_multiplier > 1);

    if (boxBarcode) {
      setModalState({
        isOpen: true,
        product: product,
        boxQty: boxBarcode.quantity_multiplier
      });
    } else {
      addToCart(product, 1);
    }
  };

  const handleQuantitySelect = (qty: number) => {
    if (modalState.product) {
      addToCart(modalState.product, qty);
    }
    setModalState({ ...modalState, isOpen: false });
  };

  return (
    <div className="flex-1 flex flex-col gap-3 overflow-hidden h-full">
      {/* Arama Çubuğu */}
      <div className="flex gap-3 h-14 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          {isSearching && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" size={18} />
          )}
          <input 
            autoFocus
            value={searchTerm || ''} // Context'ten gelen değer yoksa boş string
            onChange={e => searchProducts(e.target.value)} 
            placeholder="Ürün adı, barkod veya açıklama..." 
            className="w-full h-full pl-11 pr-10 bg-white border border-slate-200 rounded-2xl outline-none font-bold text-slate-700 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-300" 
          />
        </div>
      </div>
      
      {/* Ürün Izgarası */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
        {isLoading ? (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        ) : (displayedProducts.length === 0) ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
             <BoxIcon size={48} className="opacity-20" />
             <span className="text-xs font-bold uppercase tracking-widest opacity-50">
               {searchTerm ? 'Ürün Bulunamadı' : 'Görünürde Ürün Yok...'}
             </span>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pb-20">
            {displayedProducts.map(product => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onClick={handleProductClick} 
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <QuantityModal 
        isOpen={modalState.isOpen}
        product={modalState.product}
        boxQty={modalState.boxQty}
        onSelect={handleQuantitySelect}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
      />
    </div>
  );
}