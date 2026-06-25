import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authFetch } from '@/lib/authFetch';

// ── helpers de fetch ──────────────────────────────────────────────────────

async function digHole(posX: number, posY: number) {
  const res = await authFetch('/api/shovel/dig', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ posX, posY }),
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error ?? 'Erro ao cavar'), { code: data.code });
  return data.pot;
}

async function plantSeed(potId: string) {
  const res = await authFetch('/api/plants/plant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ potId }),
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error ?? 'Erro ao plantar'), { code: data.code });
  return data.plant;
}

async function waterPlant(plantId: string) {
  const res = await authFetch('/api/plants/water', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plantId }),
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error ?? 'Erro ao regar'), { code: data.code });
  return data;
}

async function deletePlant(plantId: string, potId: string) {
  const res = await authFetch('/api/plants/delete', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plantId, potId }),
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error ?? 'Erro ao deletar'), { code: data.code });
  return data;
}

// ── hooks ─────────────────────────────────────────────────────────────────

export function useDigMutation(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ posX, posY }: { posX: number; posY: number }) =>
      digHole(posX, posY),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['garden', 'pots', userId] });
      qc.invalidateQueries({ queryKey: ['garden', 'shovel', userId] });
    },
  });
}

export function usePlantMutation(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ potId }: { potId: string }) => plantSeed(potId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['garden', 'pots', userId] });
      qc.invalidateQueries({ queryKey: ['wallet', userId] });
      qc.invalidateQueries({ queryKey: ['inventory', userId] });
    },
  });
}

export function useWaterMutation(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ plantId }: { plantId: string }) => waterPlant(plantId),
    onSuccess: (_data, { plantId }) => {
      qc.invalidateQueries({ queryKey: ['plant', plantId] });
      qc.invalidateQueries({ queryKey: ['plant', plantId, 'version'] });
      qc.invalidateQueries({ queryKey: ['plant', plantId, 'history'] });
      qc.invalidateQueries({ queryKey: ['garden', 'watering', userId] });
      qc.invalidateQueries({ queryKey: ['garden', 'pots', userId] });
    },
  });
}

export function useRemovePotMutation(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ potId }: { potId: string }) => {
      const res = await authFetch('/api/pots/remove', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ potId }),
      });
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error(data.error ?? 'Erro ao remover canteiro'), { code: data.code });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['garden', 'pots', userId] }),
  });
}

export function useMovePlantMutation(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ fromPotId, toPotId }: { fromPotId: string; toPotId: string }) => {
      const res = await authFetch('/api/plants/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromPotId, toPotId }),
      });
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error(data.error ?? 'Erro ao mover planta'), { code: data.code });
      return data as { stressed: boolean; satisfacao: number };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['garden', 'pots', userId] }),
  });
}

export function useDeleteMutation(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ plantId, potId }: { plantId: string; potId: string }) =>
      deletePlant(plantId, potId),
    onSuccess: (_data, { plantId }) => {
      qc.invalidateQueries({ queryKey: ['garden', 'pots', userId] });
      qc.removeQueries({ queryKey: ['plant', plantId] });
      qc.removeQueries({ queryKey: ['plant', plantId, 'version'] });
    },
  });
}
