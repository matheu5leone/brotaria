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
