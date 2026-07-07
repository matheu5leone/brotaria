import { supabaseAdmin } from '@/lib/supabaseServer';
import { GAME, WATER_COLLECT_COOLDOWN_MS } from '@/config/economy';

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

/** Status atual da água do usuário (saldo + cooldown de coleta). */
export async function getWaterStatus(userId: string): Promise<WaterStatus> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('water_balance, water_last_collected_at')
    .eq('id', userId)
    .single();

  if (error || !data) throw new Error('Profile not found');

  const balance = data.water_balance ?? 0;
  const cd = cooldownRemaining(data.water_last_collected_at ?? null);
  return {
    balance,
    max: GAME.WATER_MAX_BALANCE,
    cooldownRemainingMs: cd,
    collectableNow: cd === 0 && balance < GAME.WATER_MAX_BALANCE,
  };
}

export type CollectResult =
  | { ok: true; balance: number; cooldownRemainingMs: number }
  | { ok: false; code: 'FULL' | 'COOLDOWN'; cooldownRemainingMs: number };

/**
 * Coleta +WATER_PER_COLLECT de água. Guarda de cooldown e teto feita no próprio
 * UPDATE (atômico). Se nada foi atualizado, descobre o motivo (cheio x cooldown).
 */
export async function collectWater(userId: string): Promise<CollectResult> {
  const cutoffIso = new Date(Date.now() - WATER_COLLECT_COOLDOWN_MS).toISOString();

  // supabase-js não faz aritmética de coluna no update; lê e usa compare-and-swap.
  const { data: prof, error: profErr } = await supabaseAdmin
    .from('profiles')
    .select('water_balance, water_last_collected_at')
    .eq('id', userId)
    .single();

  if (profErr || !prof) throw new Error('Profile not found');

  const balance = prof.water_balance ?? 0;
  const cd = cooldownRemaining(prof.water_last_collected_at ?? null);

  if (balance >= GAME.WATER_MAX_BALANCE) {
    return { ok: false, code: 'FULL', cooldownRemainingMs: cd };
  }
  if (cd > 0) {
    return { ok: false, code: 'COOLDOWN', cooldownRemainingMs: cd };
  }

  const nowIso = new Date().toISOString();
  const newBalance = Math.min(balance + GAME.WATER_PER_COLLECT, GAME.WATER_MAX_BALANCE);

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

  return { ok: true, balance: updated.water_balance, cooldownRemainingMs: WATER_COLLECT_COOLDOWN_MS };
}
