'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { authFetch } from '@/lib/authFetch';

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

export function useCollectWater() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await authFetch('/api/water/collect', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error(data.error ?? 'Erro ao coletar'), { code: data.code });
      return data as { balance: number; cooldownRemainingMs: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['water', user?.id] });
      // O regador do jardim lê o mesmo saldo por outra query.
      qc.invalidateQueries({ queryKey: ['garden', 'watering', user?.id] });
    },
  });
}
