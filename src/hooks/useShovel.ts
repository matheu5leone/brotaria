'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authFetch } from '@/lib/authFetch';

/**
 * Pá consumível + obra escalonada.
 * Ver docs/superpowers/specs/2026-08-11-cavar-redesign-design.md
 *
 * O status vem inteiro do servidor (/api/shovel/status) — diferente do modelo
 * antigo, em que o cliente lia `profiles.shovel_last_used_at` direto do Supabase
 * e reimplementava a regra (que já divergia da do servidor).
 */

export type ShovelStatusView = {
  durability: number;
  max: number;
  emptyPots: number;
  nextDigDurationMs: number;
  isFirstDig: boolean;
  canDig: boolean;
  needsPurchase: boolean;
};

export function useShovelStatus(userId: string | undefined) {
  return useQuery<ShovelStatusView>({
    queryKey: ['garden', 'shovel', userId],
    queryFn: async () => {
      const res = await authFetch('/api/shovel/status');
      if (!res.ok) throw new Error('Falha ao ler o estado da pá');
      return res.json();
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

/** Repõe a pá quebrada com moeda ou herbo. */
export function useBuyShovel(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (currency: 'coins' | 'herbo') => {
      const res = await authFetch('/api/shovel/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency }),
      });
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error(data.error ?? 'Erro'), { code: data.code });
      return data as { durability: number; coins: number; herbo: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['garden', 'shovel', userId] });
      qc.invalidateQueries({ queryKey: ['wallet', userId] });
    },
  });
}

/** Conclui a obra vencida e devolve o material que a terra guardava. */
export function useConcludeDig(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (potId: string) => {
      const res = await authFetch('/api/pots/conclude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ potId }),
      });
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error(data.error ?? 'Erro'), { code: data.code });
      return data as { loot: string[] };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['garden', 'pots', userId] });
      qc.invalidateQueries({ queryKey: ['garden', 'shovel', userId] });
      qc.invalidateQueries({ queryKey: ['inventory', userId] });
    },
  });
}

/** Termina agora uma obra de 24h ou 7 dias, pagando em moedas. */
export function useRushDig(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (potId: string) => {
      const res = await authFetch('/api/pots/rush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ potId }),
      });
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error(data.error ?? 'Erro'), { code: data.code });
      return data as { potId: string; coins: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['garden', 'pots', userId] });
      qc.invalidateQueries({ queryKey: ['garden', 'shovel', userId] });
      qc.invalidateQueries({ queryKey: ['wallet', userId] });
    },
  });
}
