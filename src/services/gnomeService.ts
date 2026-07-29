import { supabaseAdmin } from '@/lib/supabaseServer';
import { GAME, GNOME_COOLDOWN_MS, waterMaxFor } from '@/config/economy';
import { getWaterUpgradeLevels } from '@/services/waterService';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  BROTARIA — Pablo, o gnomo de coleta passiva de água (/agua)
 *
 *  Desbloqueado por 1 estrela (profiles.stars). Enquanto "acordado", trabalha
 *  GNOME_COOLDOWN_MS e enche 1 balde; dorme com o balde até o jogador pegar.
 *  Estado é derivado/validado só no servidor (transição preguiçosa por
 *  timestamp, sem cron). Ver docs/superpowers/specs/2026-07-28-pablo-gnomo-*.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type GnomeState = 'locked' | 'awake' | 'holding_water' | 'asleep_idle';
export type GnomeStatus = {
  unlocked: boolean;
  state: GnomeState;
  cooldownRemainingMs: number;
  canClaim: boolean;
  waterFull: boolean;
  stars: number;
};

type GnomeRow = {
  gnome_unlocked: boolean;
  gnome_awoken_at: string | null;
  gnome_bucket_pending: boolean;
  water_balance: number | null;
  stars: number | null;
};

const SELECT = 'gnome_unlocked, gnome_awoken_at, gnome_bucket_pending, water_balance, stars';

async function fetchRow(userId: string): Promise<GnomeRow> {
  const { data, error } = await supabaseAdmin
    .from('profiles').select(SELECT).eq('id', userId).single();
  if (error || !data) throw new Error('Profile not found');
  return data as GnomeRow;
}

/**
 * Coleta preguiçosa: se acordado e o ciclo já passou, gera o balde e faz o
 * Pablo dormir. Persiste a transição (CAS pelo timestamp) e devolve a linha.
 */
async function applyLazyCollect(userId: string, row: GnomeRow): Promise<GnomeRow> {
  if (!row.gnome_unlocked || row.gnome_bucket_pending || !row.gnome_awoken_at) return row;
  const elapsed = Date.now() - new Date(row.gnome_awoken_at).getTime();
  if (elapsed < GNOME_COOLDOWN_MS) return row;
  const { data } = await supabaseAdmin
    .from('profiles')
    .update({ gnome_bucket_pending: true, gnome_awoken_at: null })
    .eq('id', userId)
    .eq('gnome_awoken_at', row.gnome_awoken_at) // CAS: só se ninguém mexeu
    .select(SELECT)
    .maybeSingle();
  return (data as GnomeRow) ?? { ...row, gnome_bucket_pending: true, gnome_awoken_at: null };
}

function deriveState(row: GnomeRow): GnomeState {
  if (!row.gnome_unlocked) return 'locked';
  if (row.gnome_bucket_pending) return 'holding_water';
  if (row.gnome_awoken_at) return 'awake';
  return 'asleep_idle';
}

export async function getGnomeStatus(userId: string): Promise<GnomeStatus> {
  const [row0, levels] = await Promise.all([fetchRow(userId), getWaterUpgradeLevels(userId)]);
  const row = await applyLazyCollect(userId, row0);
  const max = waterMaxFor(levels.capacity);
  const balance = row.water_balance ?? 0;
  const state = deriveState(row);
  const cooldownRemainingMs = state === 'awake' && row.gnome_awoken_at
    ? Math.max(0, GNOME_COOLDOWN_MS - (Date.now() - new Date(row.gnome_awoken_at).getTime()))
    : 0;
  return {
    unlocked: row.gnome_unlocked,
    state,
    cooldownRemainingMs,
    canClaim: state === 'holding_water' && balance < max,
    waterFull: balance >= max,
    stars: row.stars ?? 0,
  };
}

export async function unlockGnome(
  userId: string,
): Promise<{ ok: true } | { ok: false; code: 'NO_STARS' | 'ALREADY_UNLOCKED' }> {
  const row = await fetchRow(userId);
  if (row.gnome_unlocked) return { ok: false, code: 'ALREADY_UNLOCKED' };
  const stars = row.stars ?? 0;
  if (stars < GAME.GNOME_STAR_COST) return { ok: false, code: 'NO_STARS' };
  const { data } = await supabaseAdmin
    .from('profiles')
    .update({
      stars: stars - GAME.GNOME_STAR_COST,
      gnome_unlocked: true,
      gnome_awoken_at: new Date().toISOString(), // nasce acordado
      gnome_bucket_pending: false,
    })
    .eq('id', userId)
    .eq('stars', stars)          // CAS anti-corrida
    .eq('gnome_unlocked', false)
    .select('id').maybeSingle();
  if (!data) return { ok: false, code: 'NO_STARS' };
  return { ok: true };
}

export async function wakeGnome(
  userId: string,
): Promise<{ ok: true } | { ok: false; code: 'BUCKET_FULL' | 'ALREADY_AWAKE' | 'LOCKED' }> {
  const row = await applyLazyCollect(userId, await fetchRow(userId));
  if (!row.gnome_unlocked) return { ok: false, code: 'LOCKED' };
  if (row.gnome_bucket_pending) return { ok: false, code: 'BUCKET_FULL' };
  if (row.gnome_awoken_at) return { ok: false, code: 'ALREADY_AWAKE' };
  await supabaseAdmin
    .from('profiles')
    .update({ gnome_awoken_at: new Date().toISOString() })
    .eq('id', userId)
    .is('gnome_awoken_at', null)
    .eq('gnome_bucket_pending', false);
  return { ok: true };
}

export async function collectGnomeBucket(
  userId: string,
): Promise<{ ok: true; balance: number } | { ok: false; code: 'WATER_FULL' | 'NO_BUCKET' | 'LOCKED' }> {
  const [row0, levels] = await Promise.all([fetchRow(userId), getWaterUpgradeLevels(userId)]);
  const row = await applyLazyCollect(userId, row0);
  if (!row.gnome_unlocked) return { ok: false, code: 'LOCKED' };
  if (!row.gnome_bucket_pending) return { ok: false, code: 'NO_BUCKET' };
  const max = waterMaxFor(levels.capacity);
  const balance = row.water_balance ?? 0;
  if (balance >= max) return { ok: false, code: 'WATER_FULL' };
  const newBalance = Math.min(balance + GAME.GNOME_WATER_PER_COLLECT, max);
  const { data } = await supabaseAdmin
    .from('profiles')
    .update({ water_balance: newBalance, gnome_bucket_pending: false })
    .eq('id', userId)
    .eq('gnome_bucket_pending', true) // CAS: só se o balde ainda existe
    .eq('water_balance', balance)
    .select('water_balance').maybeSingle();
  if (!data) return { ok: false, code: 'WATER_FULL' };
  return { ok: true, balance: (data as { water_balance: number }).water_balance };
}
