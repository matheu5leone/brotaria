import { supabaseAdmin } from '@/lib/supabaseServer';
import {
  WATER_UPGRADES,
  getWaterUpgrade,
  nextWaterUpgradeCost,
  waterMaxFor,
  waterBonusChanceFor,
  type WaterUpgradeId,
} from '@/config/economy';
import { getWaterUpgradeLevels } from '@/services/waterService';

export type WaterUpgradesView = {
  herbo: number;
  capacityLevel: number;
  bonusLevel: number;
  /** Teto de água efetivo com os upgrades atuais. */
  max: number;
  /** Chance atual (0..1) de +1 água extra por coleta. */
  bonusChance: number;
};

/** Estado dos upgrades de água para alimentar o modal (níveis + saldo de herbo). */
export async function getWaterUpgrades(userId: string): Promise<WaterUpgradesView> {
  const [{ data: prof }, levels] = await Promise.all([
    supabaseAdmin.from('profiles').select('herbo').eq('id', userId).single(),
    getWaterUpgradeLevels(userId),
  ]);

  return {
    herbo: prof?.herbo ?? 0,
    capacityLevel: levels.capacity,
    bonusLevel: levels.bonus,
    max: waterMaxFor(levels.capacity),
    bonusChance: waterBonusChanceFor(levels.bonus),
  };
}

export type BuyUpgradeResult =
  | { ok: true; herbo: number; capacityLevel: number; bonusLevel: number; max: number; bonusChance: number }
  | { ok: false; code: 'INVALID_UPGRADE' | 'MAX_LEVEL' | 'INSUFFICIENT_HERBO' };

/**
 * Compra o próximo nível de um upgrade de água. O custo vem da config (fonte da
 * verdade), o débito de herbo + subida de nível é atômico na RPC buy_water_upgrade.
 */
export async function buyWaterUpgrade(userId: string, upgradeId: string): Promise<BuyUpgradeResult> {
  const def = getWaterUpgrade(upgradeId);
  if (!def) return { ok: false, code: 'INVALID_UPGRADE' };

  const levels = await getWaterUpgradeLevels(userId);
  const currentLevel = upgradeId === 'water_capacity' ? levels.capacity : levels.bonus;

  const cost = nextWaterUpgradeCost(upgradeId as WaterUpgradeId, currentLevel);
  if (cost === null) return { ok: false, code: 'MAX_LEVEL' };

  const { data, error } = await supabaseAdmin.rpc('buy_water_upgrade', {
    p_user_id: userId,
    p_upgrade_id: upgradeId,
    p_cost: cost,
    p_max_level: def.maxLevel,
  });

  if (error) {
    const msg = error.message || '';
    if (msg.includes('INSUFFICIENT_HERBO')) return { ok: false, code: 'INSUFFICIENT_HERBO' };
    if (msg.includes('MAX_LEVEL')) return { ok: false, code: 'MAX_LEVEL' };
    throw error;
  }

  // A RPC retorna uma linha (new_level, new_herbo).
  const row = Array.isArray(data) ? data[0] : data;
  const newLevel: number = row?.new_level ?? currentLevel + 1;
  const newHerbo: number = row?.new_herbo ?? 0;

  const capacityLevel = upgradeId === 'water_capacity' ? newLevel : levels.capacity;
  const bonusLevel = upgradeId === 'water_bonus' ? newLevel : levels.bonus;

  return {
    ok: true,
    herbo: newHerbo,
    capacityLevel,
    bonusLevel,
    max: waterMaxFor(capacityLevel),
    bonusChance: waterBonusChanceFor(bonusLevel),
  };
}

/** Catálogo estático (nome/descrição/custos por nível) — reexport pró cliente. */
export { WATER_UPGRADES };
