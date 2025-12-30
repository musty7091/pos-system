// src/features/dashboard/components/ZReportSlip.tsx
import React, { forwardRef } from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export interface ZReportData {
  title: string;
  date: string;
  totalSales: number;
  cashTotal: number;
  cardTotal: number;
  creditTotal: number;
  profitTotal: number;
  transactionCount: number;
  isOfficial: boolean; // Z Raporu mu (Resmi) yoksa Anlık X Raporu mu (Bilgi)
}

interface Props {
  data: ZReportData;
}

export const ZReportSlip = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  return (
    <div ref={ref} className="w-[80mm] p-4 bg-white text-black font-mono text-[10px] leading-tight">
      {/* BAŞLIK */}
      <div className="text-center mb-4 border-b border-black pb-2 border-dashed">
        <h1 className="text-sm font-black uppercase">MY POS SYSTEM</h1>
        <p className="mt-1">Gün Sonu Raporu</p>
        <p className="mt-1">{format(new Date(data.date), 'dd.MM.yyyy HH:mm', { locale: tr })}</p>
        <h2 className="text-xs font-black mt-2 border-2 border-black inline-block px-2 py-0.5">
          {data.title}
        </h2>
      </div>

      {/* ÖZET TABLO */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between font-bold text-xs">
          <span>TOPLAM CİRO:</span>
          <span>₺{data.totalSales.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>İşlem Adedi:</span>
          <span>{data.transactionCount}</span>
        </div>
      </div>

      {/* DAĞILIM */}
      <div className="mb-4 border-y border-black border-dashed py-2 space-y-1">
        <div className="flex justify-between">
          <span>Nakit Toplam:</span>
          <span>₺{data.cashTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Kredi Kartı:</span>
          <span>₺{data.cardTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Veresiye/Cari:</span>
          <span>₺{data.creditTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* KÂR BİLGİSİ (Sadece İşletme Sahibi İçin) */}
      <div className="mb-4 text-center">
        <div className="flex justify-between font-bold">
          <span>Tahmini Kâr:</span>
          <span>₺{data.profitTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* ALT BİLGİ */}
      <div className="text-center text-[8px] mt-6 border-t border-black pt-2">
        <p>{data.isOfficial ? '*** MALİ DEĞERİ YOKTUR ***' : '*** BİLGİ FİŞİDİR (X RAPORU) ***'}</p>
        <p className="mt-1">Sistem tarafından üretilmiştir.</p>
        <p className="mt-4">................................</p>
        <p>Kasiyer / Yetkili İmza</p>
      </div>
    </div>
  );
});

ZReportSlip.displayName = 'ZReportSlip';