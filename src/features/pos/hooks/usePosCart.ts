// src/features/pos/hooks/usePosCart.ts
import { useState, useEffect, useMemo, useCallback } from 'react';
import { PosCartItem, PosTotals } from '../types';
import { Product } from '@/types';
import { CART_STORAGE_KEY } from '../constants';
import { toast } from 'sonner';

export function usePosCart() {
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. LocalStorage'dan yükle
  useEffect(() => {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (saved) {
      try {
        setCart(JSON.parse(saved));
      } catch (e) {
        console.error('Sepet yüklenemedi', e);
      }
    }
    setIsLoaded(true);
  }, []);

  // 2. Değişiklikleri kaydet
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    }
  }, [cart, isLoaded]);

  // Toplam Hesaplamaları
  const totals: PosTotals = useMemo(() => {
    let total = 0;
    let totalVat = 0;

    cart.forEach(item => {
      const lineTotal = item.sell_price * item.quantity;
      // KDV Dahil fiyattan KDV hariç fiyatı bulma: Fiyat / (1 + Oran/100)
      const vatAmount = lineTotal - (lineTotal / (1 + item.vat_rate / 100));
      
      total += lineTotal;
      totalVat += vatAmount;
    });

    return {
      total,
      totalVat,
      subTotal: total - totalVat
    };
  }, [cart]);

  // Aksiyonlar
  const addToCart = useCallback((product: Product, quantity: number = 1, priceOverride?: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      
      if (existing) {
        // Ürün zaten varsa miktarını artır
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + quantity } 
            : item
        );
      }

      // Yeni ürün ekle
      return [...prev, {
        id: product.id,
        name: product.name,
        barcode: product.barcode,
        sell_price: priceOverride ?? product.sell_price,
        quantity: quantity,
        vat_rate: product.sell_vat_rate,
        stock_quantity: product.stock_quantity
      }];
    });
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setCart(prev => prev.map(item => item.id === id ? { ...item, quantity } : item));
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setCart([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  }, []);

  return {
    cart,
    totals,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart
  };
}