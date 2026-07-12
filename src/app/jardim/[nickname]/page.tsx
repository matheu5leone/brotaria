'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import NavLink from '@/components/NavLink';
import { Sprout } from 'lucide-react';
import { GardenView } from '@/components/GardenView';
import Garden from '@/components/Garden';
import { AppShell } from '@/components/AppShell';
import { LikeButton } from '@/components/LikeButton';
import { AvatarCircle } from '@/components/AvatarCircle';
import { HeartAura } from '@/components/HeartAura';
import { PlantsGridModal } from '@/components/PlantsGridModal';
import { useAuth } from '@/hooks/useAuth';
import { usePots } from '@/hooks/useGardenData';

/**
 * Modo visitante: botão "Ver plantas" (canto inferior esquerdo) que abre o mesmo
 * grid de plantas (raridade + lupa) do dono, só exibição (sem clique no card).
 */
function VisitorPlantsButton({ userId, nickname }: { userId: string; nickname: string }) {
  const { data: pots = [] } = usePots(userId);
  const plantIds = pots.filter((p) => p.plant_id).map((p) => p.plant_id as string);
  const [open, setOpen] = useState(false);

  if (plantIds.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all hover:brightness-110 active:scale-95"
        style={{
          fontFamily: 'var(--font-display)',
          background: 'linear-gradient(135deg, #2a5a1e, #1e4014)',
          color: '#d9f0c8',
          border: '1px solid rgba(74,222,128,0.25)',
          boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
        }}
        title={`Ver as plantas de @${nickname}`}
      >
        <Sprout className="w-3.5 h-3.5" />
        Ver plantas
      </button>
      <PlantsGridModal
        open={open}
        plantIds={plantIds}
        onClose={() => setOpen(false)}
        title={`Plantas de @${nickname}`}
      />
    </>
  );
}

/**
 * Painel do canto superior esquerdo no modo visitante: foto do dono (50% maior,
 * pode exceder o painel), apelido + tag de visita na MESMA linha, e a curtida.
 * Ao curtir, um coração sobe da foto com partículas ao redor da moldura.
 */
function VisitorPanel({
  avatarUrl, initial, ownerId, nickname, showVisitTag = false,
}: {
  avatarUrl: string | null;
  initial?: string;
  ownerId: string;
  nickname: string;
  showVisitTag?: boolean;
}) {
  const [aura, setAura] = useState(0);
  return (
    <div
      className="absolute top-3 left-3 z-20 flex items-center gap-2 pl-1.5 pr-1 py-1 rounded-2xl max-w-[calc(100vw-24px)]"
      style={{
        background: 'rgba(8,14,5,0.72)',
        border: '1px solid rgba(92,58,30,0.4)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
        backdropFilter: 'blur(6px)',
        overflow: 'visible',
      }}
    >
      {/* Foto 50% maior (excede o painel, de propósito) + aura de corações */}
      <div className="relative flex-shrink-0" style={{ marginTop: -8, marginBottom: -8 }}>
        <AvatarCircle url={avatarUrl} initial={initial} size={51} ring />
        <HeartAura burstId={aura} />
      </div>

      {/* Apelido + tag de visita, na mesma linha (evita colisão no portrait) */}
      <div className="min-w-0 flex items-baseline gap-1.5">
        <span className="text-sm font-black truncate" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-light)' }}>
          @{nickname}
        </span>
        {showVisitTag && (
          <span className="text-[10px] font-bold whitespace-nowrap" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-display)' }}>
            · modo visita
          </span>
        )}
      </div>

      <LikeButton ownerId={ownerId} embedded onLiked={() => setAura((a) => a + 1)} />
    </div>
  );
}

type VisitedUser = {
  id: string;
  nickname: string;
  avatar_url: string | null;
};

export default function GardenVisitPage() {
  const { nickname } = useParams<{ nickname: string }>();
  const { user, isLoading: authLoading } = useAuth();

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

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--color-garden-deep)' }}>
        <div className="animate-pulse flex flex-col items-center gap-4">
          <Image src="/imgs/brotaria.webp" alt="Brotaria" width={48} height={48} className="opacity-50" />
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

  // ── Dono visitando o próprio jardim → jardim EDITÁVEL (é o "lar" dele) ────────
  if (user && user.id === visitedUser.id) {
    return (
      <AppShell scrollable={false}>
        <Garden />
      </AppShell>
    );
  }

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
            <Image src="/imgs/brotaria.webp" alt="Brotaria" width={24} height={24} />
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
        <div className="flex-1 min-h-0 relative">
          <VisitorPanel avatarUrl={visitedUser.avatar_url} initial={visitedUser.nickname?.[0]} ownerId={visitedUser.id} nickname={visitedUser.nickname} />
          <GardenView userId={visitedUser.id} />
          <VisitorPlantsButton userId={visitedUser.id} nickname={visitedUser.nickname} />
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
        {/* Foto + apelido + "modo visita" + curtir — tudo no canto superior esquerdo */}
        <VisitorPanel avatarUrl={visitedUser.avatar_url} initial={visitedUser.nickname?.[0]} ownerId={visitedUser.id} nickname={visitedUser.nickname} showVisitTag />

        <GardenView userId={visitedUser.id} />
        <VisitorPlantsButton userId={visitedUser.id} nickname={visitedUser.nickname} />
      </div>
    </AppShell>
  );
}
