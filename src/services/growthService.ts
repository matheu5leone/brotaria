import { supabaseAdmin } from '@/lib/supabaseServer';
import { mutateDNA } from '@/services/dnaService';
import { generatePlantEvolution } from './aiService';

/**
 * CONFIGURAÇÃO DE DESENVOLVIMENTO
 * AI_MODE = 'LLM'  -> Chama a OpenRouter e gasta tokens
 * AI_MODE = 'MOCK' -> Usa imagens estáticas e descrições fakes (rápido e grátis)
 */
const MODO_IA = process.env.AI_MODE || 'MOCK';

export async function processGrowth() {
  console.log('[Scheduler] Starting growth processing...');

  // 1. Mark overdue plants as 'waiting_water'
  const { error: waterError } = await supabaseAdmin
    .from('plants')
    .update({ hydration_status: 'waiting_water' })
    .lt('next_water_needed_at', new Date().toISOString())
    .eq('hydration_status', 'hydrated');

  if (waterError) console.error('[Scheduler] Error updating hydration:', waterError);
}

export async function waterPlant(plantId: string) {
  console.log(`[Growth] Watering plant ${plantId}`);

  // 1. Fetch plant and current stage
  const { data: plant, error: fetchError } = await supabaseAdmin
    .from('plants')
    .select('*, current_stage:plant_stages(*)')
    .eq('id', plantId)
    .single();

  if (fetchError || !plant) throw new Error('Plant not found');

  const newWatersCount = plant.current_stage_waters + 1;
  
  if (newWatersCount >= plant.current_stage.waters_required) {
    // Evolve!
    return await evolvePlant(plantId);
  } else {
    // Just update water count and timer
    const { error: updateError } = await supabaseAdmin
      .from('plants')
      .update({
        current_stage_waters: newWatersCount,
        hydration_status: 'hydrated',
        last_watered_at: new Date().toISOString(),
        next_water_needed_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', plantId);

    if (updateError) throw updateError;
    return { success: true, evolved: false };
  }
}

export async function evolvePlant(plantId: string) {
  console.log(`[Growth] Evolving plant ${plantId}`);
  
  // Fetch plant and current stage
  const { data: plant } = await supabaseAdmin
    .from('plants')
    .select('*, current_stage:plant_stages(*)')
    .eq('id', plantId)
    .single();

  if (!plant) return;

  // Find next stage
  const { data: nextStage } = await supabaseAdmin
    .from('plant_stages')
    .select('*')
    .eq('order_index', plant.current_stage.order_index + 1)
    .single();

  if (!nextStage) {
    console.log(`[Growth] Plant ${plantId} reached maximum growth.`);
    return { success: true, maxGrowth: true };
  }

  // Check for mutation
  const newDNA = mutateDNA(plant.dna);

  // Update plant
  const { error: updateError } = await supabaseAdmin
    .from('plants')
    .update({
      current_stage_id: nextStage.id,
      current_stage_waters: 0,
      dna: newDNA,
      hydration_status: 'hydrated',
      last_watered_at: new Date().toISOString(),
      next_water_needed_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
    })
    .eq('id', plantId);

  if (updateError) {
    console.error(`[Growth] Error evolving plant ${plantId}:`, updateError);
    return { success: false, error: updateError };
  }

  // If nextStage.generate_image is true, trigger AI (or MOCK)
  if (nextStage.generate_image) {
    console.log(`[IA] Triggering evolution for stage ${nextStage.code} | MODO: ${MODO_IA}`);
    
    try {
      let evolution;

      if (MODO_IA === 'LLM') {
        // Busca a descrição anterior apenas para continuidade textual de identidade
        // (a imagem anterior NÃO é mais usada como referência — saltos maiores).
        const { data: lastVersion } = await supabaseAdmin
          .from('plant_versions')
          .select('prompt_used')
          .eq('plant_id', plantId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        evolution = await generatePlantEvolution(
          newDNA,
          nextStage.code,
          lastVersion?.prompt_used
        );
      } else {
        // MODO MOCK: Simula resposta da IA instantaneamente com um avatar aleatório
        evolution = {
          visualDescription: `[MOCK] Planta do bioma ${newDNA.biome} evoluída para ${nextStage.name}.`,
          imageUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${plantId}-${nextStage.code}`,
          modelUsed: 'MOCK-IMAGE-GENERATOR'
        };
        // Delay simulado
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      // Save to plant_versions
      await supabaseAdmin.from('plant_versions').insert({
        plant_id: plantId,
        image_url: evolution.imageUrl,
        prompt_used: evolution.visualDescription,
        dna_snapshot: newDNA,
        stage_id: nextStage.id,
        model_used: evolution.modelUsed // Nova coluna adicionada aqui
      });
      
      console.log(`[IA] Version saved for plant ${plantId} (MODO: ${MODO_IA})`);
    } catch (error) {
      console.error(`[IA] Error in evolution for plant ${plantId}:`, error);
    }
  }

  return { success: true, evolved: true, nextStage: nextStage.code };
}
