// src/features/dashboard/hooks/useDashboardStats.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface DashboardStats {
  totalSales: number;      // Toplam Ciro
  totalOrders: number;     // Toplam Sipariş Sayısı
  totalCustomers: number;  // Toplam Müşteri
  lowStockCount: number;   // Kritik Stoktaki Ürün Sayısı
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    totalOrders: 0,
    totalCustomers: 0,
    lowStockCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        setIsLoading(true);

        // 1. Satış Verileri (sale_transactions tablosundan)
        // Not: Eğer tablo adın farklıysa ('sales' vs.) burayı güncellemelisin.
        const { data: salesData, error: salesError } = await supabase
          .from('sale_transactions')
          .select('final_amount');
        
        if (salesError) throw salesError;

        const totalSales = salesData?.reduce((acc, curr) => acc + (curr.final_amount || 0), 0) || 0;
        const totalOrders = salesData?.length || 0;

        // 2. Müşteri Sayısı
        const { count: customerCount, error: customerError } = await supabase
          .from('customers')
          .select('*', { count: 'exact', head: true }); // Sadece sayıyı al

        if (customerError) throw customerError;

        // 3. Kritik Stok (Ürünler)
        // Stok miktarı, kritik seviyeden az veya eşit olanları say
        const { count: lowStock, error: productError } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .lte('stock_quantity', 5); // Örnek: 5 ve altı (veya kendi mantığına göre critical_stock_level sütununu kullanabilirsin)
          
        /* GELİŞMİŞ VERSİYON (Eğer critical_stock_level sütunun varsa bunu kullan):
           Burada basit filtreleme yetmez, tüm ürünleri çekip JS ile filtrelemek gerekebilir 
           veya RPC yazmak gerekebilir. Şimdilik basitçe '5' altı diyoruz.
        */

        if (productError) throw productError;

        setStats({
          totalSales,
          totalOrders,
          totalCustomers: customerCount || 0,
          lowStockCount: lowStock || 0,
        });

      } catch (error) {
        console.error('Dashboard verileri çekilemedi:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, []);

  return { stats, isLoading };
}