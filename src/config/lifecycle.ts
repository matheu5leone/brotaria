/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  BROTARIA — Ciclo de vida da planta (camada de APRESENTAÇÃO)
 *
 *  Internamente existem 13 passos (plant_stages, order_index 1–13) com 3 fases
 *  por porte. Mas as fases 1/2/3 são visualmente idênticas (a imagem é gerada só
 *  na fase 1 de cada porte e reusada). Então, para o usuário, expomos apenas os
 *  5 ESTÁGIOS visíveis, com uma barra que enche até a próxima mudança REAL.
 *
 *  Este módulo é a única fonte dessa tradução. A mecânica (regas, checkpoints de
 *  imagem, herbo, ranking) NÃO usa isto — continua nos 13 passos internos.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type LifecycleKey = 'semente' | 'broto' | 'muda' | 'jovem' | 'adulta';

export interface LifecycleStage {
  key: LifecycleKey;
  name: string;
  tier: number;       // 1–5
  startOrder: number; // primeiro order_index interno deste porte
  steps: number;      // quantas fases internas (1 para Semente, 3 para os demais)
}

export const LIFECYCLE: LifecycleStage[] = [
  { key: 'semente', name: 'Semente', tier: 1, startOrder: 1,  steps: 1 },
  { key: 'broto',   name: 'Broto',   tier: 2, startOrder: 2,  steps: 3 },
  { key: 'muda',    name: 'Muda',    tier: 3, startOrder: 5,  steps: 3 },
  { key: 'jovem',   name: 'Jovem',   tier: 4, startOrder: 8,  steps: 3 },
  { key: 'adulta',  name: 'Adulta',  tier: 5, startOrder: 11, steps: 3 },
];

const WATERS_PER_STEP = 3; // = plant_stages.waters_required (constante hoje)

/** Estágio visível a partir do order_index interno. */
export function lifecycleFromOrder(orderIndex: number): LifecycleStage {
  return [...LIFECYCLE].reverse().find((s) => orderIndex >= s.startOrder) ?? LIFECYCLE[0];
}

/** Estágio visível a partir do code do plant_stage (ex.: 'pequena_2' → Muda). */
export function lifecycleFromCode(code: string): LifecycleStage {
  if (code.startsWith('broto')) return LIFECYCLE[1];
  if (code.startsWith('pequena')) return LIFECYCLE[2];
  if (code.startsWith('media')) return LIFECYCLE[3];
  if (code.startsWith('grande')) return LIFECYCLE[4];
  return LIFECYCLE[0]; // enterrada / fallback
}

/** True quando o code representa uma MUDANÇA VISÍVEL de estágio (fase 1 do porte). */
export function isVisibleStageChange(code: string): boolean {
  return /^(broto|pequena|media|grande)_1$/.test(code);
}

export interface LifecycleProgress {
  key: LifecycleKey;
  name: string;
  tier: number;
  isFinal: boolean;
  progressWaters: number;
  totalWaters: number;
  progressPct: number;
}

/**
 * Progresso do SUB-PASSO atual (rega): regas feitas / sede atual da planta.
 * A barra enche por sub-passo e reseta a cada transição (broto_1→broto_2…),
 * mostrando só o ATUAL (o plano futuro é secreto). Adulta (order ≥ 11) = terminal.
 * `currentTarget` = plants.current_target (sede do sub-passo); fallback = 3.
 */
export function getLifecycle(orderIndex: number, currentWaters: number, currentTarget?: number | null): LifecycleProgress {
  const stage = lifecycleFromOrder(orderIndex);
  const isFinal = orderIndex >= LIFECYCLE[4].startOrder; // adulta (order ≥ 11) não se rega
  const total = Math.max(1, currentTarget ?? WATERS_PER_STEP);
  const progress = Math.min(total, Math.max(0, currentWaters));
  return {
    key: stage.key,
    name: stage.name,
    tier: stage.tier,
    isFinal,
    progressWaters: isFinal ? total : progress,
    totalWaters: total,
    progressPct: isFinal ? 100 : Math.round((progress / total) * 100),
  };
}
