import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Pot } from '@/types';
import { GAME, SHOVEL_COOLDOWN_MS } from '@/config/economy';

export type WateringStatus = {
  /** Saldo de água estocado (gasto na rega, enchido pela coleta). */
  balance: number;
  max: number;
};

async function fetchWateringStatus(userId: string): Promise<WateringStatus> {
  const { data, error } = await supabase
    .from('profiles')
    .select('water_balance')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return { balance: data?.water_balance ?? 0, max: GAME.WATER_MAX_BALANCE };
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
