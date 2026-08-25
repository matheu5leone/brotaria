/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  BROTARIA — Oficina (craft)
 *
 *  O jogador põe os ingredientes na bancada, arrasta o macetador e vence o
 *  minigame de macetar. Só então esta função é chamada.
 *
 *  O minigame NÃO é auditável (roda no cliente, como o de cavar), então ele não
 *  vale nada como prova: quem confere se o material existe é o servidor, aqui.
 *  Vencer o minigame sem ter os ingredientes devolve NOT_ENOUGH_INPUT.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { supabaseAdmin } from '@/lib/supabaseServer';
import { getRecipe, outputStackMax } from '@/config/recipes';

export type CraftResult =
  | { ok: true; recipeId: string; outputType: string; slot: number }
  | { ok: false; code: 'UNKNOWN_RECIPE' | 'NOT_ENOUGH_INPUT' | 'INVENTORY_FULL' };

export async function craft(userId: string, recipeId: string): Promise<CraftResult> {
  const recipe = getRecipe(recipeId);
  if (!recipe) return { ok: false, code: 'UNKNOWN_RECIPE' };

  // Consumo e entrega na MESMA transação: sem isso, dois toques rápidos gastam
  // o material uma vez e entregam dois resultados (era o furo do craft antigo
  // de elixir, que fazia update/delete solto sem CAS).
  const { data, error } = await supabaseAdmin.rpc('craft_consume_and_grant', {
    p_user_id:     userId,
    p_input_type:  recipe.input.type,
    p_input_qty:   recipe.input.qty,
    p_output_type: recipe.output.type,
    p_output_max:  outputStackMax(recipe),
  });

  if (error) {
    const msg = error.message ?? '';
    if (msg.includes('NOT_ENOUGH_INPUT')) return { ok: false, code: 'NOT_ENOUGH_INPUT' };
    if (msg.includes('INVENTORY_FULL'))   return { ok: false, code: 'INVENTORY_FULL' };
    console.error('[Craft] Falha na RPC:', error);
    throw error;
  }

  return { ok: true, recipeId, outputType: recipe.output.type, slot: Number(data) };
}
