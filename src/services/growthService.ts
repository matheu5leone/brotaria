import { supabaseAdmin } from '@/lib/supabaseServer';
import { mutateDNA } from '@/services/dnaService';
import { generatePlantEvolution } from './aiService';
import { GAME, WATER_COOLDOWN_MS } from '@/config/economy';
import { calcPlantScore } from '@/lib/scoring';

const MODO_IA = process.env.AI_MODE || 'MOCK';

/** Retorna a data atual no fuso de Brasília (UTC-3) como 'YYYY-MM-DD'. */
function getBrasiliaDate(): string {
  const now = new Date();
  const brasilia = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return brasilia.toISOString().split('T')[0];
}

export async function processGrowth() {
  console.log('[Scheduler] Starting growth processing...');

  const { error: waterError } = await supabaseAdmin
    .from('plants')
    .update({ hydration_status: 'waiting_water' })
    .lt('next_water_needed_at', new Date().toISOString())
    .eq('hydration_status', 'hydrated');

  if (waterError) console.error('[Scheduler] Error updating hydration:', waterError);
}

export async function waterPlant(plantId: string, userId: string) {
  console.log(`[Growth] Watering plant ${plantId} for user ${userId}`);

  // 1. Verificar limite diário do usuário
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('daily_waters_used, water_reset_date')
    .eq('id', userId)
    .single();

  if (profileError || !profile) throw new Error('Profile not found');

  const today = getBrasiliaDate();
  const resetNeeded = !profile.water_reset_date || profile.water_reset_date !== today;
  const watersUsed = resetNeeded ? 0 : (profile.daily_waters_used ?? 0);

  if (watersUsed >= GAME.DAILY_WATER_LIMIT) {
    const err = new Error('Limite diário de regas atingido. Volte amanhã!') as Error & { code: string };
    err.code = 'DAILY_LIMIT_REACHED';
    throw err;
  }

  // 2. Buscar planta e verificar se está pronta para rega
  const { data: plant, error: fetchError } = await supabaseAdmin
    .from('plants')
    .select('*, current_stage:plant_stages(*)')
    .eq('id', plantId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !plant) throw new Error('Plant not found');

  // Verifica prontidão por timestamp (não depende do cron ter rodado)
  const isReady =
    plant.hydration_status === 'waiting_water' ||
    new Date(plant.next_water_needed_at) < new Date();

  if (!isReady) {
    const err = new Error('Esta planta ainda não precisa de água.') as Error & { code: string };
    err.code = 'NOT_READY';
    throw err;
  }

  // 3. Incrementar contador diário (reset se necessário)
  await supabaseAdmin
    .from('profiles')
    .update({
      daily_waters_used: watersUsed + 1,
      water_reset_date: today,
    })
    .eq('id', userId);

  // 4. Regar / evoluir
  const newWatersCount = plant.current_stage_waters + 1;

  if (newWatersCount >= plant.current_stage.waters_required) {
    try {
      return await evolvePlant(plantId);
    } catch (err) {
      // Evolução falhou (ex.: IA fora do ar) — devolve a rega do dia para o
      // usuário poder tentar de novo sem ser penalizado.
      await supabaseAdmin
        .from('profiles')
        .update({ daily_waters_used: watersUsed })
        .eq('id', userId);
      throw err;
    }
  }

  const { error: updateError } = await supabaseAdmin
    .from('plants')
    .update({
      current_stage_waters: newWatersCount,
      hydration_status: 'hydrated',
      last_watered_at: new Date().toISOString(),
      next_water_needed_at: new Date(Date.now() + WATER_COOLDOWN_MS).toISOString(),
    })
    .eq('id', plantId);

  if (updateError) throw updateError;

  return {
    success: true,
    evolved: false,
    watersUsed: watersUsed + 1,
    watersRemaining: GAME.DAILY_WATER_LIMIT - (watersUsed + 1),
  };
}

export async function evolvePlant(plantId: string) {
  console.log(`[Growth] Evolving plant ${plantId}`);

  const { data: plant } = await supabaseAdmin
    .from('plants')
    .select('*, current_stage:plant_stages(*)')
    .eq('id', plantId)
    .single();

  if (!plant) return;

  const { data: nextStage } = await supabaseAdmin
    .from('plant_stages')
    .select('*')
    .eq('order_index', plant.current_stage.order_index + 1)
    .single();

  if (!nextStage) {
    console.log(`[Growth] Plant ${plantId} reached maximum growth.`);
    return { success: true, maxGrowth: true };
  }

  const newDNA = mutateDNA(plant.dna);

  // 1) Se o estágio gera imagem, GERA ANTES de avançar o estágio.
  //    Se a geração falhar/der timeout, lançamos o erro e o estágio NÃO avança —
  //    a planta continua no estágio atual (visível) e o usuário pode regar de novo.
  //    Assim nunca ficamos com a planta num estágio sem imagem (invisível).
  let evolution: { visualDescription: string; imageUrl: string; modelUsed: string } | null = null;
  if (nextStage.generate_image) {
    console.log(`[IA] Triggering evolution for stage ${nextStage.code} | MODO: ${MODO_IA}`);
    if (MODO_IA === 'LLM') {
      const { data: lastVersion } = await supabaseAdmin
        .from('plant_versions')
        .select('prompt_used')
        .eq('plant_id', plantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      evolution = await generatePlantEvolution(newDNA, nextStage.code, lastVersion?.prompt_used);
    } else {
      evolution = {
        visualDescription: `[MOCK] Planta do bioma ${newDNA.biome} evoluída para ${nextStage.name}.`,
        // Asset local: evita SVG remoto (dicebear) que o next/image bloqueia.
        imageUrl: '/imgs/brotaria.png',
        modelUsed: 'MOCK-IMAGE-GENERATOR',
      };
      await new Promise(resolve => setTimeout(resolve, 800));
    }
  }

  // 2) Avança estágio + versão + herbo numa transação única (RPC atômica):
  //    ou tudo persiste, ou nada — sem estados parciais se algo falhar no meio.
  const herboReward = calcPlantScore(newDNA, nextStage.order_index);
  const { error: evolveError } = await supabaseAdmin.rpc('evolve_plant_tx', {
    p_plant_id: plantId,
    p_stage_id: nextStage.id,
    p_dna: newDNA,
    p_next_water: new Date(Date.now() + WATER_COOLDOWN_MS).toISOString(),
    p_image_url: evolution?.imageUrl ?? null,
    p_prompt: evolution?.visualDescription ?? null,
    p_model: evolution?.modelUsed ?? null,
    p_herbo: herboReward,
  });

  if (evolveError) {
    console.error(`[Growth] Error evolving plant ${plantId}:`, evolveError);
    throw new Error('Falha ao avançar o estágio da planta');
  }

  console.log(`[Growth] Plant ${plantId} evolved to ${nextStage.code} (+${herboReward} herbo)`);

  return { success: true, evolved: true, nextStage: nextStage.code, stageName: nextStage.name, herbo: herboReward };
}
