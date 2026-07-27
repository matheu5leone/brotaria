import type { Rarity } from '@/types';

/** Ordem crescente de raridade — fonte única da "escada". */
export const RARITY_ORDER: Rarity[] = ['comum', 'incomum', 'raro', 'epico', 'lendario', 'brotaria'];

/** Índice na escada (0 = comum … 5 = brotaria); -1 se desconhecida. */
export function rarityRank(r: Rarity): number {
  return RARITY_ORDER.indexOf(r);
}

/** Próxima raridade acima, ou null se já é o topo (brotaria). */
export function nextRarity(r: Rarity): Rarity | null {
  const i = RARITY_ORDER.indexOf(r);
  return i >= 0 && i < RARITY_ORDER.length - 1 ? RARITY_ORDER[i + 1] : null;
}
