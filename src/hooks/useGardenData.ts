import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Pot } from '@/types';

const SHOVEL_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const DAILY_WATER_LIMIT = 10;

function getBrasiliaDate(): string {
  const now = new Date();
  const brasilia = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return brasilia.toISOString().split('T')[0];
}

export type WateringStatus = {
  watersUsed: number;
  watersRemaining: number;
};

async function fetchWateringStatus(userId: string): Promise<WateringStatus> {
  const { data, error } = await supabase
    .from('profiles')
    .select('daily_waters_used, water_reset_date')
    .eq('id', userId)
    .single();
  if (error) throw error;
  const today = getBrasiliaDate();
  const resetNeeded = !data?.water_reset_date || data.water_reset_date !== today;
  const used = resetNeeded ? 0 : (data?.daily_waters_used ?? 0);
  return { watersUsed: used, watersRemaining: Math.max(0, DAILY_WATER_LIMIT - used) };
}

export type ShovelStatus = {
  lastUsedAt: string | null;
  cooldownRemainingMs: number;
};

async function fetchPots(userId: string): Promise<Pot[]> {
  const { data, error } = await supabase
    .from('pots')
    .select('*, plant_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function fetchShovelStatus(userId: string): Promise<ShovelStatus> {
  const { data, error } = await supabase
    .from('profiles')
    .select('shovel_last_used_at')
    .eq('id', userId)
    .single();
  if (error) throw error;
  const lastUsedAt = data?.shovel_last_used_at ?? null;
  const cooldownRemainingMs = lastUsedAt
    ? Math.max(0, SHOVEL_COOLDOWN_MS - (Date.now() - new Date(lastUsedAt).getTime()))
    : 0;
  return { lastUsedAt, cooldownRemainingMs };
}

export function usePots(userId: string | undefined) {
  return useQuery({
    queryKey: ['garden', 'pots', userId],
    queryFn: () => fetchPots(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useWateringStatus(userId: string | undefined) {
  return useQuery({
    queryKey: ['garden', 'watering', userId],
    queryFn: () => fetchWateringStatus(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useShovelStatus(userId: string | undefined) {
  return useQuery({
    queryKey: ['garden', 'shovel', userId],
    queryFn: () => fetchShovelStatus(userId!),
    enabled: !!userId,
    // Cooldown muda com o tempo; revalidar a cada 60s (quando há cooldown ativo)
    staleTime: 60_000,
    refetchInterval: (query) => {
      const ms = query.state.data?.cooldownRemainingMs;
      return ms ? Math.max(5_000, Math.min(ms, 60_000)) : false;
    },
  });
}
