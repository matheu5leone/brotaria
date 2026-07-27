import { supabaseAdmin } from '@/lib/supabaseServer';
import type { Rarity } from '@/types';

export type RecycleCode = 'INVALID_SET' | 'MIXED_RARITY' | 'TOP_RARITY' | 'INVENTORY_FULL';

export type RecycleResult =
  | { ok: true; seedRarity: Rarity }
  | { ok: false; code: RecycleCode };

/**
 * Recicla 3 plantas da mesma raridade em 1 semente do tier acima. Toda a
 * validação e a atomicidade vivem na RPC `recycle_plants`; aqui só mapeamos os
 * códigos de erro conhecidos.
 */
export async function recyclePlants(userId: string, plantIds: string[]): Promise<RecycleResult> {
  if (!Array.isArray(plantIds) || plantIds.length !== 3) {
    return { ok: false, code: 'INVALID_SET' };
  }

  const { data, error } = await supabaseAdmin.rpc('recycle_plants', {
    p_user_id: userId,
    p_plant_ids: plantIds,
  });

  if (error) {
    const msg = error.message || '';
    const codes: RecycleCode[] = ['MIXED_RARITY', 'TOP_RARITY', 'INVENTORY_FULL', 'INVALID_SET'];
    for (const code of codes) {
      if (msg.includes(code)) return { ok: false, code };
    }
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;
  return { ok: true, seedRarity: row?.seed_rarity as Rarity };
}
