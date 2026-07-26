import type { TraitDef } from '@/types';

/**
 * CATÁLOGO DE PERKS (TRAITS)
 * =========================================================================
 * Cada perk é UM objeto autocontido:
 *   - name:   identificador (igual ao usado no DNA / mutações)
 *   - params: esquema de valores sorteados no plantio (a "força adulta" do perk)
 *   - render: descreve o perk em inglês para o prompt, escalando pela fração
 *             de crescimento `f` (0..1) — no broto o efeito é fraco/insinuado,
 *             na fase grande aparece no máximo.
 *
 * PARA ADICIONAR UM PERK NOVO: basta inserir um item neste array.
 * O gerador (dnaService) e o builder de prompt iteram sobre esta lista e
 * NÃO precisam ser alterados.
 *
 * Tipos de params suportados (ver TraitParamSpec em src/types):
 *   { key, type:'int',  min, max }
 *   { key, type:'bool', chance? }   // chance 0..1 de ser true (default 0.5)
 *   { key, type:'enum', values:[] }
 *   { key, type:'color' }           // hex aleatório
 * =========================================================================
 */
// NOTA DE ESTILO (2026-07): nada de humanização (sem rostos/olhos) e nada de
// efeitos com opacidade não-sólida (brilhos, auras, fumaça, partículas flutuantes,
// translucidez, gotejamento). Todo perk é descrito como PIGMENTO/ESTRUTURA SÓLIDA
// e OPACA dentro do contorno preto — o modelo renderiza alpha parcial como sólido.
export const TRAITS: TraitDef[] = [
  {
    name: 'feliz',
    params: [
      { key: 'plump_leaves', type: 'bool', chance: 0.6 },
    ],
    render: (p) =>
      'boldly saturated, vivid coloring and a lively, upright, healthy posture with leaves turned upward' +
      (p.plump_leaves ? ', rounded plump leaves' : ''),
  },
  {
    name: 'misteriosa',
    params: [
      { key: 'tangled', type: 'bool', chance: 0.7 },
    ],
    render: (p) =>
      'deep, dark solid foliage and an intricate, secretive silhouette' +
      (p.tangled ? ' with tightly tangled, concealing forms' : ''),
  },
  {
    name: 'perigosa',
    params: [
      { key: 'thorn_count', type: 'int', min: 3, max: 12 },
      { key: 'thorn_size', type: 'enum', values: ['small', 'medium', 'large'] },
      { key: 'dark_leaf_tips', type: 'bool', chance: 0.6 },
    ],
    render: (p, f) => {
      const n = Math.max(1, Math.round(p.thorn_count * f));
      return (
        `${n} ${p.thorn_size} sharp solid thorns along the stem` +
        (p.dark_leaf_tips ? ', darkened solid leaf tips' : '')
      );
    },
  },
  {
    name: 'sombria',
    params: [
      { key: 'palette_darkened', type: 'bool', chance: 0.8 },
      { key: 'black_edges', type: 'bool', chance: 0.6 },
    ],
    render: (p) =>
      [
        p.palette_darkened ? 'a darkened, desaturated solid palette' : 'shadowy solid tones',
        p.black_edges ? 'solid blackened leaf edges' : '',
      ]
        .filter(Boolean)
        .join(', '),
  },
  {
    name: 'cristalina',
    params: [
      { key: 'crystal_count', type: 'int', min: 2, max: 8 },
      { key: 'crystal_color_hex', type: 'color' },
    ],
    render: (p, f) =>
      `${Math.max(1, Math.round(p.crystal_count * f))} solid, opaque faceted crystals (color ${p.crystal_color_hex}) growing from the plant`,
  },
  {
    name: 'luminosa',
    params: [
      { key: 'accent_color_hex', type: 'color' },
      { key: 'intensity', type: 'enum', values: ['soft', 'bold'] },
    ],
    render: (p, f) =>
      `bright, boldly ${f > 0.6 ? p.intensity : 'soft'} colored solid markings (color ${p.accent_color_hex}) painted across the leaves`,
  },
  {
    name: 'venenosa',
    params: [
      { key: 'spot_count', type: 'int', min: 3, max: 14 },
      { key: 'spot_color_hex', type: 'color' },
    ],
    render: (p, f) =>
      `${Math.max(1, Math.round(p.spot_count * f))} solid toxic-colored spots (color ${p.spot_color_hex}) on the leaves`,
  },
  {
    name: 'angelical',
    params: [
      { key: 'pale', type: 'bool', chance: 0.7 },
      { key: 'extra_petals', type: 'bool', chance: 0.6 },
    ],
    render: (p) =>
      [
        p.pale ? 'pristine pale, light-colored solid foliage' : 'serene light-toned foliage',
        p.extra_petals ? 'extra soft light-colored petals' : '',
      ]
        .filter(Boolean)
        .join(', '),
  },
  {
    name: 'flamejante',
    params: [
      { key: 'flame_color_hex', type: 'color' },
      { key: 'fiery_gradient', type: 'bool', chance: 0.7 },
    ],
    render: (p) =>
      `solid flame-colored (warm red-orange) leaf tips (color ${p.flame_color_hex})` +
      (p.fiery_gradient ? ', with a fiery solid gradient across the foliage' : ''),
  },
];

/** Catálogo indexado por nome para lookup rápido. */
export const TRAITS_BY_NAME: Record<string, TraitDef> = Object.fromEntries(
  TRAITS.map((t) => [t.name, t]),
);

export const TRAIT_NAMES = TRAITS.map((t) => t.name);
