'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import NavLink from '@/components/NavLink';
import { GardenView } from '@/components/GardenView';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/hooks/useAuth';

type VisitedUser = {
  id: string;
  nickname: string;
  avatar_url: string | null;
};

export default function GardenVisitPage() {
  const { nickname } = useParams<{ nickname: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [visitedUser, setVisitedUser] = useState<VisitedUser | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!nickname) return;
    fetch(`/api/users/search?nickname=${encodeURIComponent(nickname)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setNotFound(true);
        else setVisitedUser(data);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [nickname]);

  // Redireciona pro próprio jardim se o usuário logado visitar @dele
  useEffect(() => {
    if (!authLoading && user && visitedUser && user.id === visitedUser.id) {
      router.replace('/');
    }
  }, [user, visitedUser, authLoading, router]);

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--color-garden-deep)' }}>
        <div className="animate-pulse flex flex-col items-center gap-4">
          <Image src="/imgs/brotaria.png" alt="Brotaria" width={48} height={48} className="opacity-50" />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-caption)' }}>
            Carregando jardim...
          </p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-5" style={{ background: 'var(--color-garden-deep)' }}>
        <p className="text-5xl">🌿</p>
        <p className="text-lg font-black" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-light)' }}>
          @{nickname} não encontrado
        </p>
        <NavLink href="/" className="text-sm font-bold hover:underline" style={{ color: 'var(--color-wood-light)' }}>
          ← Ir para o jardim
        </NavLink>
      </div>
    );
  }

  if (!visitedUser) return null;

  // ── Modo deslogado ────────────────────────────────────────────────────────────

  if (!user) {
    return (
      <div className="flex flex-col overflow-hidden" style={{ height: '100dvh', background: 'var(--color-garden-deep)' }}>
        {/* Header mínimo */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-4 py-2 z-10"
          style={{
            background: 'rgba(8,14,5,0.8)',
            borderBottom: '1px solid rgba(92,58,30,0.25)',
          }}
        >
          <div className="flex items-center gap-2">
            <Image src="/imgs/brotaria.png" alt="Brotaria" width={24} height={24} />
            <span className="text-sm font-black" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-light)' }}>
              Jardim de @{visitedUser.nickname}
            </span>
          </div>
          <NavLink
            href="/signup"
            className="px-4 py-1.5 rounded-xl font-bold text-xs transition-all active:scale-95"
            style={{
              fontFamily: 'var(--font-display)',
              background: 'linear-gradient(135deg, #2a5a1e, #1e4014)',
              color: 'var(--color-parch-light)',
              border: '1px solid rgba(201,162,39,0.3)',
            }}
          >
            ✦ Criar o seu jardim
          </NavLink>
        </div>

        {/* Garden view ocupa o resto */}
        <div className="flex-1 min-h-0">
          <GardenView userId={visitedUser.id} />
        </div>
      </div>
    );
  }

  // ── Modo logado — HUD completo, mas jardim de outro usuário (só exibição) ─────

  return (
    <AppShell scrollable={false}>
      {/* Banner de visita */}
      <div
        className="relative flex-1 min-h-0 h-full overflow-hidden"
      >
        {/* Aviso de modo visita */}
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded-full text-xs font-bold"
          style={{
            background: 'rgba(8,14,5,0.85)',
            color: 'var(--color-text-muted)',
            border: '1px solid rgba(92,58,30,0.3)',
            fontFamily: 'var(--font-display)',
            backdropFilter: 'blur(6px)',
          }}
        >
          Jardim de @{visitedUser.nickname} · modo visita
        </div>

        <GardenView userId={visitedUser.id} />
      </div>
    </AppShell>
  );
}
