import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { calcPlantScore } from '@/lib/scoring';
import { PlantDNA, Rarity } from '@/types';

export async function GET() {
  try {
    // 1. Busca todas as plantas com estágio
    const { data: plants, error: plantsError } = await supabaseAdmin
      .from('plants')
      .select('id, user_id, dna, current_stage:plant_stages(order_index, name, code)');

    if (plantsError) throw plantsError;
    if (!plants || plants.length === 0) {
      return NextResponse.json([], { headers: { 'Cache-Control': 'public, max-age=60' } });
    }

    // 2. Filtra plantas sem estágio e computa scores
    type PlantWithStage = typeof plants[number] & {
      current_stage: { order_index: number; name: string; code: string };
    };

    const scored = (plants as PlantWithStage[])
      .filter((p) => p.current_stage != null)
      .map((p) => ({
        plant: p,
        score: calcPlantScore(p.dna as unknown as PlantDNA, p.current_stage.order_index),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    if (scored.length === 0) {
      return NextResponse.json([], { headers: { 'Cache-Control': 'public, max-age=60' } });
    }

    const top5Ids = scored.map((s) => s.plant.id);
    const top5UserIds = scored.map((s) => s.plant.user_id);

    // 3. Busca última imagem de cada planta (paralelo)
    const versionResults = await Promise.all(
      top5Ids.map((id) =>
        supabaseAdmin
          .from('plant_versions')
          .select('image_url')
          .eq('plant_id', id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ),
    );

    // 4. Busca emails dos donos
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .in('id', top5UserIds);

    if (profilesError) console.error('[Ranking API] Profiles error:', profilesError);

    const emailMap = new Map((profiles ?? []).map((p) => [p.id, p.email as string]));

    // 5. Monta resposta
    const ranking = scored.map(({ plant, score }, i) => {
      const dna = plant.dna as unknown as PlantDNA;
      const email = emailMap.get(plant.user_id) ?? '';
      const image_url = versionResults[i].data?.image_url ?? null;
      return {
        rank: i + 1,
        plant_id: plant.id,
        owner_name: (email.split('@')[0] || 'anônimo'),
        image_url,
        rarity: dna.rarity as Rarity,
        stage_name: plant.current_stage.name,
        stage_order: plant.current_stage.order_index,
        trait_count: dna.traits.length,
        score,
        dna,
      };
    });

    return NextResponse.json(ranking, {
      headers: { 'Cache-Control': 'public, max-age=60' },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch ranking';
    console.error('[Ranking API] Error:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
