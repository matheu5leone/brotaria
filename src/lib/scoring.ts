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

/**
 * Score do RANKING — derivado do valor de herbo da planta (calcPlantScore), mas
 * COMPRIMIDO por raiz quadrada para achatar a discrepância entre plantas.
 *
 * O herbo em si segue linear (peso × estágio); o ranking usa esta versão
 * comprimida para que uma brotaria adulta não fique dezenas de vezes acima de
 * uma comum. Continua monotônico (mesma ordem) e vinculado à economia de herbo:
 *   spread bruto ~55× (6 → 330)  →  comprimido ~7,6× (24 → 182).
 */
export function calcRankingScore(dna: PlantDNA, stageOrderIndex: number): number {
  return Math.round(Math.sqrt(calcPlantScore(dna, stageOrderIndex)) * 10);
}
