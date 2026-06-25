import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { calcPlantScore } from '@/lib/scoring';
import { PlantDNA, Rarity } from '@/types';

export async function GET() {
  try {
    const { data: plants, error: plantsError } = await supabaseAdmin
      .from('plants')
      .select('id, user_id, dna, current_stage:plant_stages(order_index, name, code)');

    if (plantsError) throw plantsError;
    if (!plants || plants.length === 0) {
      return NextResponse.json([], { headers: { 'Cache-Control': 'public, max-age=60' } });
    }

    type PlantWithStage = typeof plants[number] & {
      current_stage: { order_index: number; name: string; code: string };
    };

    const scored = (plants as PlantWithStage[])
      .filter((p) => p.current_stage != null && p.current_stage.code !== 'enterrada')
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

    // Busca nickname + email dos donos
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, nickname')
      .in('id', top5UserIds);

    if (profilesError) console.error('[Ranking API] Profiles error:', profilesError);

    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.id, { email: p.email as string, nickname: p.nickname as string | null }]),
    );

    const ranking = scored.map(({ plant, score }, i) => {
      const dna = plant.dna as unknown as PlantDNA;
      const prof = profileMap.get(plant.user_id);
      const nickname = prof?.nickname ?? null;
      const email = prof?.email ?? '';
      const image_url = versionResults[i].data?.image_url ?? null;
      return {
        rank: i + 1,
        plant_id: plant.id,
        user_id: plant.user_id,
        owner_name: nickname ? `@${nickname}` : email.split('@')[0],
        nickname,
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
