// src/features/pos/components/NumpadPanel.tsx
import React from 'react';
import { RotateCcw, Delete, Hash } from 'lucide-react';
import { useNumpad } from '../hooks/useNumpad';

export default function NumpadPanel() {
  const { 
    manualInput, 
    multiplier, 
    handleNumpadPress, 
    handleSetMultiplier, 
    handleBarcodeSubmit 
  } = useNumpad();

  const numpadNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-200 h-full flex flex-col">
      {/* Ekran */}
      <div className="bg-slate-900 rounded-2xl p-4 mb-4 flex flex-col justify-center items-end h-28 border border-slate-800 shadow-inner relative overflow-hidden">
        {/* Çarpan Göstergesi (Varsa) */}
        {multiplier > 1 && (
            <div className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded-md animate-pulse">
                x{multiplier} Modu
            </div>
        )}
        
        <span className="text-blue-400 text-[9px] font-bold uppercase self-start tracking-widest mt-4">
          Giriş Paneli
        </span>
        <span className="text-3xl font-mono font-bold text-white tracking-widest">
          {manualInput || (multiplier > 1 ? '' : '0')}
        </span>
      </div>
      
      {/* Tuşlar */}
      <div className="grid grid-cols-3 gap-2 flex-1 content-start">
        {numpadNumbers.map(n => (
          <button 
            key={n} 
            onClick={() => handleNumpadPress(n.toString())} 
            className="bg-slate-50 border border-slate-100 rounded-xl text-xl font-bold text-slate-700 hover:border-blue-500 hover:text-blue-600 transition-all active:scale-95 h-14"
          >
            {n}
          </button>
        ))}
        
        {/* Sıfırla (C) */}
        <button 
          onClick={() => handleNumpadPress('C')} 
          className="bg-red-50 text-red-600 border border-red-100 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-red-100 active:scale-95"
        >
           <RotateCcw size={16} /> 
           <span className="text-[8px] font-black uppercase tracking-tighter">SIFIRLA</span>
        </button>
        
        {/* 0 */}
        <button 
          onClick={() => handleNumpadPress('0')} 
          className="bg-slate-50 border border-slate-100 rounded-xl text-xl font-bold text-slate-700 active:scale-95"
        >
          0
        </button>
        
        {/* Sil (Backspace) */}
        <button 
          onClick={() => handleNumpadPress('back')} 
          className="bg-orange-50 text-orange-500 border border-orange-100 rounded-xl flex items-center justify-center active:scale-95 hover:bg-orange-100"
        >
          <Delete size={20}/>
        </button>
        
        {/* Aksiyon Tuşları */}
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
  );
}