// src/features/pos/types/index.ts
import { Product, Customer } from '@/types';

export interface PosCartItem {
  id: string;
  name: string;
  barcode?: string;
  sell_price: number;
  quantity: number;
  vat_rate: number;
  stock_quantity?: number;
}

export type PaymentMethodType = 'cash' | 'card' | 'on_account';

export interface PosTotals {
  total: number;
  totalVat: number;
  subTotal: number;
}

export interface PosContextType {
  // Cart
  cart: PosCartItem[];
  totals: PosTotals;
  addToCart: (product: Product, quantity?: number, price?: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  updateQuantity: (id: string, quantity: number) => void;

  // Products
  products: Product[];
  displayedProducts: Product[];
  customers: Customer[];
  isLoading: boolean;
  isSearching: boolean;
  searchProducts: (term: string) => void;
  findProductByBarcode: (barcode: string) => Promise<{ product: Product; multiplier: number } | null>;

  // Transaction
  selectedCustomer: string;
  selectCustomer: (id: string) => void;
  // GÜNCELLEME: onSuccess parametresi eklendi
  processSale: (method: PaymentMethodType, onSuccess?: () => void) => void;
  isProcessing: boolean;
}