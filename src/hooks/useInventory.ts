import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { InventoryItem, PlantDNA } from '@/types';
import { authFetch } from '@/lib/authFetch';
import { useBackpackFull } from '@/components/BackpackFull';

async function fetchInventory(): Promise<InventoryItem[]> {
  const res = await authFetch('/api/inventory');
  if (!res.ok) throw new Error('Failed to fetch inventory');
  return res.json();
}

export function useInventory(userId: string | undefined) {
  return useQuery({
    queryKey: ['inventory', userId],
    queryFn: () => fetchInventory(),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useWrapPlant(userId: string) {
  const qc = useQueryClient();
  const askBackpack = useBackpackFull();
  // Capturado numa const para o onError poder refazer a própria mutation.
  const wrap = useMutation({
    // A rota confere o slot ANTES de consumir o kit: nada foi gasto, então
    // repetir depois de abrir espaço embrulha normalmente.
    onError: (err: unknown, vars: { plantId: string }) => {
      if ((err as { code?: string }).code !== 'INVENTORY_FULL') return;
      askBackpack({ incoming: [{ item_type: 'wrapped_plant' }], onResolved: () => { wrap.mutate(vars); } });
    },
    mutationFn: async ({ plantId }: { plantId: string }) => {
      const res = await authFetch('/api/inventory/use-kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plantId }),
      });
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error(data.error ?? 'Erro ao embrulhar'), { code: data.code });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', userId] });
      qc.invalidateQueries({ queryKey: ['garden', 'pots', userId] });
    },
  });
  return wrap;
}

export function useOpenGift(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId }: { itemId: string }): Promise<{ dna: PlantDNA; stageOrder: number }> => {
      const res = await authFetch('/api/inventory/open-gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro ao abrir presente');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', userId] });
    },
  });
}

export function usePatchLabel(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, label }: { itemId: string; label: string }) => {
      const res = await authFetch('/api/inventory/label', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, label }),
      });
      if (!res.ok) throw new Error('Erro ao salvar etiqueta');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', userId] });
    },
  });
}
