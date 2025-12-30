// src/features/pos/components/PosLayout.tsx
import React from 'react';
import NumpadPanel from './NumpadPanel';
import ProductList from './ProductList';
import CartPanel from './CartPanel';

export default function PosLayout() {
  return (
    <div className="flex h-[calc(100vh-64px)] bg-[#F1F5F9] p-3 gap-3 overflow-hidden font-sans">
      {/* 1. Sol Kolon: Numpad (280px) */}
      <div className="w-[280px] shrink-0">
        <NumpadPanel />
      </div>

      {/* 2. Orta Kolon: Ürün Listesi (Esnek) */}
      <ProductList />

      {/* 3. Sağ Kolon: Sepet (320px) */}
      <CartPanel />
    </div>
  );
}