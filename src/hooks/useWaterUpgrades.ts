'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { authFetch } from '@/lib/authFetch';

export type WaterUpgradesView = {
  herbo: number;
  capacityLevel: number;
  bonusLevel: number;
  max: number;
  bonusChance: number;
};

export function useWaterUpgrades() {
  const { user } = useAuth();
  return useQuery<WaterUpgradesView>({
    queryKey: ['water', 'upgrades', user?.id],
    queryFn: async () => {
      const res = await authFetch('/api/water/upgrades');
      if (!res.ok) throw new Error('Failed to fetch water upgrades');
      return res.json();
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}

export type BuyUpgradeResponse = {
  success: true;
  herbo: number;
  capacityLevel: number;
  bonusLevel: number;
  max: number;
  bonusChance: number;
};

/**
 * Compra o próximo nível de um upgrade de água. Ao concluir, sincroniza a view de
 * upgrades e invalida carteira (herbo) + status de água (teto pode ter mudado).
 */
export function useBuyWaterUpgrade() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (upgradeId: string) => {
      const res = await authFetch('/api/water/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upgradeId }),
      });
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error(data.error ?? 'Erro na compra'), { code: data.code });
      return data as BuyUpgradeResponse;
    },
    onSuccess: (data) => {
      // Atualiza a view de upgrades sem refetch.
      qc.setQueryData<WaterUpgradesView>(['water', 'upgrades', user?.id], {
        herbo: data.herbo,
        capacityLevel: data.capacityLevel,
        bonusLevel: data.bonusLevel,
        max: data.max,
        bonusChance: data.bonusChance,
      });
      // Herbo mudou → recarrega carteira. Teto pode ter subido → revalida água.
      qc.invalidateQueries({ queryKey: ['wallet', user?.id] });
      qc.invalidateQueries({ queryKey: ['water', user?.id] });
    },
  });
}
