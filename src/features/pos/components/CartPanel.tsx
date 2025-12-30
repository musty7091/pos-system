// src/features/pos/components/CartPanel.tsx
import React, { useState } from 'react';
import { User, Trash2, Box as BoxIcon } from 'lucide-react';
import { usePos } from '../context/PosContext';
import CartItem from './CartItem';
import PaymentModal from './PaymentModal';

export default function CartPanel() {
  const { 
    cart, 
    customers, 
    selectedCustomer, 
    selectCustomer, 
    totals, 
    removeFromCart, 
    clearCart 
  } = usePos();

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const handlePaymentSuccess = () => {
      setIsPaymentOpen(false); // Modal'ı kapat (Context zaten sepeti temizliyor)
  };

  return (
    <div className="w-[320px] shrink-0 flex flex-col gap-3 overflow-hidden h-full">
      <div className="bg-white rounded-[2.5rem] flex-1 flex flex-col border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Müşteri Seçimi */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 shrink-0">
          <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
              <select 
                value={selectedCustomer} 
                onChange={e => selectCustomer(e.target.value)} 
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
            <CartItem key={item.id} item={item} onRemove={removeFromCart} />
          ))}
        </div>
        
        {/* Alt Bilgi ve Ödeme */}
        <div className="p-6 bg-white border-t-2 border-slate-100 z-10 shrink-0">
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
                      onClick={clearCart}
                      className="w-14 h-14 flex items-center justify-center bg-red-50 text-red-500 rounded-[1.2rem] hover:bg-red-500 hover:text-white transition-all active:scale-95"
                  >
                      <Trash2 size={20} />
                  </button>
              )}
              <button 
                disabled={cart.length === 0} 
                onClick={() => setIsPaymentOpen(true)}
                className="flex-1 py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] hover:bg-black transition-all shadow-2xl active:scale-95 disabled:opacity-50 disabled:active:scale-100"
              >
                ÖDEMEYE GEÇ
              </button>
          </div>
        </div>
      </div>

      <PaymentModal 
        isOpen={isPaymentOpen} 
        onClose={() => setIsPaymentOpen(false)} 
      />
    </div>
  );
}