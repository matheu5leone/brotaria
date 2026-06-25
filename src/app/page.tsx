'use client';

import { useAuth } from '@/hooks/useAuth';
import Garden from '@/components/Garden';
import Sidebar from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
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
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--color-garden-deep)' }}>
        <div className="animate-pulse flex flex-col items-center gap-4">
          <Image src="/imgs/brotaria.png" alt="Logo" width={60} height={60} className="opacity-50" />
          <div className="font-medium" style={{ color: 'var(--color-text-muted)' }}>Carregando Brotaria...</div>
        </div>
      </div>
    );
  }

  return (
    /*
     * Mobile  (< md): flex-col — garden cresce, BottomNav fica embaixo
     * Desktop (≥ md): flex-row — Sidebar à esquerda, garden ocupa o resto
     * h-[100dvh] usa a altura dinâmica da viewport (desconta barra do browser)
     */
    <div
      className="flex flex-col md:flex-row overflow-hidden"
      style={{ height: '100dvh', background: 'var(--color-garden-deep)' }}
    >
      {/* Sidebar — somente desktop */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Garden — flex-1 preenche o espaço disponível */}
      <main className="flex-1 min-h-0 overflow-hidden">
        {user ? <Garden /> : null}
      </main>

      {/* Bottom nav — somente mobile */}
      <div className="flex-shrink-0 md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
