import type { Biome } from '@/types';

/** Rótulo amigável de cada bioma (PT-BR). */
export const BIOME_LABELS: Record<Biome, string> = {
  planicie: 'Planície',
  floresta: 'Floresta',
  deserto: 'Deserto',
  montanha: 'Montanha',
  pantano: 'Pântano',
  oceano: 'Oceano',
  vulcao: 'Vulcão',
  tundra: 'Tundra',
  selva: 'Selva',
  caverna: 'Caverna',
};

/** Cor identificadora do bioma (espelha as vars --biome-* do globals.css). */
export const BIOME_COLORS: Record<Biome, string> = {
  planicie: '#9ccc65',
  floresta: '#2e7d32',
  deserto: '#e0b15e',
  montanha: '#90a4ae',
  pantano: '#6d7f3f',
  oceano: '#1e88e5',
  vulcao: '#e64a19',
  tundra: '#86c5da',
  selva: '#159e7a',
  caverna: '#6a5acd',
};

/** Imagem da semente genérica (sem bioma). */
export const GENERIC_SEED_IMAGE = '/imgs/seed.webp';

/**
 * Imagem da semente por bioma. Cada bioma terá seu próprio sprite — por enquanto
 * todas usam a semente genérica. Para trocar: gere `public/imgs/seed-<bioma>.webp`
 * e aponte o bioma aqui (ex.: floresta: '/imgs/seed-floresta.webp').
 */
export const BIOME_SEED_IMAGES: Record<Biome, string> = {
  planicie: GENERIC_SEED_IMAGE,
  floresta: GENERIC_SEED_IMAGE,
  deserto: GENERIC_SEED_IMAGE,
  montanha: GENERIC_SEED_IMAGE,
  pantano: GENERIC_SEED_IMAGE,
  oceano: GENERIC_SEED_IMAGE,
  vulcao: GENERIC_SEED_IMAGE,
  tundra: GENERIC_SEED_IMAGE,
  selva: GENERIC_SEED_IMAGE,
  caverna: GENERIC_SEED_IMAGE,
};

/** Sprite da semente conforme o bioma (ou a genérica se não houver bioma). */
export function seedImage(biome?: Biome | null): string {
  return biome ? BIOME_SEED_IMAGES[biome] : GENERIC_SEED_IMAGE;
}
