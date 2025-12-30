// src/features/pos/components/CartItem.tsx
import React from 'react';
import { Trash2, AlertCircle } from 'lucide-react';
import { PosCartItem } from '../types';

interface CartItemProps {
  item: PosCartItem;
  onRemove: (id: string) => void;
}

export default function CartItem({ item, onRemove }: CartItemProps) {
  const isStockInsufficient = item.stock_quantity !== undefined && item.quantity > item.stock_quantity;
  const lineTotal = item.sell_price * item.quantity;

  return (
    <div className="p-4 bg-white rounded-2xl flex flex-col gap-1 border border-slate-100 relative group hover:bg-slate-50 transition-all hover:shadow-sm animate-in slide-in-from-right-2 duration-200">
      <span className="text-[10px] font-bold text-slate-800 uppercase pr-8 line-clamp-2 leading-tight">
        {item.name}
      </span>
      
      {/* Stok Uyarısı */}
      {isStockInsufficient && (
           <div className="flex items-center gap-1 text-[9px] font-bold text-orange-500 mb-1">
              <AlertCircle size={10} />
              <span>Stok Yetersiz ({item.stock_quantity})</span>
           </div>
      )}

      <div className="flex justify-between items-end mt-1">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold text-blue-500 uppercase tracking-tighter">
            {item.quantity} ADET x ₺{item.sell_price.toFixed(2)}
          </span>
          <span className="text-[8px] font-bold text-slate-400 uppercase">
            KDV %{item.vat_rate}
          </span>
        </div>
        <span className="text-sm font-black text-slate-900 tracking-tighter">
          ₺{lineTotal.toFixed(2)}
        </span>
      </div>
      
      <button 
        onClick={() => onRemove(item.id)} 
        className="absolute top-3 right-3 text-slate-200 hover:text-red-500 transition-colors p-1"
      >
        <Trash2 size={16}/>
      </button>
    </div>
  );
}