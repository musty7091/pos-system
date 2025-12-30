import { redirect } from 'next/navigation';

export default function RootPage() {
  // Kullanıcı ana adrese (/) geldiğinde onu login sayfasına yönlendirir.
  redirect('/login');
}