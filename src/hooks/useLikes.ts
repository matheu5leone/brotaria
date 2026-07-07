'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authFetch } from '@/lib/authFetch';

export type LikeState = { total: number; liked: boolean };

/** Total de curtidas do jardim `ownerId` + se o usuário logado curtiu. */
export function useLikes(ownerId: string | undefined) {
  return useQuery<LikeState>({
    queryKey: ['likes', ownerId],
    queryFn: async () => {
      const res = await authFetch(`/api/likes?owner=${ownerId}`);
      if (!res.ok) throw new Error('Failed to fetch likes');
      return res.json();
    },
    enabled: !!ownerId,
    staleTime: 15_000,
  });
}

/**
 * Liga/desliga a curtida no jardim `ownerId` com atualização OTIMISTA:
 * o cache muda na hora (feedback instantâneo) e só depois vai ao banco;
 * se falhar, faz rollback.
 */
export function useToggleLike(ownerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await authFetch('/api/likes/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: ownerId }),
      });
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error(data.error ?? 'Erro ao curtir'), { code: data.code });
      return data as LikeState;
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['likes', ownerId] });
      const prev = qc.getQueryData<LikeState>(['likes', ownerId]);
      qc.setQueryData<LikeState>(['likes', ownerId], (old) => {
        const cur = old ?? { total: 0, liked: false };
        return { liked: !cur.liked, total: Math.max(0, cur.total + (cur.liked ? -1 : 1)) };
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      const prev = (ctx as { prev?: LikeState } | undefined)?.prev;
      if (prev) qc.setQueryData(['likes', ownerId], prev);
    },
    onSuccess: (data) => {
      qc.setQueryData(['likes', ownerId], data); // sincroniza com o servidor
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['missions'] }); // likes alimentam missões
    },
  });
}
