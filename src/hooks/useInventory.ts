import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { InventoryItem, PlantDNA } from '@/types';
import { authFetch } from '@/lib/authFetch';

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
  return useMutation({
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
