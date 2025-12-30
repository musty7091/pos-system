export interface Profile {
  id: string;
  tenant_id: string;
  full_name: string | null;
  email: string | null;
  role: 'admin' | 'cashier' | 'stock_manager';
  is_super_admin: boolean;
  avatar_url?: string;
  currency: string;
  locale: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  tax_no?: string;
  tax_office?: string;
  balance: number;
  is_active: boolean;
}

export interface Customer { // Eski adı: Contact
  id: string;
  name: string;
  phone?: string;
  email?: string;
  tax_no?: string;
  tax_office?: string;
  address?: string;
  city?: string;
  district?: string;
  type: 'retail' | 'wholesale';
  balance: number;
  credit_limit: number;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
}

export interface Brand {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  barcode?: string; // Ana barkod
  
  category_id?: string;
  brand_id?: string;
  supplier_id?: string;
  
  category?: Category; // İlişkisel veri (Opsiyonel)
  brand?: Brand;       // İlişkisel veri
  supplier?: Supplier; // İlişkisel veri
  
  buy_price: number;
  buy_vat_rate: number;
  sell_price: number;
  sell_vat_rate: number;
  
  stock_quantity: number;
  critical_stock_level: number;
  max_stock_level?: number;
  unit: string;
  
  is_active: boolean;
  is_fast_product: boolean;
  
  product_barcodes?: ProductBarcode[]; // İlişki
}

export interface ProductBarcode {
  id: string;
  product_id: string;
  barcode: string;
  quantity_multiplier: number;
  description?: string;
}

export interface SaleTransaction {
  id: string;
  customer_id?: string;
  customer?: Customer; // İlişki
  
  total_amount: number;
  discount_amount: number;
  final_amount: number;
  
  payment_method: 'cash' | 'card' | 'on_account' | 'mixed';
  status: 'completed' | 'refunded' | 'cancelled';
  note?: string;
  created_at: string;
  
  sale_items?: SaleItem[]; // İlişki
}

export interface SaleItem {
  id: string;
  product_id: string;
  products?: Product; // İlişki
  
  quantity: number;
  unit_price: number;
  buy_price: number;
  vat_rate: number;
  total_price: number;
}

export interface CartItem {
  id: string;
  name: string;
  sell_price: number;
  quantity: number;
  vat_rate: number;
  stock_quantity?: number; // UI kontrolü için
}