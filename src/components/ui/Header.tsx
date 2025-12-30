'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Header() {
  const [email, setEmail] = useState<string>('Yükleniyor...');

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setEmail(user.email);
      }
    };
    getUser();
  }, []);

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800">Hoşgeldiniz</h2>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">Aktif Kullanıcı</p>
          <p className="text-xs text-gray-500">{email}</p>
        </div>
        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
          {email[0]?.toUpperCase()}
        </div>
      </div>
    </header>
  );
}