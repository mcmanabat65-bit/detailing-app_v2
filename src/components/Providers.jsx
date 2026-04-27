'use client';

import { usePathname } from 'next/navigation';
import { AppProvider } from '@/context/AppContext';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ToastContainer } from '@/components/Toast';

export function Providers({ children }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  return (
    <AppProvider>
      {!isAdmin && <Navbar />}
      {children}
      {!isAdmin && <Footer />}
      <ToastContainer />
    </AppProvider>
  );
}
