import { PlantDNA, Rarity } from '@/types';

export const RARITY_WEIGHTS: Record<Rarity, number> = {
  comum:    1,
  incomum:  3,
  raro:     8,
  epico:    20,
  lendario: 50,
  brotaria: 100,
};

/**
 * Score de valor de uma planta em moedas.
 * score = rarity_weight × stage_order_index × (1 + traits.length × 0.2)
 *
 * Extensível: adicionar novos fatores como multiplicadores opcionais aqui.
 */
export function calcPlantScore(dna: PlantDNA, stageOrderIndex: number): number {
  const rw = RARITY_WEIGHTS[dna.rarity] ?? 1;
  const perkBonus = 1 + dna.traits.length * 0.2;
  return Math.round(rw * stageOrderIndex * perkBonus);
}
