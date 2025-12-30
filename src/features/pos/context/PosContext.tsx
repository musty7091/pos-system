// src/features/pos/context/PosContext.tsx
'use client';

import React, { createContext, useContext, ReactNode, useState } from 'react';
import { PosContextType, PaymentMethodType } from '../types';
import { usePosCart } from '../hooks/usePosCart';
import { usePosProducts } from '../hooks/usePosProducts';
import { usePosTransaction } from '../hooks/usePosTransaction';

const PosContext = createContext<PosContextType | null>(null);

export function PosProvider({ children }: { children: ReactNode }) {
  const cartLogic = usePosCart();
  const productLogic = usePosProducts();
  const transactionLogic = usePosTransaction();
  const [selectedCustomer, setSelectedCustomer] = useState('');

  // GÜNCELLEME: onSuccess parametresini alıp işlem bitince çağırıyoruz
  const handleCompleteSale = (method: PaymentMethodType, onSuccess?: () => void) => {
    transactionLogic.processSale(
      cartLogic.cart,
      selectedCustomer,
      method,
      () => {
        // 1. Context Temizliği (Veriler)
        cartLogic.clearCart();
        setSelectedCustomer('');
        productLogic.refreshProducts(); // Stoklar değiştiği için yenile
        
        // 2. UI Temizliği (Modal kapatma vs.)
        if (onSuccess) onSuccess();
      }
    );
  };

  const value: PosContextType = {
    // Cart
    cart: cartLogic.cart,
    totals: cartLogic.totals,
    addToCart: cartLogic.addToCart,
    removeFromCart: cartLogic.removeFromCart,
    clearCart: cartLogic.clearCart,
    updateQuantity: cartLogic.updateQuantity,

    // Products
    products: productLogic.products,
    displayedProducts: productLogic.displayedProducts,
    customers: productLogic.customers,
    isLoading: productLogic.isLoading,
    isSearching: productLogic.isSearching,
    searchProducts: productLogic.searchProducts,
    findProductByBarcode: productLogic.findProductByBarcode,

    // Transaction & Customer State
    selectedCustomer,
    selectCustomer: setSelectedCustomer,
    processSale: handleCompleteSale,
    isProcessing: transactionLogic.isProcessing
  };

  return (
    <PosContext.Provider value={value}>
      {children}
    </PosContext.Provider>
  );
}

export function usePos() {
  const context = useContext(PosContext);
  if (!context) {
    throw new Error('usePos must be used within a PosProvider');
  }
  return context;
}