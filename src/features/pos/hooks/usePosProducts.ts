// src/features/pos/hooks/usePosProducts.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Product, Customer } from '@/types';
import { toast } from 'sonner';

export function usePosProducts() {
  const [products, setProducts] = useState<Product[]>([]); // Hızlı ürünler (Cache gibi)
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // İlk Yükleme
  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Hızlı Ürünleri ve Barkodlarını Çek
      const { data: prodData, error: prodError } = await supabase
        .from('products')
        .select('*, product_barcodes(*)')
        .eq('is_active', true)
        .order('name')
        .limit(50);
      
      if (prodError) throw prodError;

      // 2. Müşterileri Çek
      const { data: custData, error: custError } = await supabase
        .from('customers')
        .select('*')
        .order('name');

      if (custError) throw custError;

      const safeProducts = (prodData as Product[]) || [];
      setProducts(safeProducts);
      setDisplayedProducts(safeProducts);
      setCustomers((custData as Customer[]) || []);

    } catch (error: any) {
      console.error('Veri çekme hatası:', error);
      toast.error('Veriler yüklenirken hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Arama Fonksiyonu
  const searchProducts = useCallback((term: string) => {
    if (!term.trim()) {
      setDisplayedProducts(products); // Arama yoksa hızlı ürünleri göster
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    setIsSearching(true);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from('products')
          .select('*, product_barcodes(*)')
          .eq('is_active', true)
          .ilike('name', `%${term}%`)
          .limit(30);

        setDisplayedProducts((data as Product[]) || []);
      } catch (error) {
        console.error('Arama hatası:', error);
      } finally {
        setIsSearching(false);
      }
    }, 400); // Debounce süresi
  }, [products]);

  // Barkod ile Ürün Bulma (Scanner İçin Kritik)
  const findProductByBarcode = async (barcode: string): Promise<{ product: Product; multiplier: number } | null> => {
    // 1. Önce hafızadaki (products) hızlı ürünlere bak
    for (const p of products) {
      if (p.barcode === barcode) return { product: p, multiplier: 1 };
      
      const subBarcode = p.product_barcodes?.find(b => b.barcode === barcode);
      if (subBarcode) return { product: p, multiplier: subBarcode.quantity_multiplier };
    }

    // 2. Yoksa Veritabanına sor (product_barcodes tablosu)
    const { data: barcodeData } = await supabase
      .from('product_barcodes')
      .select('quantity_multiplier, products(*, product_barcodes(*))')
      .eq('barcode', barcode)
      .single();

    if (barcodeData && barcodeData.products) {
      const prod = Array.isArray(barcodeData.products) ? barcodeData.products[0] : barcodeData.products;
      return { product: prod as Product, multiplier: barcodeData.quantity_multiplier };
    }

    // 3. Veritabanına sor (products ana tablosu)
    const { data: productData } = await supabase
      .from('products')
      .select('*, product_barcodes(*)')
      .eq('barcode', barcode)
      .single();

    if (productData) {
      return { product: productData as Product, multiplier: 1 };
    }

    return null;
  };

  return {
    products,
    displayedProducts,
    customers,
    isLoading,
    isSearching,
    searchProducts,
    findProductByBarcode,
    refreshProducts: fetchInitialData
  };
}