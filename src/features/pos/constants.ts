// src/features/pos/constants.ts

export const TAX_RATES = [0, 5, 10, 16, 20]; // Özel matrah (Special Tax Base) mantığını ayrı işleyeceğiz
export const DEFAULT_TAX_RATE = 20;

export const POS_MESSAGES = {
  CART_EMPTY: 'Sepet Boş',
  STOCK_ERROR: 'Stok Yetersiz',
  BARCODE_NOT_FOUND: 'Barkod Bulunamadı!',
  SALE_SUCCESS: 'Satış Başarıyla Tamamlandı 🎉',
  SALE_ERROR: 'Satış Hatası'
};

export const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  ON_ACCOUNT: 'on_account'
} as const;

export const CART_STORAGE_KEY = 'pos_cart_backup_v2'; // v2 dedik ki eski sepetle karışmasın