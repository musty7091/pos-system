// src/features/pos/hooks/usePosTransaction.ts
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PaymentMethodType, PosCartItem } from '../types';
import { toast } from 'sonner';

export function usePosTransaction() {
  const [isProcessing, setIsProcessing] = useState(false);

  const processSale = async (
    cart: PosCartItem[], 
    customerId: string | null, 
    paymentMethod: PaymentMethodType,
    onSuccess: () => void
  ) => {
    if (cart.length === 0) return;

    setIsProcessing(true);
    const loadingToast = toast.loading('Satış işleniyor...');

    try {
      const rpcParams = {
        p_customer_id: customerId || null,
        p_payment_method: paymentMethod,
        p_items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity
        }))
      };

      const { error } = await supabase.rpc('create_sale_transaction', rpcParams);

      if (error) throw error;

      toast.dismiss(loadingToast);
      toast.success('Satış Başarıyla Tamamlandı 🎉', {
        duration: 4000,
        style: { background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }
      });

      onSuccess(); // Sepeti temizle, modalı kapat vs.

    } catch (error: any) {
      console.error('Satış hatası:', error);
      toast.dismiss(loadingToast);
      toast.error('Satış tamamlanamadı: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    processSale,
    isProcessing
  };
}