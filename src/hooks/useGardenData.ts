import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Pot } from '@/types';

const SHOVEL_COOLDOWN_MS = 24 * 60 * 60 * 1000;

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

export function useShovelStatus(userId: string | undefined) {
  return useQuery({
    queryKey: ['garden', 'shovel', userId],
    queryFn: () => fetchShovelStatus(userId!),
    enabled: !!userId,
    // Cooldown muda com o tempo; revalidar a cada 60s (quando há cooldown ativo)
    staleTime: 60_000,
    refetchInterval: (query) =>
      query.state.data?.cooldownRemainingMs
        ? Math.min(query.state.data.cooldownRemainingMs, 60_000)
        : false,
  });
}
