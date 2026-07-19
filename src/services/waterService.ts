import { supabaseAdmin } from '@/lib/supabaseServer';
import {
  GAME,
  WATER_COLLECT_COOLDOWN_MS,
  waterMaxFor,
  waterBonusChanceFor,
} from '@/config/economy';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  BROTARIA — Água (recurso estocável)
 *
 *  Saldo (máx WATER_MAX_BALANCE) enchido pela página de coleta e gasto na rega.
 *  A coleta tem cooldown server-authoritative; a barra (mini-game) é gesto do
 *  cliente — o servidor só garante cooldown + teto (ver spec).
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type WaterStatus = {
  balance: number;
  max: number;
  cooldownRemainingMs: number;
  collectableNow: boolean;
};

function cooldownRemaining(lastCollectedAt: string | null): number {
  if (!lastCollectedAt) return 0;
  return Math.max(0, WATER_COLLECT_COOLDOWN_MS - (Date.now() - new Date(lastCollectedAt).getTime()));
}

/** Níveis dos upgrades de água do usuário (0 quando não comprado). */
export async function getWaterUpgradeLevels(userId: string): Promise<{ capacity: number; bonus: number }> {
  const { data } = await supabaseAdmin
    .from('user_upgrades')
    .select('upgrade_id, level')
    .eq('user_id', userId)
    .in('upgrade_id', ['water_capacity', 'water_bonus']);

  let capacity = 0;
  let bonus = 0;
  for (const row of data ?? []) {
    if (row.upgrade_id === 'water_capacity') capacity = row.level ?? 0;
    else if (row.upgrade_id === 'water_bonus') bonus = row.level ?? 0;
  }
  return { capacity, bonus };
}

/** Status atual da água do usuário (saldo + cooldown de coleta + teto dinâmico). */
export async function getWaterStatus(userId: string): Promise<WaterStatus> {
  const [{ data, error }, levels] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('water_balance, water_last_collected_at')
      .eq('id', userId)
      .single(),
    getWaterUpgradeLevels(userId),
  ]);

  if (error || !data) throw new Error('Profile not found');

  const balance = data.water_balance ?? 0;
  const max = waterMaxFor(levels.capacity);
  const cd = cooldownRemaining(data.water_last_collected_at ?? null);
  return {
    balance,
    max,
    cooldownRemainingMs: cd,
    collectableNow: cd === 0 && balance < max,
  };
}

export type CollectResult =
  | { ok: true; balance: number; cooldownRemainingMs: number; bonus: boolean }
  | { ok: false; code: 'FULL' | 'COOLDOWN'; cooldownRemainingMs: number };

/**
 * Coleta +WATER_PER_COLLECT de água (+1 extra com chance do upgrade "Coleta
 * Farta"). Teto dinâmico (upgrade "Poço Fundo"). Guarda de cooldown e teto feita
 * no próprio UPDATE (atômico). Se nada foi atualizado, descobre o motivo.
 */
export async function collectWater(userId: string): Promise<CollectResult> {
  const cutoffIso = new Date(Date.now() - WATER_COLLECT_COOLDOWN_MS).toISOString();

  // supabase-js não faz aritmética de coluna no update; lê e usa compare-and-swap.
  const [{ data: prof, error: profErr }, levels] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('water_balance, water_last_collected_at')
      .eq('id', userId)
      .single(),
    getWaterUpgradeLevels(userId),
  ]);

  if (profErr || !prof) throw new Error('Profile not found');

  const max = waterMaxFor(levels.capacity);
  const balance = prof.water_balance ?? 0;
  const cd = cooldownRemaining(prof.water_last_collected_at ?? null);

  if (balance >= max) {
    return { ok: false, code: 'FULL', cooldownRemainingMs: cd };
  }
  if (cd > 0) {
    return { ok: false, code: 'COOLDOWN', cooldownRemainingMs: cd };
  }

  // Rola o bônus do upgrade "Coleta Farta" (+1 extra). Cap no teto dinâmico.
  const gotBonus = Math.random() < waterBonusChanceFor(levels.bonus);
  const nowIso = new Date().toISOString();
  const gain = GAME.WATER_PER_COLLECT + (gotBonus ? 1 : 0);
  const newBalance = Math.min(balance + gain, max);
  // Se o teto absorveu o extra, não anuncia bônus (não houve ganho real).
  const bonusApplied = gotBonus && newBalance > balance + GAME.WATER_PER_COLLECT;

  // CAS: só coleta se saldo e cooldown ainda batem (evita coleta dupla concorrente).
  const { data: updated } = await supabaseAdmin
    .from('profiles')
    .update({ water_balance: newBalance, water_last_collected_at: nowIso })
    .eq('id', userId)
    .eq('water_balance', balance)
    .or(`water_last_collected_at.is.null,water_last_collected_at.lt.${cutoffIso}`)
    .select('water_balance')
    .maybeSingle();

  if (!updated) {
    // Corrida perdida: recomputa status para reportar o motivo atual.
    const fresh = await getWaterStatus(userId);
    return {
      ok: false,
      code: fresh.balance >= fresh.max ? 'FULL' : 'COOLDOWN',
      cooldownRemainingMs: fresh.cooldownRemainingMs,
    };
  }

  return { ok: true, balance: updated.water_balance, cooldownRemainingMs: WATER_COLLECT_COOLDOWN_MS, bonus: bonusApplied };
}
