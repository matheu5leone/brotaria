import { supabaseAdmin } from '@/lib/supabaseServer';
import {
  GAME,
  BEE_ACTIVE_MS,
  rollBeeIntervalMs,
  stackMaxFor,
  THIRST,
} from '@/config/economy';
import { addStackableItem, findFreeSlot, hasRoomFor } from '@/services/inventoryService';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  BROTARIA — Abelha → pólen → Elixir Floral
 *
 *  A abelha aparece no jardim PRÓPRIO quando o cooldown (1–3h) vence e o
 *  jogador está lá. Fica ativa BEE_ACTIVE_MINUTES pousando nas plantas; clicar
 *  nela rende 1 pólen. 20 pólen viram 1 Elixir Floral, que reroda a sede de uma
 *  planta (o intervalo com que ela pede água).
 *
 *  A abelha é desenhada pelo cliente, mas o pólen é concedido SÓ aqui: forjar
 *  cliques não acelera nada, porque o teto é o cooldown no servidor.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type BeeStatus = {
  /** Há abelha no jardim agora? */
  active: boolean;
  /** Quanto ainda falta da janela ativa (ms). */
  remainingMs: number;
};

type BeeRow = { bee_next_at: string | null; bee_spawned_at: string | null };

const SELECT = 'bee_next_at, bee_spawned_at';

/** Instante em que a próxima abelha deve aparecer (agora + 1–3h). */
function nextBeeIso(): string {
  return new Date(Date.now() + rollBeeIntervalMs()).toISOString();
}

/**
 * Deriva o estado da abelha e persiste as transições (padrão preguiçoso, sem
 * cron): expira a janela vencida e faz a abelha nascer quando o cooldown vence.
 */
async function syncBee(userId: string, row: BeeRow): Promise<BeeRow> {
  const now = Date.now();

  // 1) Janela ativa venceu → abelha foi embora; sorteia a próxima.
  if (row.bee_spawned_at && now >= new Date(row.bee_spawned_at).getTime() + BEE_ACTIVE_MS) {
    const { data } = await supabaseAdmin
      .from('profiles')
      .update({ bee_spawned_at: null, bee_next_at: nextBeeIso() })
      .eq('id', userId)
      .eq('bee_spawned_at', row.bee_spawned_at) // CAS
      .select(SELECT).maybeSingle();
    return (data as BeeRow) ?? { bee_spawned_at: null, bee_next_at: nextBeeIso() };
  }

  // 2) Já tem abelha viva → nada a fazer.
  if (row.bee_spawned_at) return row;

  // 3) Primeira visita (sem agenda) → agenda a primeira abelha.
  if (!row.bee_next_at) {
    const first = nextBeeIso();
    await supabaseAdmin.from('profiles').update({ bee_next_at: first }).eq('id', userId).is('bee_next_at', null);
    return { bee_spawned_at: null, bee_next_at: first };
  }

  // 4) Cooldown venceu e o jogador está no jardim → a abelha aparece AGORA.
  //    Ancorar o spawn na presença é o que torna a janela alcançável: num
  //    horário absoluto, o jogador quase nunca estaria olhando na hora.
  if (now >= new Date(row.bee_next_at).getTime()) {
    const spawned = new Date(now).toISOString();
    const { data } = await supabaseAdmin
      .from('profiles')
      .update({ bee_spawned_at: spawned })
      .eq('id', userId)
      .is('bee_spawned_at', null) // CAS: só um spawn
      .select(SELECT).maybeSingle();
    return (data as BeeRow) ?? { ...row, bee_spawned_at: spawned };
  }

  return row;
}

async function fetchRow(userId: string): Promise<BeeRow> {
  const { data, error } = await supabaseAdmin
    .from('profiles').select(SELECT).eq('id', userId).single();
  if (error || !data) throw new Error('Profile not found');
  return data as BeeRow;
}

function statusOf(row: BeeRow): BeeStatus {
  if (!row.bee_spawned_at) return { active: false, remainingMs: 0 };
  const remaining = new Date(row.bee_spawned_at).getTime() + BEE_ACTIVE_MS - Date.now();
  return remaining > 0 ? { active: true, remainingMs: remaining } : { active: false, remainingMs: 0 };
}

export async function getBeeStatus(userId: string): Promise<BeeStatus> {
  return statusOf(await syncBee(userId, await fetchRow(userId)));
}

export type ClaimBeeResult =
  | { ok: true; polen: number }
  | { ok: false; code: 'NO_BEE' | 'INVENTORY_FULL' };

