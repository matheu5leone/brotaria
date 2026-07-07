'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

/**
 * Home = redirecionador. Manda o usuário logado para a URL compartilhável do
 * seu jardim (/jardim/<nickname>), que é o "lar" editável do dono e a visão de
 * visita para os outros. Sem nickname → completar perfil. Sem sessão → login.
 */
export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    let cancelled = false;
    supabase
      .from('profiles')
      .select('nickname')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.nickname) router.replace(`/jardim/${data.nickname}`);
        else router.replace('/completar-perfil');
      });
    return () => { cancelled = true; };
  }, [user, isLoading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--color-garden-deep)' }}>
      <div className="animate-pulse flex flex-col items-center gap-4">
        <Image src="/imgs/brotaria.png" alt="Logo" width={60} height={60} className="opacity-50" />
        <div className="font-medium" style={{ color: 'var(--color-text-muted)' }}>Carregando Brotaria...</div>
      </div>
    </div>
  );
}
