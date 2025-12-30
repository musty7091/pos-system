// src/features/pos/components/QuantityModal.tsx
import React from 'react';
import { Product } from '@/types';

interface QuantityModalProps {
  isOpen: boolean;
  product: Product | null;
  boxQty: number;
  onSelect: (multiplier: number) => void;
  onClose: () => void;
}

export default function QuantityModal({ isOpen, product, boxQty, onSelect, onClose }: QuantityModalProps) {
  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl border border-slate-100 animate-in zoom-in duration-200">
        <h3 className="text-xl font-black text-slate-800 uppercase text-center mb-2">
          {product.name}
        </h3>
        <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest mb-8">
          Miktar Seçimi
        </p>
        <div className="grid grid-cols-1 gap-4">
          <button 
            onClick={() => onSelect(1)} 
            className="h-20 bg-slate-100 hover:border-blue-500 border-2 border-transparent rounded-3xl flex flex-col items-center justify-center transition-all group"
          >
            <span className="text-xs font-black uppercase tracking-widest">TEKLİ ADET</span>
            <span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-500 uppercase">
              1 Adet Ekle
            </span>
          </button>
          
          <button 
            onClick={() => onSelect(boxQty)} 
            className="h-20 bg-blue-50 hover:bg-blue-600 border-2 border-blue-100 hover:border-blue-600 rounded-3xl flex flex-col items-center justify-center transition-all group"
          >
            <span className="text-xs font-black text-blue-600 group-hover:text-white uppercase tracking-widest">
              KOLİ PAKET
            </span>
            <span className="text-[10px] font-bold text-blue-400 group-hover:text-blue-100 uppercase">
              {boxQty} Adet Ekle
            </span>
          </button>
          
          <button 
            onClick={onClose} 
            className="mt-4 text-[10px] font-bold text-slate-300 hover:text-red-500 uppercase text-center"
          >
            İptal Et
          </button>
        </div>
      </div>
    </div>
  );
}