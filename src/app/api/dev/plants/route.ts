import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { isDevUser } from '@/lib/devUser';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { calcPlantScore } from '@/lib/scoring';
import { lifecycleFromOrder } from '@/config/lifecycle';
import type { PlantDNA, Rarity } from '@/types';

/**
 * TEMPORÁRIO (dev) — acervo de TODAS as plantas do servidor, para acompanhar as
 * artes geradas pela IA. Restrito à conta de desenvolvimento.
 *
 * Devolve tudo de uma vez (o acervo é pequeno) e a página filtra em memória —
 * assim trocar de filtro é instantâneo, sem refetch. O teto de LIMIT existe só
 * para o dia em que o acervo crescer: aí vale paginar de verdade.
 *
 * REMOVER junto com /dev/plantas quando não for mais preciso.
 */

const LIMIT = 500;

type VersionRow = {
  id: string;
  image_url: string | null;
  created_at: string;
  model_used: string | null;
  prompt_used: string | null;
  stage: { name: string; order_index: number } | null;
};

type PlantRow = {
  id: string;
  user_id: string;
  dna: PlantDNA;
  hydration_status: string;
  next_water_needed_at: string;
  created_at: string;
  current_stage_waters: number;
  current_target: number | null;
  adult_harvest: number;
  cloned_from: string | null;
  current_stage: { name: string; code: string; order_index: number } | null;
  plant_versions: VersionRow[];
};

export type DevPlantVersion = {
  id: string;
  imageUrl: string | null;
  createdAt: string;
  model: string | null;
  prompt: string | null;
  stageName: string;
  stageOrder: number;
};

export type DevPlant = {
  id: string;
  ownerId: string;
  ownerNickname: string | null;
  rarity: Rarity;
  biome: string;
  /** Plantas anteriores ao arquétipo não têm o campo — são lidas como 'erva'. */
  archetype: string;
  isLegacyArchetype: boolean;
  personality: string;
  colorName: string;
  colorPrimary: string;
  colorSecondary: string;
  traits: string[];
  stageName: string;
  stageOrder: number;
  lifecycleKey: string;
  lifecycleName: string;
  /** Enterrada (order ≤ 1): raridade ainda é surpresa no jogo. */
  isBuried: boolean;
  hydration: string;
  nextWaterAt: string;
  createdAt: string;
  adultHarvest: number;
  isCloned: boolean;
  score: number;
  imageUrl: string | null;
  versions: DevPlantVersion[];
};

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isDevUser(user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from('plants')
    .select(`
      id, user_id, dna, hydration_status, next_water_needed_at, created_at,
      current_stage_waters, current_target, adult_harvest, cloned_from,
      current_stage:plant_stages!plants_current_stage_id_fkey(name, code, order_index),
      plant_versions(id, image_url, created_at, model_used, prompt_used,
                     stage:plant_stages(name, order_index))
    `)
    .order('created_at', { ascending: false })
    .limit(LIMIT);

  if (error) {
    console.error('[DevPlants] Falha ao listar o acervo:', error);
    return NextResponse.json({ error: 'Falha ao carregar o acervo.' }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as PlantRow[];

  // Apelidos numa tirada só — evita N+1 e mantém o embed de plants enxuto.
  const ownerIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, nickname')
    .in('id', ownerIds);
  const nicknames = new Map((profiles ?? []).map((p) => [p.id, p.nickname as string | null]));

  const plants: DevPlant[] = rows.map((row) => {
    const dna = row.dna ?? ({} as PlantDNA);
    const order = row.current_stage?.order_index ?? 1;
    const life = lifecycleFromOrder(order);

    const versions: DevPlantVersion[] = [...(row.plant_versions ?? [])]
      .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
      .map((v) => ({
        id: v.id,
        imageUrl: v.image_url,
        createdAt: v.created_at,
        model: v.model_used,
        prompt: v.prompt_used,
        stageName: v.stage?.name ?? '—',
        stageOrder: v.stage?.order_index ?? 0,
      }));

    return {
      id: row.id,
      ownerId: row.user_id,
      ownerNickname: nicknames.get(row.user_id) ?? null,
      rarity: (dna.rarity ?? 'comum') as Rarity,
      biome: String(dna.biome ?? '—'),
      archetype: dna.form?.archetype ?? 'erva',
      isLegacyArchetype: !dna.form?.archetype,
      personality: dna.personality ?? '—',
      colorName: dna.color?.name ?? '—',
      colorPrimary: dna.color?.primary_hex ?? '#888888',
      colorSecondary: dna.color?.secondary_hex ?? '#888888',
      traits: (dna.traits ?? []).map((t) => t.name),
      stageName: row.current_stage?.name ?? '—',
      stageOrder: order,
      lifecycleKey: life.key,
      lifecycleName: life.name,
      isBuried: order <= 1,
      hydration: row.hydration_status,
      nextWaterAt: row.next_water_needed_at,
      createdAt: row.created_at,
      adultHarvest: row.adult_harvest ?? 0,
      isCloned: !!row.cloned_from,
      score: calcPlantScore(dna, order),
      imageUrl: versions.at(-1)?.imageUrl ?? null,
      versions,
    };
  });

  return NextResponse.json({ plants, total: plants.length, limit: LIMIT });
}
