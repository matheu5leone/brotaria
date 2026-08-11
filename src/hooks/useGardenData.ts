import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Pot } from '@/types';
import { GAME } from '@/config/economy';

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

async function fetchPots(userId: string): Promise<Pot[]> {
  const { data, error } = await supabase
    .from('pots')
    .select('*, plant_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
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

// A pá saiu daqui: ela deixou de ser um cooldown lido do profile e virou
// durabilidade + obra escalonada, servidos por /api/shovel/status. Ver useShovel.ts.
