'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Loader2, UserPlus, Mail, Lock, Store } from 'lucide-react';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      setLoading(false);
      return;
    }

    try {
      // 1. Supabase Auth ile kullanıcı oluştur
      // Verileri 'options' içine koyuyoruz, SQL Trigger bunu okuyup kaydedecek.
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: shopName,
            store_name: shopName,
          },
        },
      });

      if (authError) throw authError;

      // 2. Başarılı işlem
      if (authData.user) {
        if (!authData.session) {
          alert('Kayıt başarılı! Lütfen e-posta adresinize gelen onay linkine tıklayın.');
        } else {
          router.push('/');
        }
      }

    } catch (err: any) {
      console.error('Kayıt hatası:', err);
      setError(err.message || 'Kayıt sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 p-10">
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20 mb-4 text-white">
            <UserPlus size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Yeni Hesap Oluştur</h1>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.2em] mt-2 text-center">
            DÜKKANINIZI HEMEN KURUN
          </p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-5">
          {/* Dükkan Adı */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Dükkan / İşletme Adı</label>
            <div className="relative">
              <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                required 
                type="text" 
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-medium text-slate-700" 
                placeholder="Örn: Mert Market" 
                value={shopName} 
                onChange={(e) => setShopName(e.target.value)} 
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">E-posta Adresi</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                required 
                type="email" 
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-medium text-slate-700" 
                placeholder="mail@ornek.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
              />
            </div>
          </div>

          {/* Şifre */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Şifre</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                required 
                type="password" 
                minLength={6} 
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-medium text-slate-700" 
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-[11px] font-bold uppercase rounded-xl text-center">
              {error}
            </div>
          )}

          <button 
            disabled={loading} 
            type="submit" 
            className={`w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? <Loader2 className="animate-spin" /> : 'KAYDI TAMAMLA'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400 font-medium">
            Zaten hesabınız var mı? <a href="/login" className="text-blue-600 font-bold hover:underline">Giriş Yap</a>
          </p>
        </div>
      </div>
    </div>
  );
}