/** Clique na abelha pousada: +1 pólen e some a abelha (próxima em 1–3h). */
export async function claimBee(userId: string): Promise<ClaimBeeResult> {
  const row = await syncBee(userId, await fetchRow(userId));
  if (!statusOf(row).active) return { ok: false, code: 'NO_BEE' };

  // Confere espaço ANTES do CAS. O CAS consome a visita; se o pólen não coubesse
  // depois dele, a abelha sumia e o pólen evaporava — e repetir dava NO_BEE.
  // Recusando aqui, a abelha continua pousada e o jogador pode liberar espaço
  // e clicar de novo.
  if (!(await hasRoomFor(userId, 'polen'))) return { ok: false, code: 'INVENTORY_FULL' };

  // CAS: só quem conseguir apagar ESTE spawn concede o pólen (barra clique duplo).
  const { data: taken } = await supabaseAdmin
    .from('profiles')
    .update({ bee_spawned_at: null, bee_next_at: nextBeeIso() })
    .eq('id', userId)
    .eq('bee_spawned_at', row.bee_spawned_at!)
    .select('id').maybeSingle();
  if (!taken) return { ok: false, code: 'NO_BEE' };

  try {
    for (let i = 0; i < GAME.BEE_POLEN_PER_CLAIM; i++) {
      await addStackableItem(userId, 'polen');
    }
  } catch (e) {
    if ((e as { code?: string }).code === 'INVENTORY_FULL') return { ok: false, code: 'INVENTORY_FULL' };
    throw e;
  }
  return { ok: true, polen: GAME.BEE_POLEN_PER_CLAIM };
}

export type CraftElixirResult =
  | { ok: true }
  | { ok: false; code: 'NOT_ENOUGH_POLEN' | 'INVENTORY_FULL' };

/** Forja 1 Elixir Floral consumindo ELIXIR_POLEN_COST de pólen. */
export async function craftElixir(userId: string): Promise<CraftElixirResult> {
  const { data: stacks } = await supabaseAdmin
    .from('inventory_items')
    .select('id, quantity')
    .eq('user_id', userId)
    .eq('item_type', 'polen')
    .order('slot_index', { ascending: true });

  const total = (stacks ?? []).reduce((s, r) => s + (r.quantity ?? 0), 0);
  if (total < GAME.ELIXIR_POLEN_COST) return { ok: false, code: 'NOT_ENOUGH_POLEN' };

  // O elixir não empilha (teto 1), então precisa de um slot livre. Confere ANTES
  // de consumir o pólen — senão o jogador perderia 20 pólen sem receber nada.
  const polenAfter = total - GAME.ELIXIR_POLEN_COST;
  const slotsLiberados = (stacks ?? []).length - Math.ceil(polenAfter / stackMaxFor('polen'));
  if (slotsLiberados <= 0 && (await findFreeSlot(userId)) === null) {
    return { ok: false, code: 'INVENTORY_FULL' };
  }

  // Consome do último stack para o primeiro.
  let restante = GAME.ELIXIR_POLEN_COST;
  for (const st of [...(stacks ?? [])].reverse()) {
    if (restante <= 0) break;
    const usar = Math.min(restante, st.quantity ?? 0);
    const sobra = (st.quantity ?? 0) - usar;
    if (sobra > 0) await supabaseAdmin.from('inventory_items').update({ quantity: sobra }).eq('id', st.id);
    else await supabaseAdmin.from('inventory_items').delete().eq('id', st.id);
    restante -= usar;
  }

  await addStackableItem(userId, 'elixir');
  return { ok: true };
}

export type UseElixirResult =
  | { ok: true; periodMs: number; nextWaterAt: string }
  | { ok: false; code: 'NO_ELIXIR' | 'PLANT_NOT_FOUND' | 'NOT_OWNER' };

/**
 * Usa 1 Elixir Floral numa planta: re-sorteia o intervalo de sede na MESMA faixa
 * do plantio (5–12h). O cronômetro corrente é recalculado a partir da última
 * rega — preserva o tempo já corrido em vez de reiniciar.
 */
export async function useElixir(userId: string, plantId: string): Promise<UseElixirResult> {
  const { data: plant } = await supabaseAdmin
    .from('plants').select('id, user_id, last_watered_at').eq('id', plantId).maybeSingle();
  if (!plant) return { ok: false, code: 'PLANT_NOT_FOUND' };
  if (plant.user_id !== userId) return { ok: false, code: 'NOT_OWNER' };

  const { data: slot } = await supabaseAdmin
    .from('inventory_items')
    .select('id, quantity')
    .eq('user_id', userId)
    .eq('item_type', 'elixir')
    .gt('quantity', 0)
    .order('slot_index', { ascending: true })
    .limit(1).maybeSingle();
  if (!slot) return { ok: false, code: 'NO_ELIXIR' };

  // Mesmo sorteio do plantio: o elixir nunca gera valor fora do que o jogo já produz.
  const min = THIRST.PERIOD_MIN_HOURS * 60;
  const max = THIRST.PERIOD_MAX_HOURS * 60;
  const periodMs = (Math.floor(Math.random() * (max - min + 1)) + min) * 60_000;

  // Preserva o tempo já corrido desde a última rega (não reinicia o relógio).
  const base = plant.last_watered_at ? new Date(plant.last_watered_at).getTime() : Date.now();
  const nextWaterAt = new Date(base + periodMs).toISOString();

  // CAS no consumo do elixir: garante que dois cliques não gastem um item só.
  const { data: consumed } = await supabaseAdmin
    .from('inventory_items').delete().eq('id', slot.id).select('id').maybeSingle();
  if (!consumed) return { ok: false, code: 'NO_ELIXIR' };

  await supabaseAdmin
    .from('plants')
    .update({ water_period_ms: periodMs, next_water_needed_at: nextWaterAt })
    .eq('id', plantId);

  return { ok: true, periodMs, nextWaterAt };
}
