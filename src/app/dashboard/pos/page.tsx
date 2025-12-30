// src/app/dashboard/pos/page.tsx
'use client';

import React from 'react';
import { PosProvider } from '@/features/pos/context/PosContext';
import PosLayout from '@/features/pos/components/PosLayout';

export default function PosPage() {
  return (
    <PosProvider>
      <PosLayout />
    </PosProvider>
  );
}