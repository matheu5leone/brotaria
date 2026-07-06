'use client';

import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLikes, useToggleLike } from '@/hooks/useLikes';

/**
 * Botão de curtida do jardim visitado. Mostra o total (votos anônimos) e
 * alterna a curtida do usuário logado (1 por jardim). Deslogado → manda logar.
 */
export function LikeButton({ ownerId }: { ownerId: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const { data } = useLikes(ownerId);
  const toggle = useToggleLike(ownerId);

  const liked = data?.liked ?? false;
  const total = data?.total ?? 0;

  const onClick = () => {
    if (!user) { router.push('/login'); return; }
    if (toggle.isPending) return;
    toggle.mutate();
  };

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-sm transition-all hover:brightness-110 active:scale-95"
      style={{
        fontFamily: 'var(--font-display)',
        background: 'rgba(8,14,5,0.72)',
        color: liked ? '#f87171' : 'var(--color-text-light)',
        border: `1px solid ${liked ? 'rgba(248,113,113,0.5)' : 'rgba(92,58,30,0.4)'}`,
        boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
        backdropFilter: 'blur(6px)',
      }}
      title={user ? (liked ? 'Remover curtida' : 'Curtir este jardim') : 'Entre para curtir'}
    >
      <Heart
        className="w-4 h-4"
        style={{ fill: liked ? '#f87171' : 'transparent', color: liked ? '#f87171' : 'currentColor' }}
      />
      {total}
    </button>
  );
}
