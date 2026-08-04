import { supabaseAdmin } from '@/lib/supabaseServer';
import { GAME } from '@/config/economy';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  BROTARIA — Rega de vizinho (ajudar o jardim dos outros)
 *
 *  Regar a planta de outro jogador NÃO altera a planta: não conta rega, não
 *  avança estágio e não sacia a sede do dono. O ganho é todo de quem rega
 *  (herbo + reputação), pagando 1 água. Limite de 3/dia e 1 por planta/dia.
 *
 *  INVARIANTE: este módulo nunca faz UPDATE em `plants`. É assim que a regra
 *  "não progride, não sacia" fica garantida por construção, não por promessa.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type WaterNeighborResult =
  | {
      ok: true;
      herboGained: number;
      lucky: boolean;
      waterBalance: number;
      reputation: number;
      remainingToday: number;
    }
  | { ok: false; code: 'PLANT_NOT_FOUND' | 'OWN_PLANT' | 'DAILY_LIMIT' | 'ALREADY_WATERED' | 'NO_WATER' };

/** Data de hoje no fuso do jogo (BRT), no formato YYYY-MM-DD. */
function todayBRT(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

/** Regas já usadas hoje: zera sozinho quando a data virou (reset preguiçoso). */
function usedToday(row: { neighbor_waters_today: number | null; neighbor_waters_date: string | null }): number {
  return row.neighbor_waters_date === todayBRT() ? (row.neighbor_waters_today ?? 0) : 0;
}

export async function waterNeighborPlant(userId: string, plantId: string): Promise<WaterNeighborResult> {
  // 1) Planta existe e não é minha
  const { data: plant } = await supabaseAdmin
    .from('plants').select('id, user_id').eq('id', plantId).maybeSingle();
  if (!plant) return { ok: false, code: 'PLANT_NOT_FOUND' };
  if (plant.user_id === userId) return { ok: false, code: 'OWN_PLANT' };

  // 2) Meu estado (saldo + contador diário)
  const { data: me, error: meErr } = await supabaseAdmin
    .from('profiles')
    .select('water_balance, herbo, reputation, neighbor_waters_today, neighbor_waters_date')
    .eq('id', userId).single();
  if (meErr || !me) throw new Error('Profile not found');

  const used = usedToday(me);
  if (used >= GAME.NEIGHBOR_WATER_DAILY_LIMIT) return { ok: false, code: 'DAILY_LIMIT' };

  // 3) Já reguei ESTA planta hoje? (dia BRT → limite inferior em UTC)
  const startOfDay = new Date(`${todayBRT()}T00:00:00-03:00`).toISOString();
  const { data: dup } = await supabaseAdmin
    .from('neighbor_waterings')
    .select('id')
    .eq('from_user_id', userId)
    .eq('plant_id', plantId)
    .gte('created_at', startOfDay)
    .maybeSingle();
  if (dup) return { ok: false, code: 'ALREADY_WATERED' };

  // 4) Água
  const balance = me.water_balance ?? 0;
  if (balance <= 0) return { ok: false, code: 'NO_WATER' };

  // 5) Aplica (CAS no saldo de água: barra clique duplo / corrida)
  const lucky = Math.random() < GAME.NEIGHBOR_WATER_LUCKY_CHANCE;
  const herboGained = lucky ? GAME.NEIGHBOR_WATER_HERBO_LUCKY : GAME.NEIGHBOR_WATER_HERBO;
  const newUsed = used + 1;

  const { data: updated } = await supabaseAdmin
    .from('profiles')
    .update({
      water_balance:         balance - 1,
      herbo:                 (me.herbo ?? 0) + herboGained,
      reputation:            (me.reputation ?? 0) + GAME.NEIGHBOR_WATER_REPUTATION,
      neighbor_waters_today: newUsed,
      neighbor_waters_date:  todayBRT(),
    })
    .eq('id', userId)
    .eq('water_balance', balance)
    .select('water_balance, reputation')
    .maybeSingle();

  if (!updated) {
    // Corrida perdida: relê para reportar o motivo atual.
    const { data: fresh } = await supabaseAdmin
      .from('profiles').select('water_balance, neighbor_waters_today, neighbor_waters_date')
      .eq('id', userId).single();
    if (fresh && usedToday(fresh) >= GAME.NEIGHBOR_WATER_DAILY_LIMIT) return { ok: false, code: 'DAILY_LIMIT' };
    return { ok: false, code: 'NO_WATER' };
  }

  // 6) Log (rastro + anti-duplicata). Falha aqui não desfaz a rega: só loga.
  const { error: logErr } = await supabaseAdmin.from('neighbor_waterings').insert({
    from_user_id: userId,
    to_user_id:   plant.user_id,
    plant_id:     plantId,
    herbo_gained: herboGained,
  });
  if (logErr) console.error('[neighbor] falha ao gravar log da rega:', logErr);

  return {
    ok: true,
    herboGained,
    lucky,
    waterBalance: updated.water_balance,
    reputation:   updated.reputation,
    remainingToday: Math.max(0, GAME.NEIGHBOR_WATER_DAILY_LIMIT - newUsed),
  };
}

/** Plantas do jardim regadas nas últimas NEIGHBOR_WATER_TRACE_HOURS (rastro visual). */
export async function getGardenWaterings(ownerId: string) {
  const since = new Date(Date.now() - GAME.NEIGHBOR_WATER_TRACE_HOURS * 3600_000).toISOString();
  const { data } = await supabaseAdmin
    .from('neighbor_waterings')
    .select('plant_id, from_user:profiles!neighbor_waterings_from_user_id_fkey(nickname)')
    .eq('to_user_id', ownerId)
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  const seen = new Set<string>();
  const out: { plantId: string; nickname: string | null }[] = [];
  for (const row of data ?? []) {
    const pid = row.plant_id as string;
    if (seen.has(pid)) continue;      // 1 entrada por planta: a mais recente
    seen.add(pid);
    const rel = row.from_user as unknown as { nickname: string | null } | null;
    out.push({ plantId: pid, nickname: rel?.nickname ?? null });
  }
  return out;
}
