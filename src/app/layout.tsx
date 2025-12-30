import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
// EKLENDİ: Sonner kütüphanesini dahil et
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'POS System',
  description: 'Modern Satış ve Stok Yönetimi',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className={inter.className}>
        {children}
        {/* Bildirim balonlarını yönetecek bileşen burada olmalı */}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}