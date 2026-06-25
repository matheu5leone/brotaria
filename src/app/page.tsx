'use client';

import { useAuth } from '@/hooks/useAuth';
import Garden from '@/components/Garden';
import { AppShell } from '@/components/AppShell';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Image from 'next/image';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
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
    <AppShell scrollable={false}>
      {user ? <Garden /> : null}
    </AppShell>
  );
}
