import { createBrowserClient } from '@supabase/ssr';

// Ortam değişkenlerini kontrol et
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL ve Key bulunamadı! .env.local dosyasını kontrol et.');
}

// Client-side (Tarayıcı) için güvenli istemci
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);