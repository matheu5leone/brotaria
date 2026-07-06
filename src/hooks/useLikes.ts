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

/** Liga/desliga a curtida no jardim `ownerId`. */
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
    onSuccess: (data) => {
      qc.setQueryData(['likes', ownerId], data);
      qc.invalidateQueries({ queryKey: ['missions'] }); // likes alimentam missões
    },
  });
}
