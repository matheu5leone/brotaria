import { useQuery } from '@tanstack/react-query';
import { PlantDNA, Rarity } from '@/types';

export type RankingEntry = {
  rank: number;
  plant_id: string;
  user_id: string;
  owner_name: string;
  nickname: string | null;
  image_url: string | null;
  rarity: Rarity;
  stage_name: string;
  stage_order: number;
  trait_count: number;
  score: number;
  dna: PlantDNA;
};

async function fetchRanking(): Promise<RankingEntry[]> {
  const res = await fetch('/api/ranking');
  if (!res.ok) throw new Error('Failed to fetch ranking');
  return res.json();
}

export function useRanking() {
  return useQuery({
    queryKey: ['ranking'],
    queryFn: fetchRanking,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
