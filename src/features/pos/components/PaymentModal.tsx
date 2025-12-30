// src/features/pos/components/PaymentModal.tsx
import React from 'react';
import { X, Banknote, CreditCard, Wallet } from 'lucide-react';
import { usePos } from '../context/PosContext';
import { PaymentMethodType } from '../types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PaymentModal({ isOpen, onClose }: PaymentModalProps) {
  const { totals, processSale, isProcessing, selectedCustomer } = usePos();

  // GÜNCELLEME: İşlem başarılı olunca onClose'u tetikliyoruz
  const handlePayment = (method: PaymentMethodType) => {
    processSale(method, () => {
        onClose(); 
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in duration-200">
        
        {/* Başlık ve Toplam */}
        <div className="bg-slate-900 p-10 text-center relative">
          <span className="text-blue-400 text-[10px] font-black uppercase tracking-[0.3em]">
            Ödenecek Toplam
          </span>
          <h2 className="text-5xl font-black text-white mt-2 tracking-tighter">
            ₺{totals.total.toFixed(2)}
          </h2>
          <button 
            onClick={onClose} 
            className="absolute top-6 right-6 p-2 bg-slate-800 hover:bg-red-500 rounded-full text-white transition-all"
          >
            <X size={20}/>
          </button>
        </div>
        
        {/* Ödeme Butonları */}
        <div className="p-10 grid grid-cols-1 gap-4">
          <button 
            disabled={isProcessing} 
            onClick={() => handlePayment('cash')} 
            className="h-16 bg-green-500 hover:bg-green-600 text-white rounded-2xl flex items-center justify-center gap-4 font-black text-xs tracking-widest uppercase active:scale-95 shadow-lg disabled:opacity-50 transition-all"
          >
            <Banknote size={24}/> NAKİT ÖDEME
          </button>
          
          <button 
            disabled={isProcessing} 
            onClick={() => handlePayment('card')} 
            className="h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex items-center justify-center gap-4 font-black text-xs tracking-widest uppercase active:scale-95 shadow-lg disabled:opacity-50 transition-all"
          >
            <CreditCard size={24}/> KREDİ KARTI
          </button>
          
          <div className="relative">
             <button 
                disabled={isProcessing || !selectedCustomer} 
                onClick={() => handlePayment('on_account')} 
                className={`w-full h-16 rounded-2xl flex items-center justify-center gap-4 font-black text-xs tracking-widest uppercase transition-all disabled:opacity-50 ${
                  selectedCustomer ? 'bg-slate-900 text-white shadow-xl active:scale-95' : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                }`}
              >
                <Wallet size={24}/> VERESİYE / AÇIK HESAP
              </button>
              {!selectedCustomer && (
                <p className="text-[9px] text-center text-red-400 font-bold mt-2 absolute w-full -bottom-6">
                  * Veresiye için müşteri seçmelisiniz.
                </p>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}