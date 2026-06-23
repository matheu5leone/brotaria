import type { StageBlueprint } from '@/types';

/**
 * BLUEPRINTS DE ESTÁGIO (escala de crescimento)
 * =========================================================================
 * Fonte ÚNICA de verdade da escala por estágio.
 * Espelhada em plant_stages.prompt_context (migration),
 * mas em runtime quem manda é este arquivo.
 *
 * `height_fraction`: quanto da altura adulta (max_height_cm) a planta tem
 *                    neste estágio. O builder calcula target_cm = max * fraction
 *                    e injeta como âncora absoluta no prompt.
 * `directive`:       descrição de morfologia/escala daquele salto.
 *
 * Só os 4 estágios que geram imagem precisam de blueprint.
 * =========================================================================
 */
export const STAGE_BLUEPRINTS: Record<string, StageBlueprint> = {
  broto_1: {
    height_fraction: 0.1,
    directive:
      'A tiny just-emerged sprout, only about 10% of its final adult height. Just 2 small starter leaves, no real stem yet (or only a minimal one). Traits are barely hinted at, not yet developed. It must look small and newborn.',
  },
  pequena_1: {
    height_fraction: 0.3,
    directive:
      'A young plant, clearly about 3x TALLER than the sprout stage. A thin but visible stem now appears. 4 to 6 leaves in the plant\'s leaf style. Traits start to show faintly. Noticeably bigger and more structured than before.',
  },
  media_1: {
    height_fraction: 0.6,
    directive:
      'An established plant, about 2x LARGER than the young stage and filling much more of the frame. A thicker stem with the first branches. Fuller foliage (8 to 14 leaves). Buds or early flowers if it has flowers. Traits are now clearly visible (e.g. real thorns, glowing crystals). Distinctly a mid-size plant.',
  },
  grande_1: {
    height_fraction: 1.0,
    directive:
      'A FULLY MATURE adult plant at its full height. Lush, dense canopy of many leaves, a thick {stem_thickness_grown} main stem with multiple branches. Blooming flowers and/or ripe fruit if applicable. All traits at full strength. The plant is large and dominates the frame — it must be UNMISTAKABLY an adult plant, NOT a small one.',
  },
};

/** Retorna o blueprint de um estágio pelo code (ou undefined se não gera imagem). */
export function blueprintForStage(code: string): StageBlueprint | undefined {
  return STAGE_BLUEPRINTS[code];
}
