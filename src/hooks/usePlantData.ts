import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PlantDNA } from '@/types';

export type PlantRow = {
  id: string;
  hydration_status: string;
  current_stage_waters: number;
  current_stage: { id: string; name: string; order_index: number; waters_required: number };
  dna: PlantDNA;
  created_at: string;
  next_water_needed_at: string;
};

export type PlantVersionRow = {
  id: string;
  image_url: string | null;
};

export type PlantVersionHistoryRow = {
  id: string;
  image_url: string | null;
  created_at: string;
  dna_snapshot: PlantDNA;
  stage: { name: string; code: string; order_index: number } | null;
};

async function fetchPlant(plantId: string): Promise<PlantRow> {
  const { data, error } = await supabase
    .from('plants')
    .select('*, current_stage:plant_stages(*)')
    .eq('id', plantId)
    .single();
  if (error) throw error;
  return data as unknown as PlantRow;
}

async function fetchPlantVersion(plantId: string): Promise<PlantVersionRow | null> {
  const { data, error } = await supabase
    .from('plant_versions')
    .select('id, image_url')
    .eq('plant_id', plantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  // PGRST116 = no rows found — valid for plants that haven't evolved yet
  if (error && error.code !== 'PGRST116') throw error;
  return (data as PlantVersionRow | null) ?? null;
}

async function fetchPlantHistory(plantId: string): Promise<PlantVersionHistoryRow[]> {
  const { data, error } = await supabase
    .from('plant_versions')
    .select('id, image_url, created_at, dna_snapshot, stage:plant_stages(name, code, order_index)')
    .eq('plant_id', plantId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as PlantVersionHistoryRow[];
}

export function usePlant(plantId: string | null | undefined) {
  return useQuery({
    queryKey: ['plant', plantId],
    queryFn: () => fetchPlant(plantId!),
    enabled: !!plantId,
    staleTime: 30_000,
  });
}

export function usePlantVersion(plantId: string | null | undefined) {
  return useQuery({
    queryKey: ['plant', plantId, 'version'],
    queryFn: () => fetchPlantVersion(plantId!),
    enabled: !!plantId,
    // Versões são imutáveis (cada evolução gera ID novo); nunca revalida
    staleTime: Infinity,
    gcTime: 30 * 60_000,
  });
}

export function usePlantHistory(plantId: string | null | undefined) {
  return useQuery({
    queryKey: ['plant', plantId, 'history'],
    queryFn: () => fetchPlantHistory(plantId!),
    enabled: !!plantId,
    staleTime: Infinity,
    gcTime: 30 * 60_000,
  });
}
