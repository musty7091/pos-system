'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Loader2, LogIn, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (data.user) {
        // Giriş başarılı, dashboard'a yönlendir
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: any) {
      setError('Giriş başarısız: E-posta veya şifre hatalı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 p-10 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center mb-10">
          <div className="p-4 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20 mb-4 text-white">
            <LogIn size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Hoş Geldiniz</h1>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mt-2">Panelinize Erişmek İçin Giriş Yapın</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">E-posta Adresi</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                required 
                type="email" 
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-medium" 
                placeholder="mail@ornek.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Şifre</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                required 
                type="password" 
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 focus:bg-white transition-all text-sm font-medium" 
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold uppercase rounded-xl text-center tracking-tighter">
              {error}
            </div>
          )}

          <button 
            disabled={loading} 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'GİRİŞ YAP'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400 font-medium">
            Hesabınız yok mu? <a href="/signup" className="text-blue-600 font-bold hover:underline">Şimdi Kayıt Ol</a>
          </p>
        </div>
      </div>
    </div>
  );
}