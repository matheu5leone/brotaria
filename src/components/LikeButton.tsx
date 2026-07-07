'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLikes, useToggleLike } from '@/hooks/useLikes';
import { HeartBurst } from '@/components/HeartBurst';

/**
 * Botão de curtida do jardim visitado. Feedback INSTANTÂNEO: a curtida é
 * otimista (muda na hora, sincroniza com o banco depois), com coração pulsando
 * e coraçõezinhos subindo. Total é anônimo. Deslogado → manda logar.
 */
export function LikeButton({ ownerId, embedded = false }: { ownerId: string; embedded?: boolean }) {
  const { user } = useAuth();
  const router = useRouter();
  const { data } = useLikes(ownerId);
  const toggle = useToggleLike(ownerId);
  const [burst, setBurst] = useState(0);

  const liked = data?.liked ?? false;
  const total = data?.total ?? 0;

  const onClick = () => {
    if (!user) { router.push('/login'); return; }
    if (!liked) setBurst((b) => b + 1); // anima só ao CURTIR (não ao descurtir)
    toggle.mutate();
  };

  // `embedded`: sem fundo/borda próprios — herda o painel do pai (modo visitante).
  const chrome = embedded
    ? { background: 'transparent', border: '1px solid transparent', boxShadow: 'none', backdropFilter: 'none' as const }
    : { background: 'rgba(8,14,5,0.72)', border: `1px solid ${liked ? 'rgba(248,113,113,0.55)' : 'rgba(92,58,30,0.4)'}`, boxShadow: '0 4px 14px rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)' };

  return (
    <button
      onClick={onClick}
      className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-sm transition-all hover:brightness-110 active:scale-95"
      style={{
        fontFamily: 'var(--font-display)',
        color: liked ? '#f87171' : 'var(--color-text-light)',
        ...chrome,
      }}
      title={user ? (liked ? 'Remover curtida' : 'Curtir este jardim') : 'Entre para curtir'}
    >
      <span key={burst} className={`inline-flex ${burst > 0 ? 'heart-pop' : ''}`}>
        <Heart
          className="w-4 h-4"
          style={{ fill: liked ? '#f87171' : 'transparent', color: liked ? '#f87171' : 'currentColor' }}
        />
      </span>
      {total}
      <HeartBurst burstId={burst} />
    </button>
  );
}
