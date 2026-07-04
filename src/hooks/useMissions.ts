'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { authFetch } from '@/lib/authFetch';

export type MissionView = {
  key: string;
  title: string;
  description: string;
  goal: number;
  reward: 'seed';
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

export function useClaimMission() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
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
    },
  });
}
