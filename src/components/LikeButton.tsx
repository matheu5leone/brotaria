'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { authFetch } from '@/lib/authFetch';
import { HeartBurst } from '@/components/HeartBurst';

type LikeState = { total: number; liked: boolean };

const lsKey = (id: string) => `brotaria_like:${id}`;

function readLS(id: string): LikeState | null {
  try {
    const raw = localStorage.getItem(lsKey(id));
    return raw ? (JSON.parse(raw) as LikeState) : null;
  } catch {
    return null;
  }
}
function writeLS(id: string, s: LikeState) {
  try { localStorage.setItem(lsKey(id), JSON.stringify(s)); } catch { /* indisponível */ }
}

/**
 * Botão de curtida do jardim visitado. Feedback INSTANTÂNEO: o estado vem do
 * localStorage (sem esperar rede), muda na hora ao clicar e só então a request
 * vai ao banco; a resposta reconcilia. `onLiked` dispara efeitos extras (ex.:
 * coração saindo da foto de perfil) apenas ao CURTIR.
 */
export function LikeButton({
  ownerId,
  embedded = false,
  onLiked,
}: {
  ownerId: string;
  embedded?: boolean;
  onLiked?: () => void;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  // Estado semeado do localStorage já na 1ª renderização do cliente (instantâneo,
  // sem esperar rede). No servidor cai no default (o painel só renderiza no client).
  const [state, setState] = useState<LikeState>(() =>
    (typeof window !== 'undefined' && readLS(ownerId)) || { total: 0, liked: false },
  );
  const [burst, setBurst] = useState(0);

  // Reconcilia com o servidor em background (setState só no callback do fetch).
  useEffect(() => {
    let active = true;
    authFetch(`/api/likes?owner=${ownerId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: LikeState | null) => {
        if (active && d) { setState(d); writeLS(ownerId, d); }
      })
      .catch(() => { /* mantém o cache */ });
    return () => { active = false; };
  }, [ownerId]);

  const liked = state.liked;
  const total = state.total;

  const onClick = useCallback(() => {
    if (!user) { router.push('/login'); return; }

    const willLike = !state.liked;
    const optimistic: LikeState = {
      liked: willLike,
      total: Math.max(0, state.total + (willLike ? 1 : -1)),
    };
    const prev = state;

    // 1) Feedback instantâneo (estado + localStorage), sem esperar rede
    setState(optimistic);
    writeLS(ownerId, optimistic);
    if (willLike) { setBurst((b) => b + 1); onLiked?.(); }

    // 2) Só então envia ao banco; reconcilia com a verdade do servidor
    authFetch('/api/likes/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner: ownerId }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('toggle failed'))))
      .then((d: LikeState) => {
        setState(d);
        writeLS(ownerId, d);
        qc.invalidateQueries({ queryKey: ['missions'] }); // curtidas alimentam missões
      })
      .catch(() => { setState(prev); writeLS(ownerId, prev); });
  }, [user, router, qc, ownerId, state, onLiked]);

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
