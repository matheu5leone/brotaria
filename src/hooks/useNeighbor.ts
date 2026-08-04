'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { authFetch } from '@/lib/authFetch';

/**
 * Rega de vizinho: ajudar o jardim dos outros. O ganho (herbo + reputação) é de
 * quem rega; a planta do dono não muda. Ver docs/superpowers/specs/2026-08-04-*.
 */

export type WaterNeighborResponse = {
  ok: true;
  herboGained: number;
  lucky: boolean;
  waterBalance: number;
  reputation: number;
  remainingToday: number;
};

export type GardenWatering = { plantId: string; nickname: string | null };

export type GardenSocial = {
  /** A única planta do jardim que pede ajuda de vizinho hoje (decidido no servidor). */
  askingPlantId: string | null;
  /** Eu já reguei essa planta hoje? (evita oferecer uma ação que vai falhar) */
  alreadyWateredByMe: boolean;
  waterings: GardenWatering[];
};

export function useWaterNeighbor() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (plantId: string) => {
      const res = await authFetch('/api/garden/water-neighbor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plantId }),
      });
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error(data.error ?? 'Erro ao regar'), { code: data.code });
      return data as WaterNeighborResponse;
    },
    onSuccess: () => {
      // Carteira (herbo + reputação) e saldo de água (poço/regador do jardim).
      qc.invalidateQueries({ queryKey: ['wallet', user?.id] });
      qc.invalidateQueries({ queryKey: ['water', user?.id] });
      qc.invalidateQueries({ queryKey: ['garden', 'watering', user?.id] });
      // Rastro do jardim visitado (qualquer dono) — a planta regada ganha brilho.
      qc.invalidateQueries({ queryKey: ['garden-social'] });
    },
  });
}

/**
 * Estado social do jardim: qual planta pede ajuda hoje + rastro de 24h.
 * (Antes chamava-se useGardenWaterings e devolvia só o rastro.)
 */
export function useGardenSocial(ownerId: string) {
  const { user } = useAuth();
  return useQuery<GardenSocial>({
    queryKey: ['garden-social', ownerId, user?.id],
    queryFn: async () => {
      // authFetch: o servidor precisa saber quem sou p/ dizer se eu já reguei hoje.
      const res = await authFetch(`/api/garden/waterings?ownerId=${ownerId}`);
      if (!res.ok) throw new Error('Failed to fetch garden social');
      return res.json();
    },
    enabled: !!ownerId,
    staleTime: 60_000,
  });
}
