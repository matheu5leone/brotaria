'use client';

import { useAuth } from '@/hooks/useAuth';
import Garden from '@/components/Garden';
import Sidebar from '@/components/Sidebar';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Image from 'next/image';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-100">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <Image src="/imgs/brotaria.png" alt="Logo" width={60} height={60} className="opacity-50" />
          <div className="text-stone-400 font-medium">Carregando Brotaria...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-stone-50 text-stone-900 overflow-hidden">
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-hidden">
        {user ? <Garden /> : null}
      </main>
    </div>
  );
}
