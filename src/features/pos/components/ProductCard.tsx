// src/features/pos/components/ProductCard.tsx
import React from 'react';
import { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  onClick: (product: Product) => void;
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
  const isCriticalStock = (product.stock_quantity || 0) <= (product.critical_stock_level || 0);

  return (
    <button 
      onClick={() => onClick(product)} 
      className="bg-white p-4 border border-slate-100 rounded-[1.8rem] shadow-sm hover:border-blue-400 hover:shadow-md transition-all text-left flex flex-col justify-between min-h-[120px] active:scale-95 group relative overflow-hidden w-full"
    >
      <span className="text-slate-800 font-bold text-[11px] uppercase line-clamp-2 leading-tight group-hover:text-blue-600 z-10">
        {product.name}
      </span>
      
      {/* Stok Uyarısı (Yanıp Sönen Nokta) */}
      {isCriticalStock && (
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
          isCriticalStock ? 'text-red-500' : 'text-slate-400'
        }`}>
          STOK: {product.stock_quantity || 0}
        </span>
      </div>
    </button>
  );
}