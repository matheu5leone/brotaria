import { useMutation, useQueryClient } from '@tanstack/react-query';

// ── helpers de fetch ──────────────────────────────────────────────────────

async function digHole(userId: string, posX: number, posY: number) {
  const res = await fetch('/api/shovel/dig', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, posX, posY }),
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error ?? 'Erro ao cavar'), { code: data.code });
  return data.pot;
}

async function plantSeed(userId: string, potId: string) {
  const res = await fetch('/api/plants/plant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, potId }),
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error ?? 'Erro ao plantar'), { code: data.code });
  return data.plant;
}

async function waterPlant(plantId: string) {
  const res = await fetch('/api/plants/water', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plantId }),
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error ?? 'Erro ao regar'), { code: data.code });
  return data;
}

async function deletePlant(plantId: string, potId: string) {
  const res = await fetch('/api/plants/delete', {
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
      digHole(userId, posX, posY),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['garden', 'pots', userId] });
      qc.invalidateQueries({ queryKey: ['garden', 'shovel', userId] });
    },
  });
}

export function usePlantMutation(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ potId }: { potId: string }) => plantSeed(userId, potId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['garden', 'pots', userId] });
      qc.invalidateQueries({ queryKey: ['wallet', userId] });
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
    },
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
