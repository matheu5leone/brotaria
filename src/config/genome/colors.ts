import type { DNAColor } from '@/types';

/**
 * PALETA DE CORES DO GENOMA
 *
 * Cada cor tem um hex primário (corpo/folhas) e um secundário (detalhes: pontas, veias).
 * Para AMPLIAR o vocabulário de cores, basta adicionar uma entrada aqui — o gerador
 * (dnaService) sorteia automaticamente dentro desta lista, sem nenhuma outra mudança.
 */
export const COLOR_PALETTE: Record<string, { primary_hex: string; secondary_hex: string }> = {
  verde:    { primary_hex: '#3FA34D', secondary_hex: '#2C7A3F' },
  azul:     { primary_hex: '#3B82C4', secondary_hex: '#1E4E79' },
  roxo:     { primary_hex: '#8B5CF6', secondary_hex: '#5B21B6' },
  vermelho: { primary_hex: '#E0433B', secondary_hex: '#9B1C17' },
  amarelo:  { primary_hex: '#F2C037', secondary_hex: '#C99700' },
  rosa:     { primary_hex: '#F472B6', secondary_hex: '#BE3D82' },
  branco:   { primary_hex: '#F5F5F0', secondary_hex: '#CFCFC4' },
  preto:    { primary_hex: '#2B2B33', secondary_hex: '#0F0F14' },
};

export const COLOR_NAMES = Object.keys(COLOR_PALETTE);

/** Monta um DNAColor a partir do nome (com fallback seguro para 'verde'). */
export function colorFromName(name: string): DNAColor {
  const entry = COLOR_PALETTE[name] ?? COLOR_PALETTE.verde;
  return { name, primary_hex: entry.primary_hex, secondary_hex: entry.secondary_hex };
}
