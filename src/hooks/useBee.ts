'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { authFetch } from '@/lib/authFetch';

/**
 * Abelha → pólen → Elixir Floral.
 * Ver docs/superpowers/specs/2026-08-04-abelha-polen-elixir-design.md
 */

export type BeeStatusView = { active: boolean; remainingMs: number };

/** Estado da abelha no jardim próprio. A leitura é o que FAZ a abelha nascer. */
export function useBeeStatus(enabled = true) {
  const { user } = useAuth();
  return useQuery<BeeStatusView>({
    queryKey: ['bee', user?.id],
    queryFn: async () => {
      const res = await authFetch('/api/bee/status');
      if (!res.ok) throw new Error('Failed to fetch bee status');
      return res.json();
    },
    enabled: !!user && enabled,
    staleTime: 30_000,
    // Sem abelha, checa de tempos em tempos: é assim que ela "aparece" sozinha
    // enquanto o jogador está com o jardim aberto.
    refetchInterval: (q) => (q.state.data?.active ? false : 60_000),
  });
}

function useInvalidate() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['bee', user?.id] });
    qc.invalidateQueries({ queryKey: ['inventory', user?.id] });
  };
}

/** Clique na abelha pousada → +1 pólen. */
export function useClaimBee() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async () => {
      const res = await authFetch('/api/bee/claim', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error(data.error ?? 'Erro'), { code: data.code });
      return data as { ok: true; polen: number };
    },
    onSuccess: invalidate,
  });
}

/** 20 pólen → 1 Elixir Floral. */
export function useCraftElixir() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async () => {
      const res = await authFetch('/api/inventory/craft-elixir', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error(data.error ?? 'Erro'), { code: data.code });
      return data as { ok: true };
    },
    onSuccess: invalidate,
  });
}

/** Usa 1 elixir numa planta: devolve o novo período de sede (para a roleta). */
export function useUseElixir() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (plantId: string) => {
      const res = await authFetch('/api/plants/use-elixir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plantId }),
      });
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error(data.error ?? 'Erro'), { code: data.code });
      return data as { ok: true; periodMs: number; nextWaterAt: string };
    },
    onSuccess: (_d, plantId) => {
      qc.invalidateQueries({ queryKey: ['inventory', user?.id] });
      qc.invalidateQueries({ queryKey: ['plant', plantId] });
      qc.invalidateQueries({ queryKey: ['pots', user?.id] });
    },
  });
}
