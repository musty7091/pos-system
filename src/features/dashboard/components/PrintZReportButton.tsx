// src/features/dashboard/components/PrintZReportButton.tsx
import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';
import { ZReportSlip, ZReportData } from './ZReportSlip';

interface Props {
  data: ZReportData;
  variant?: 'primary' | 'icon'; // Büyük buton mu, küçük ikon mu?
}

export default function PrintZReportButton({ data, variant = 'primary' }: Props) {
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef, // v7 ve üzeri için contentRef kullanılır
    documentTitle: `Z-Raporu-${data.date}`,
  });

  return (
    <>
      {/* 1. GİZLİ FİŞ (Sadece yazdırılınca görünür) */}
      <div style={{ display: 'none' }}>
        <ZReportSlip ref={componentRef} data={data} />
      </div>

      {/* 2. GÖRÜNÜR BUTON */}
      {variant === 'primary' ? (
        <button
          onClick={() => handlePrint && handlePrint()}
          className="p-3 bg-slate-800 text-white rounded-xl hover:bg-black transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
          title="Raporu Yazdır"
        >
          <Printer size={18} />
          <span className="text-[10px] font-black uppercase">YAZDIR</span>
        </button>
      ) : (
        <button
          onClick={() => handlePrint && handlePrint()}
          className="p-2 bg-white border border-slate-200 text-slate-500 rounded-lg hover:text-blue-600 hover:border-blue-200 transition-all active:scale-95"
          title="Fiş Çıkar"
        >
          <Printer size={14} />
        </button>
      )}
    </>
  );
}