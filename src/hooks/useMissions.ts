'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useBackpackFull } from '@/components/BackpackFull';
import { useAuth } from '@/hooks/useAuth';
import { authFetch } from '@/lib/authFetch';

export type MissionView = {
  key: string;
  title: string;
  description: string;
  goal: number;
  reward: 'seed' | 'wrapping_kit' | 'avatar';
  avatar?: { key: string; name: string; image: string };
  info?: string;
  progress: number;
  claimed: boolean;
  claimable: boolean;
};

export function useMissions() {
  const { user } = useAuth();
  return useQuery<MissionView[]>({
    queryKey: ['missions', user?.id],
    queryFn: async () => {
      const res = await authFetch('/api/missions');
      if (!res.ok) throw new Error('Failed to fetch missions');
      return res.json();
    },
    enabled: !!user,
    staleTime: 15_000,
  });
}

/** Há ao menos uma missão pronta para resgatar? (badge de notificação no menu) */
export function useHasClaimableMission(): boolean {
  const { data } = useMissions();
  return (data ?? []).some((m) => m.claimable);
}

export function useClaimMission() {
  const askBackpack = useBackpackFull();
  const { user } = useAuth();
  const qc = useQueryClient();
  // Capturado numa const para o onError poder refazer a própria mutation.
  const claim = useMutation({
    // A rota REVERTE a claim quando a entrega falha, então refazer é seguro.
    onError: (err: unknown, key: string) => {
      if ((err as { code?: string }).code !== 'INVENTORY_FULL') return;
      askBackpack({ incoming: [{ item_type: 'seed' }], onResolved: () => { claim.mutate(key); } });
    },
    mutationFn: async (key: string) => {
      const res = await authFetch('/api/missions/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error(data.error ?? 'Erro ao resgatar'), { code: data.code });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['missions', user?.id] });
      qc.invalidateQueries({ queryKey: ['wallet', user?.id] });
      qc.invalidateQueries({ queryKey: ['inventory', user?.id] });
      qc.invalidateQueries({ queryKey: ['avatars', user?.id] }); // prêmio de avatar aparece no picker
    },
  });
  return claim;
}
