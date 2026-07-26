import { PlantDNA, Rarity } from '@/types';

export const RARITY_WEIGHTS: Record<Rarity, number> = {
  comum:    3,
  incomum:  5,
  raro:     10,
  epico:    15,
  lendario: 22,
  brotaria: 30,
};

/**
 * Score de valor de uma planta em herbo.
 * score = rarity_weight × stage_order_index
 *
 * Perks NÃO influenciam mais o herbo (apenas o visual). Extensível: novos
 * fatores entram como multiplicadores opcionais aqui.
 */
export function calcPlantScore(dna: PlantDNA, stageOrderIndex: number): number {
  const rw = RARITY_WEIGHTS[dna.rarity] ?? RARITY_WEIGHTS.comum;
  return Math.round(rw * stageOrderIndex);
}
