'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { authFetch } from '@/lib/authFetch';
import { WATER_COLLECT_COOLDOWN_MS } from '@/config/economy';

export type WaterStatusView = {
  balance: number;
  max: number;
  cooldownRemainingMs: number;
  collectableNow: boolean;
};

export function useWaterStatus() {
  const { user } = useAuth();
  return useQuery<WaterStatusView>({
    queryKey: ['water', user?.id],
    queryFn: async () => {
      const res = await authFetch('/api/water/status');
      if (!res.ok) throw new Error('Failed to fetch water status');
      return res.json();
    },
    enabled: !!user,
    staleTime: 10_000,
    // Enquanto há cooldown, revalida sozinho para destravar a coleta na hora.
    refetchInterval: (query) => {
      const ms = query.state.data?.cooldownRemainingMs;
      return ms && ms > 0 ? Math.max(5_000, Math.min(ms, 60_000)) : false;
    },
  });
}

/**
 * Coleta 1 de água com atualização OTIMISTA (mesmo padrão do curtir jardim):
 * o saldo sobe na hora no cache (feedback instantâneo, sem esperar o banco) e o
 * cooldown já começa a contar; se o servidor falhar, rollback.
 */
export function useCollectWater() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ['water', user?.id];
  return useMutation({
    mutationFn: async () => {
      const res = await authFetch('/api/water/collect', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error(data.error ?? 'Erro ao coletar'), { code: data.code });
      return data as { balance: number; cooldownRemainingMs: number };
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<WaterStatusView>(key);
      qc.setQueryData<WaterStatusView>(key, (old) => {
        if (!old) return old;
        return {
          ...old,
          balance: Math.min(old.max, old.balance + 1),
          cooldownRemainingMs: WATER_COLLECT_COOLDOWN_MS,
          collectableNow: false,
        };
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      const prev = (ctx as { prev?: WaterStatusView } | undefined)?.prev;
      if (prev) qc.setQueryData(key, prev);
    },
    onSuccess: (data) => {
      // Sincroniza com o servidor (autoritativo) sem refetch extra.
      qc.setQueryData<WaterStatusView>(key, (old) =>
        old ? { ...old, balance: data.balance, cooldownRemainingMs: data.cooldownRemainingMs, collectableNow: false } : old);
    },
    onSettled: () => {
      // O regador do jardim lê o mesmo saldo por outra query.
      qc.invalidateQueries({ queryKey: ['garden', 'watering', user?.id] });
    },
  });
}
