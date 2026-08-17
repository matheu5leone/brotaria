import { supabaseAdmin } from '@/lib/supabaseServer';
import {
  GAME,
  PRICES,
  digDurationMsFor,
  digLootChance,
  digRushCostFor,
  rollSoilRarity,
  DIG_LOOT,
  type DigLootType,
} from '@/config/economy';
import { addStackableItem } from './inventoryService';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  BROTARIA — Cavar (pá consumível + obra escalonada)
 *
 *  A pá tem 5 usos e some quando zera (reposição por moeda ou herbo). O tempo
 *  da obra não é fixo: depende de quantos canteiros VAZIOS o jogador já tem —
 *  buraco ocioso é dívida, e quem mantém o jardim cheio cava rápido para sempre.
 *
 *  Como no resto do jogo, o estado é derivado por timestamp (nada de cron): o
 *  canteiro guarda `digging_started_at` + `dig_duration_ms` e cada leitura
 *  decide se a obra acabou.
 *
 *  O minigame é encenação do cliente. Ele devolve `accuracy` (0..1), que só
 *  desloca a chance de material dentro de uma faixa curta (ver DIG_LOOT) — e o
 *  servidor sempre clampa. Forjar precisão máxima rende quase nada, e os
 *  materiais ainda são inertes.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type ShovelStatus = {
  durability: number;
  max: number;
  /** Canteiros sem planta, contando os ainda em obra. */
  emptyPots: number;
  /** Quanto a PRÓXIMA obra vai durar, dado o estado atual do jardim. */
  nextDigDurationMs: number;
  /** Sem nenhum canteiro: cavada de cortesia (não gasta pá, não sorteia nada). */
  isFirstDig: boolean;
  canDig: boolean;
  needsPurchase: boolean;
};

/** Durabilidade atual da pá. Ausência de linha = 0 (quebrada). */
async function getDurability(userId: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from('user_tools')
    .select('durability')
    .eq('user_id', userId)
    .eq('tool_id', 'shovel')
    .maybeSingle();
  return data?.durability ?? 0;
}

/** Total de canteiros e quantos estão vazios (sem planta, inclusive em obra). */
async function countPots(userId: string): Promise<{ total: number; empty: number }> {
  const [{ count: total }, { count: empty }] = await Promise.all([
    supabaseAdmin.from('pots').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabaseAdmin.from('pots').select('*', { count: 'exact', head: true }).eq('user_id', userId).is('plant_id', null),
  ]);
  return { total: total ?? 0, empty: empty ?? 0 };
}

export async function getShovelStatus(userId: string): Promise<ShovelStatus> {
  const [durability, pots] = await Promise.all([getDurability(userId), countPots(userId)]);
  const isFirstDig = pots.total === 0;
  return {
    durability,
    max: GAME.SHOVEL_MAX_DURABILITY,
    emptyPots: pots.empty,
    nextDigDurationMs: digDurationMsFor(pots.empty),
    isFirstDig,
    // A cortesia do novato garante que ninguém fique preso sem jardim.
    canDig: isFirstDig || durability > 0,
    needsPurchase: !isFirstDig && durability === 0,
  };
}

// ── Cavar ───────────────────────────────────────────────────────────────────

type PotRow = {
  id: string;
  pos_x: number | null;
  pos_y: number | null;
  digging_started_at: string | null;
  dig_duration_ms: number | null;
  soil_rarity: string | null;
  dig_claimed_at: string | null;
};

export type DigResult =
  | { ok: true; pot: PotRow; durability: number }
  | { ok: false; code: 'NO_DURABILITY' | 'INVALID_POSITION' | 'OCCUPIED' };

/**
 * Guarda mínima de posição no servidor. A colisão de verdade (SAT sobre o
 * footprint do tile, em `potGeometry`) continua no cliente, porque o tamanho da
 * caixa do canteiro depende do viewport — 14% da largura no desktop, 18% no
 * mobile — e o servidor não sabe em qual o jogador está. Aqui só barramos o
 * abuso escancarado de empilhar canteiros no mesmo ponto via chamada direta.
 */
