import type { TraitDef, Rarity } from '@/types';
import { rarityRank } from '@/config/rarity';

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
    minRarity: 'lendario',
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
    minRarity: 'raro',
    params: [
      { key: 'flame_color_hex', type: 'color' },
      { key: 'fiery_gradient', type: 'bool', chance: 0.7 },
    ],
    render: (p) =>
      `solid flame-colored (warm red-orange) leaf tips (color ${p.flame_color_hex})` +
      (p.fiery_gradient ? ', with a fiery solid gradient across the foliage' : ''),
  },

  // ─── A partir de RARO ────────────────────────────────────────────────────
  {
    name: 'caule_retorcido',
    minRarity: 'raro',
    params: [
      { key: 'twist', type: 'enum', values: ['gently curved', 'strongly curved', 'tightly spiralled'] },
      { key: 'nodes', type: 'int', min: 2, max: 6 },
    ],
    render: (p, f) =>
      `a ${p.twist} main stem with ${Math.max(1, Math.round(p.nodes * f))} pronounced bends`,
  },
  {
    name: 'folhas_espiral',
    minRarity: 'raro',
    params: [
      { key: 'curl', type: 'enum', values: ['short curled', 'coiled', 'tightly corkscrewed'] },
      { key: 'count', type: 'int', min: 2, max: 8 },
    ],
    // Num arquétipo samambaia o mesmo perk lê como BÁCULO (fronde enrolada).
    render: (p, f) =>
      `${Math.max(1, Math.round(p.count * f))} ${p.curl} leaves rolled into solid spirals`,
  },
  {
    name: 'folhas_peludas',
    minRarity: 'raro',
    params: [
      { key: 'density', type: 'enum', values: ['fine sparse', 'dense velvety'] },
      { key: 'on_stem', type: 'bool', chance: 0.5 },
    ],
    render: (p) =>
      `${p.density} solid hairs covering the leaf surface` +
      (p.on_stem ? ', the stem bristly too' : ''),
  },
  {
    name: 'folhagem_atipica',
    minRarity: 'raro',
    params: [
      { key: 'shape', type: 'enum', values: [
        'deeply split fan-shaped', 'three-lobed', 'ribbon-like', 'crescent', 'diamond-shaped',
      ] },
    ],
    render: (p) => `leaves of an unusual ${p.shape} outline`,
  },

  // ─── A partir de ÉPICO ───────────────────────────────────────────────────
  {
    name: 'caule_duplo',
    minRarity: 'epico',
    params: [
      { key: 'symmetry', type: 'enum', values: ['twin, equally thick', 'one dominant and one slimmer'] },
      { key: 'entwined', type: 'bool', chance: 0.45 },
    ],
    render: (p) =>
      `TWO main stems rising from the base, ${p.symmetry}` +
      (p.entwined ? ', entwined around each other' : ''),
  },
  {
    name: 'folhas_degrade',
    minRarity: 'epico',
    params: [
      { key: 'from_hex', type: 'color' },
      { key: 'to_hex', type: 'color' },
      { key: 'direction', type: 'enum', values: ['from base to tip', 'from midrib to edge'] },
    ],
    render: (p) =>
      `leaves in a solid opaque colour gradient ${p.direction}, ${p.from_hex} shifting into ${p.to_hex}`,
  },
  {
    name: 'carnivora',
    minRarity: 'epico',
    params: [
      { key: 'trap', type: 'enum', values: ['pitcher-shaped', 'hinged jaw-like', 'bristled sticky'] },
      { key: 'count', type: 'int', min: 1, max: 5 },
    ],
    render: (p, f) =>
      `${Math.max(1, Math.round(p.count * f))} carnivorous ${p.trap} traps among the foliage, edged with small solid teeth`,
  },
  {
    name: 'cipos',
    minRarity: 'epico',
    minStageOrder: 8,   // só a partir de "Jovem"
    params: [
      { key: 'count', type: 'int', min: 2, max: 6 },
      { key: 'length', type: 'enum', values: ['short', 'long trailing'] },
    ],
    render: (p, f) =>
      `${Math.max(1, Math.round(p.count * f))} ${p.length} vines hanging from the stem`,
  },

  // ─── A partir de LENDÁRIO ────────────────────────────────────────────────
  {
    name: 'marca_do_bioma',
    minRarity: 'lendario',
    minStageOrder: 8,          // só a partir de "Jovem"
    independentChance: 0.10,   // fora do pool: 10% das lendárias+
    params: [
      { key: 'intensity', type: 'enum', values: ['a subtle', 'a prominent'] },
    ],
    render: (p, _f, ctx) => {
      const marks: Record<string, string> = {
        tundra:   'cluster of solid ice spines on the leaf tips',
        vulcao:   'burst of solid flame-shaped forms at the stem base',
        montanha: 'set of small rocks embedded in the stem',
        deserto:  'crust of crystallised sand in the leaf folds',
        pantano:  'few solid mushrooms at the base',
        floresta: 'insect burrow hollowed into a stem node',
        selva:    'thick moss climbing the stem',
        oceano:   'coral encrustation on the stem',
        caverna:  'patch of pale cave fungi (solid pigment, never emitting light)',
        planicie: 'bundle of dry seed spikes bound to the stem',
      };
      return `${p.intensity} ${marks[ctx?.biome ?? ''] ?? 'rare mark of its native biome'}`;
    },
  },
];

/**
 * QUANTOS perks a planta ganha, por raridade.
 *
 * Antes era fixo para todos (1 + 33% de um 2º + 11% de um 3º). Agora a raridade
 * aparece de duas formas: perks mais RAROS (pela trava `minRarity`) e mais
 * DELES. `base` é garantido; `extraChance` é a chance de mais um em cima.
 */
export const PERKS_BY_RARITY: Record<Rarity, { base: number; extraChance: number }> = {
  comum:    { base: 1, extraChance: 0.20 },
  incomum:  { base: 1, extraChance: 0.35 },
  raro:     { base: 2, extraChance: 0.25 },
  epico:    { base: 2, extraChance: 0.45 },
  lendario: { base: 3, extraChance: 0.35 },
  brotaria: { base: 3, extraChance: 0.60 },
};

/** Perks elegíveis para uma raridade — respeita a trava e exclui os de sorteio próprio. */
export function poolForRarity(rarity: Rarity): TraitDef[] {
  return TRAITS.filter(
    (t) => t.independentChance == null
      && (!t.minRarity || rarityRank(rarity) >= rarityRank(t.minRarity)),
  );
}

/** Perks de sorteio PRÓPRIO (fora do pool) elegíveis para esta raridade. */
export function independentForRarity(rarity: Rarity): TraitDef[] {
  return TRAITS.filter(
    (t) => t.independentChance != null
      && (!t.minRarity || rarityRank(rarity) >= rarityRank(t.minRarity)),
  );
}

/** Catálogo indexado por nome para lookup rápido. */
export const TRAITS_BY_NAME: Record<string, TraitDef> = Object.fromEntries(
  TRAITS.map((t) => [t.name, t]),
);

export const TRAIT_NAMES = TRAITS.map((t) => t.name);
