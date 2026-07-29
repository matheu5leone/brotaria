'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { authFetch } from '@/lib/authFetch';

export type GnomeState = 'locked' | 'awake' | 'holding_water' | 'asleep_idle';

export type GnomeStatusView = {
  unlocked: boolean;
  state: GnomeState;
  cooldownRemainingMs: number;
  canClaim: boolean;
  waterFull: boolean;
  stars: number;
};

export function useGnomeStatus() {
  const { user } = useAuth();
  return useQuery<GnomeStatusView>({
    queryKey: ['gnome', user?.id],
    queryFn: async () => {
      const res = await authFetch('/api/gnome/status');
      if (!res.ok) throw new Error('Failed to fetch gnome status');
      return res.json();
    },
    enabled: !!user,
    staleTime: 10_000,
    // Enquanto o Pablo trabalha, revalida sozinho pra destravar o balde na hora.
    refetchInterval: (q) => {
      const ms = q.state.data?.cooldownRemainingMs;
      return ms && ms > 0 ? Math.max(10_000, Math.min(ms, 60_000)) : false;
    },
  });
}

/** Ação POST genérica do gnomo (unlock/wake/collect). Invalida gnomo + água. */
function useGnomeAction(path: 'unlock' | 'wake' | 'collect' | 'dev-reset') {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await authFetch(`/api/gnome/${path}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error(data.error ?? 'Erro'), { code: data.code });
      return data as { ok: true; balance?: number; status: GnomeStatusView };
    },
    onSuccess: (data) => {
      if (data?.status) qc.setQueryData<GnomeStatusView>(['gnome', user?.id], data.status);
      else qc.invalidateQueries({ queryKey: ['gnome', user?.id] });
      // O saldo do regador (poço + jardim) lê a água por outras queries.
      qc.invalidateQueries({ queryKey: ['water', user?.id] });
      qc.invalidateQueries({ queryKey: ['garden', 'watering', user?.id] });
    },
  });
}

export const useGnomeUnlock = () => useGnomeAction('unlock');
export const useGnomeWake = () => useGnomeAction('wake');
export const useGnomeCollect = () => useGnomeAction('collect');
// TEMPORÁRIO (dev) — estorna a compra p/ re-testar a cutscene (só `lele`).
export const useGnomeDevReset = () => useGnomeAction('dev-reset');