const MIN_CENTER_GAP_PCT = 4;

async function isSpotTaken(userId: string, posX: number, posY: number): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('pots')
    .select('pos_x, pos_y')
    .eq('user_id', userId);
  return (data ?? []).some(
    (p) =>
      p.pos_x != null && p.pos_y != null &&
      Math.abs(p.pos_x - posX) < MIN_CENTER_GAP_PCT &&
      Math.abs(p.pos_y - posY) < MIN_CENTER_GAP_PCT,
  );
}

export async function digPot(
  userId: string,
  posX: number,
  posY: number,
  accuracy: number,
): Promise<DigResult> {
  if (!Number.isFinite(posX) || !Number.isFinite(posY) || posX < 0 || posX > 100 || posY < 0 || posY > 100) {
    return { ok: false, code: 'INVALID_POSITION' };
  }

  const pots = await countPots(userId);
  const isFirstDig = pots.total === 0;

  if (!isFirstDig && await isSpotTaken(userId, posX, posY)) {
    return { ok: false, code: 'OCCUPIED' };
  }

  // Gasta a pá ANTES de criar o canteiro: o `where durability > 0` da RPC é o
  // CAS que impede duas cavadas simultâneas de gastarem o mesmo último uso.
  // Se o insert falhar depois, devolvemos o uso (padrão de compensação já usado
  // em missions/claim).
  // Anotação explícita: GAME é `as const`, então sem ela o tipo virava o literal 5.
  let durability: number = GAME.SHOVEL_MAX_DURABILITY;
  if (!isFirstDig) {
    const { data, error } = await supabaseAdmin.rpc('consume_shovel_use', { p_user_id: userId });
    if (error) {
      if (error.message?.includes('NO_DURABILITY')) return { ok: false, code: 'NO_DURABILITY' };
      throw error;
    }
    durability = data as number;
  } else {
    durability = await getDurability(userId);
  }

  // A duração é fixada AGORA, com o jardim como está, e gravada no canteiro: o
  // cliente não teria como recalcular depois (o nº de vazios muda a cada ação).
  const digDurationMs = digDurationMsFor(pots.empty);
  const soilRarity = isFirstDig ? 'comum' : rollSoilRarity();

  const { data: pot, error: potError } = await supabaseAdmin
    .from('pots')
    .insert({
      user_id: userId,
      pos_x: posX,
      pos_y: posY,
      digging_started_at: new Date().toISOString(),
      dig_duration_ms: digDurationMs,
      soil_rarity: soilRarity,
      // Guardada para o sorteio de material lá na conclusão da obra.
      dig_accuracy: isFirstDig ? null : Math.min(1, Math.max(0, accuracy)),
    })
    .select('id, pos_x, pos_y, digging_started_at, dig_duration_ms, soil_rarity, dig_claimed_at')
    .single();

  if (potError || !pot) {
    if (!isFirstDig) {
      // Estorna o uso — o jogador não pode pagar por um canteiro que não existe.
      await supabaseAdmin
        .from('user_tools')
        .update({ durability: durability + 1, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('tool_id', 'shovel');
    }
    throw potError ?? new Error('Falha ao criar o canteiro');
  }

  // O loot NÃO sai aqui: ele é revelado quando o jogador conclui a obra
  // (concludeDig), para a recompensa acontecer com ele olhando.
  return { ok: true, pot, durability };
}

// ── Concluir a obra ─────────────────────────────────────────────────────────

export type ConcludeResult =
  | { ok: true; loot: DigLootType[]; overflow: DigLootType[] }
  | { ok: false; code: 'NOT_FOUND' | 'STILL_DIGGING' | 'ALREADY_CLAIMED' };

/**
 * Fecha a obra e revela o que a terra guardava.
 *
 * A precisão do minigame foi gravada no canteiro lá no ato de cavar — é ela que
 * desloca a chance aqui. A primeira cavada (a de cortesia) tem accuracy nula e
 * fica sem sorteio, igual antes.
 */
export async function concludeDig(userId: string, potId: string): Promise<ConcludeResult> {
  const { data: pot } = await supabaseAdmin
    .from('pots')
    .select('id, digging_started_at, dig_duration_ms, dig_claimed_at, dig_accuracy')
    .eq('id', potId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!pot || !pot.digging_started_at) return { ok: false, code: 'NOT_FOUND' };
  if (pot.dig_claimed_at) return { ok: false, code: 'ALREADY_CLAIMED' };

  const endsAt = new Date(pot.digging_started_at).getTime() + (pot.dig_duration_ms ?? 60_000);
  if (Date.now() < endsAt) return { ok: false, code: 'STILL_DIGGING' };

  // CAS em dig_claimed_at: dois toques simultâneos no "Concluir" não podem
  // render dois lotes de material.
  const { data: claimed } = await supabaseAdmin
    .from('pots')
    .update({ dig_claimed_at: new Date().toISOString() })
    .eq('id', potId)
    .is('dig_claimed_at', null)
    .select('id')
    .maybeSingle();

  if (!claimed) return { ok: false, code: 'ALREADY_CLAIMED' };

  // accuracy null = cavada de cortesia do novato: sem sorteio.
  const accuracy = pot.dig_accuracy;
  const loot: DigLootType[] = [];
  const entregues: DigLootType[] = [];
  const overflow: DigLootType[] = [];
  if (accuracy != null) {
    for (const type of Object.keys(DIG_LOOT) as DigLootType[]) {
      if (Math.random() < digLootChance(type, accuracy)) loot.push(type);
    }
    for (const type of loot) {
      try {
        await addStackableItem(userId, type);
        entregues.push(type);
      } catch (err) {
        // Mochila cheia não desfaz a conclusão (o canteiro já está liberado):
        // o item volta na resposta como `overflow`, e o cliente abre a tela de
        // mochila cheia para o jogador decidir o que fica.
        if ((err as { code?: string }).code === 'INVENTORY_FULL') overflow.push(type);
        else console.warn('[Shovel] Loot perdido:', type, err);
      }
    }
  }

  // O que não coube fica ANOTADO NO CANTEIRO. É esta anotação — não o pedido do
  // cliente — que autoriza a entrega depois, em grantPotOverflow.
  if (overflow.length) {
    await supabaseAdmin.from('pots').update({ dig_overflow: overflow }).eq('id', potId);
  }

  return { ok: true, loot: entregues, overflow };
}

// ── Comprar pá ──────────────────────────────────────────────────────────────

export type BuyShovelResult =
  | { ok: true; durability: number; coins: number; herbo: number }
  | { ok: false; code: 'ALREADY_FULL' | 'INSUFFICIENT_COINS' | 'INSUFFICIENT_HERBO' | 'INVALID_CURRENCY' };

export async function buyShovel(userId: string, currency: 'coins' | 'herbo'): Promise<BuyShovelResult> {
  if (currency !== 'coins' && currency !== 'herbo') return { ok: false, code: 'INVALID_CURRENCY' };

  const cost = currency === 'coins' ? PRICES.SHOVEL_COINS : PRICES.SHOVEL_HERBO;
  const { data, error } = await supabaseAdmin.rpc('buy_shovel', {
    p_user_id:  userId,
    p_currency: currency,
    p_cost:     cost,
    p_max:      GAME.SHOVEL_MAX_DURABILITY,
  });

  if (error) {
    const msg = error.message ?? '';
    if (msg.includes('ALREADY_FULL'))        return { ok: false, code: 'ALREADY_FULL' };
    if (msg.includes('INSUFFICIENT_COINS'))  return { ok: false, code: 'INSUFFICIENT_COINS' };
    if (msg.includes('INSUFFICIENT_HERBO'))  return { ok: false, code: 'INSUFFICIENT_HERBO' };
    if (msg.includes('INVALID_CURRENCY'))    return { ok: false, code: 'INVALID_CURRENCY' };
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;
  return { ok: true, durability: row.new_durability, coins: row.new_coins, herbo: row.new_herbo };
}

// ── Apressar a obra ─────────────────────────────────────────────────────────

export type RushResult =
  | { ok: true; potId: string; coins: number }
  | { ok: false; code: 'NOT_FOUND' | 'NOT_RUSHABLE' | 'ALREADY_DONE' | 'INSUFFICIENT_COINS' };

/**
 * Termina a obra na hora, pagando em moedas. Só faixas ACIMA de 24h têm preço
 * (`digRushCostFor`); 1min e 5h não são vendáveis — a espera curta é para ser
 * esperada.
 */
export async function rushDig(userId: string, potId: string): Promise<RushResult> {
  const { data: pot } = await supabaseAdmin
    .from('pots')
    .select('id, digging_started_at, dig_duration_ms, plant_id')
    .eq('id', potId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!pot || !pot.digging_started_at || pot.dig_duration_ms == null) {
    return { ok: false, code: 'NOT_FOUND' };
  }

  const endsAt = new Date(pot.digging_started_at).getTime() + pot.dig_duration_ms;
  if (Date.now() >= endsAt) return { ok: false, code: 'ALREADY_DONE' };

  const cost = digRushCostFor(pot.dig_duration_ms);
  if (cost == null) return { ok: false, code: 'NOT_RUSHABLE' };

  const { data: newCoins, error: spendErr } = await supabaseAdmin.rpc('spend_coins', {
    p_user_id: userId,
    p_amount:  cost,
  });
  if (spendErr) {
    if (spendErr.message?.includes('INSUFFICIENT_COINS')) return { ok: false, code: 'INSUFFICIENT_COINS' };
    throw spendErr;
  }

  // Empurra o início para trás: a obra passa a estar vencida sem inventar um
  // estado novo — `getPotState` continua sendo uma comparação de timestamp.
  // CAS em digging_started_at: se outra chamada já apressou, esta não repete.
  const { data: updated } = await supabaseAdmin
    .from('pots')
    .update({ digging_started_at: new Date(Date.now() - pot.dig_duration_ms).toISOString() })
    .eq('id', potId)
    .eq('digging_started_at', pot.digging_started_at)
    .select('id')
    .maybeSingle();

  if (!updated) {
    // Corrida perdida: devolve as moedas, pois a obra já foi apressada.
    await supabaseAdmin.rpc('add_coins', { p_user_id: userId, p_amount: cost });
    return { ok: false, code: 'ALREADY_DONE' };
  }

  return { ok: true, potId, coins: newCoins as number };
}

/**
 * Entrega o material que ficou devendo neste canteiro, se agora couber.
 *
 * A lista vem da coluna `dig_overflow`, gravada pelo servidor na conclusão —
 * o cliente só diz QUAL canteiro, nunca qual item. Cada item entregue sai da
 * lista, então repetir a chamada não duplica nada.
 */
export async function grantPotOverflow(userId: string, potId: string): Promise<DigLootType[]> {
  const { data: pot } = await supabaseAdmin
    .from('pots')
    .select('id, dig_overflow')
    .eq('id', potId)
    .eq('user_id', userId)
    .maybeSingle();

  const pendentes = (pot?.dig_overflow ?? []) as DigLootType[];
  if (!pendentes.length) return [];

  const entregues: DigLootType[] = [];
  const restantes: DigLootType[] = [];
  for (const type of pendentes) {
    try {
      await addStackableItem(userId, type);
      entregues.push(type);
    } catch {
      restantes.push(type); // ainda não coube
    }
  }

  await supabaseAdmin
    .from('pots')
    .update({ dig_overflow: restantes.length ? restantes : null })
    .eq('id', potId);

  return entregues;
}
