import type {
  LeafStyle,
  LeafDensity,
  StemStyle,
  StemThickness,
  GrowthPattern,
} from '@/types';

/**
 * VOCABULÁRIO DE FORMA BOTÂNICA
 *
 * Listas de opções sorteadas no plantio para compor o `form` do DNA.
 * Para dar mais variedade às plantas, adicione valores a estas listas
 * (e ao type correspondente em src/types/index.ts, se for um valor novo).
 */
export const LEAF_STYLES: LeafStyle[] = ['rounded', 'pointed', 'heart', 'serrated', 'needle', 'fan', 'lobed'];
export const LEAF_DENSITIES: LeafDensity[] = ['sparse', 'medium', 'dense'];
export const STEM_STYLES: StemStyle[] = ['straight', 'curvy', 'twisting', 'branching', 'none'];
export const STEM_THICKNESSES: StemThickness[] = ['thin', 'medium', 'thick', 'woody'];
export const GROWTH_PATTERNS: GrowthPattern[] = ['tall', 'bushy', 'vine', 'compact', 'spreading'];

/** Faixa (cm) da altura adulta da planta (fase grande). */
export const MAX_HEIGHT_CM_RANGE = { min: 35, max: 90 };

/** Chance (0..1) de a planta ter flores / frutos quando adulta. */
export const FLOWER_CHANCE = 0.55;
export const FRUIT_CHANCE = 0.3;
