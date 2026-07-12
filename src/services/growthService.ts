import { supabaseAdmin } from '@/lib/supabaseServer';
import { mutateDNA } from '@/services/dnaService';
import { generatePlantEvolution } from './aiService';
import { WATER_COOLDOWN_MS, ADULT_NO_WATER_AT } from '@/config/economy';
import { calcPlantScore } from '@/lib/scoring';
import { qualifyReferralIfPending } from '@/services/referralService';

const MODO_IA = process.env.AI_MODE || 'MOCK';

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

  // 1. Buscar planta e verificar prontidão ANTES de gastar água
  const { data: plant, error: fetchError } = await supabaseAdmin
    .from('plants')
    .select('*, current_stage:plant_stages(*)')
    .eq('id', plantId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !plant) throw new Error('Plant not found');

  // Adulta (order ≥ 11) é TERMINAL: não se rega mais.
  if (plant.current_stage.order_index >= 11) {
    const err = new Error('Esta planta já é adulta e não precisa mais de água.') as Error & { code: string };
    err.code = 'IS_ADULT';
    throw err;
  }

  // Verifica prontidão por timestamp (não depende do cron ter rodado)
  const isReady =
    plant.hydration_status === 'waiting_water' ||
    new Date(plant.next_water_needed_at) < new Date();

  if (!isReady) {
    const err = new Error('Esta planta ainda não precisa de água.') as Error & { code: string };
    err.code = 'NOT_READY';
    throw err;
  }

  // 2. Consumir 1 de água do saldo (compare-and-swap: atômico, nunca negativo).
  //    total_waters é contador vitalício (alimenta a missão "regue 100 vezes").
  const { data: prof, error: profErr } = await supabaseAdmin
    .from('profiles')
    .select('water_balance, total_waters')
    .eq('id', userId)
    .single();

  if (profErr || !prof) throw new Error('Profile not found');

  const balance = prof.water_balance ?? 0;
  const totalWaters = prof.total_waters ?? 0;
  const noWater = () => {
    const err = new Error('Sem água. Colete mais na página de Coleta de Água.') as Error & { code: string };
    err.code = 'NO_WATER';
    return err;
  };
  if (balance <= 0) throw noWater();

  const { data: consumed } = await supabaseAdmin
    .from('profiles')
    .update({ water_balance: balance - 1, total_waters: totalWaters + 1 })
    .eq('id', userId)
    .eq('water_balance', balance) // guarda: só consome se o saldo não mudou (anti-corrida)
    .select('water_balance')
    .maybeSingle();

  if (!consumed) throw noWater();
  const newBalance = consumed.water_balance;

  // Devolve o gasto de água (usado se a evolução/atualização falhar).
  const refundWater = () =>
    supabaseAdmin
      .from('profiles')
      .update({ water_balance: newBalance + 1, total_waters: totalWaters })
      .eq('id', userId);

  // 3. Regar / evoluir — meta é a SEDE do sub-passo atual (per-planta), com
  //    fallback para o waters_required global se a planta não tiver sede.
  const newWatersCount = plant.current_stage_waters + 1;
  const target = plant.current_target ?? plant.current_stage.waters_required;

  if (newWatersCount >= target) {
    try {
      return await evolvePlant(plantId);
    } catch (err) {
      // Evolução falhou (ex.: IA fora do ar) — devolve a água para o usuário
      // tentar de novo sem ser penalizado.
      await refundWater();
      throw err;
    }
  }

  const { error: updateError } = await supabaseAdmin
    .from('plants')
    .update({
      current_stage_waters: newWatersCount,
      hydration_status: 'hydrated',
      last_watered_at: new Date().toISOString(),
      next_water_needed_at: new Date(Date.now() + (plant.water_period_ms ?? WATER_COOLDOWN_MS)).toISOString(),
    })
    .eq('id', plantId);

  if (updateError) {
    await refundWater();
    throw updateError;
  }

  return {
    success: true,
    evolved: false,
    waterBalance: newBalance,
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
        imageUrl: '/imgs/brotaria.webp',
        modelUsed: 'MOCK-IMAGE-GENERATOR',
      };
      await new Promise(resolve => setTimeout(resolve, 800));
    }
  }

  // Sede do PRÓXIMO sub-passo (plano protegido em plant_sede). Adulta (order ≥ 11)
  // é TERMINAL: current_target 0 + sentinela distante (nunca mais pede água).
  const isAdultNext = nextStage.order_index >= 11;
  const periodMs = plant.water_period_ms ?? WATER_COOLDOWN_MS;
  let nextTarget = 0;
  let nextWaterAt = ADULT_NO_WATER_AT;
  if (!isAdultNext) {
    const { data: sede } = await supabaseAdmin
      .from('plant_sede').select('waters').eq('plant_id', plantId).maybeSingle();
    const w = (sede?.waters ?? {}) as Record<string, number>;
    nextTarget = w[String(nextStage.order_index)] ?? nextStage.waters_required ?? 3;
    nextWaterAt = new Date(Date.now() + periodMs).toISOString();
  }

  // 2) Avança estágio + versão + herbo numa transação única (RPC atômica):
  //    ou tudo persiste, ou nada — sem estados parciais se algo falhar no meio.
  const herboReward = calcPlantScore(newDNA, nextStage.order_index);
  const { error: evolveError } = await supabaseAdmin.rpc('evolve_plant_tx', {
    p_plant_id: plantId,
    p_stage_id: nextStage.id,
    p_dna: newDNA,
    p_next_water: nextWaterAt,
    p_image_url: evolution?.imageUrl ?? null,
    p_prompt: evolution?.visualDescription ?? null,
    p_model: evolution?.modelUsed ?? null,
    p_herbo: herboReward,
    p_current_target: nextTarget,
  });

  if (evolveError) {
    console.error(`[Growth] Error evolving plant ${plantId}:`, evolveError);
    throw new Error('Falha ao avançar o estágio da planta');
  }

  console.log(`[Growth] Plant ${plantId} evolved to ${nextStage.code} (+${herboReward} herbo)`);

  // Campanha de indicação: ao atingir o broto (order_index >= 2), qualifica a
  // indicação pendente do dono. Idempotente e isolado — nunca quebra a evolução.
  if (nextStage.order_index >= 2) {
    try {
      await qualifyReferralIfPending(plant.user_id);
    } catch (err) {
      console.error('[Growth] Falha ao qualificar indicação:', err);
    }
  }

  return { success: true, evolved: true, nextStage: nextStage.code, stageName: nextStage.name, herbo: herboReward };
}
