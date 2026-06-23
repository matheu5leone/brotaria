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
export const TRAITS: TraitDef[] = [
  {
    name: 'feliz',
    params: [
      { key: 'has_face', type: 'bool', chance: 0.9 },
      { key: 'rosy_cheeks', type: 'bool', chance: 0.5 },
    ],
    render: (p) =>
      [
        p.has_face ? 'a cute smiling face with big friendly eyes' : 'a cheerful, lively look',
        p.rosy_cheeks ? 'soft rosy cheeks' : '',
      ]
        .filter(Boolean)
        .join(', '),
  },
  {
    name: 'misteriosa',
    params: [
      { key: 'glowing_eyes', type: 'bool', chance: 0.7 },
      { key: 'eye_count', type: 'int', min: 1, max: 4 },
    ],
    render: (p, f) =>
      p.glowing_eyes && f > 0.3
        ? `${Math.max(1, Math.round(p.eye_count * f))} faint glowing eyes peeking through the foliage`
        : 'a mysterious, secretive aura',
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
        `${n} ${p.thorn_size} sharp thorns along the stem` +
        (p.dark_leaf_tips ? ', dark menacing leaf tips' : '')
      );
    },
  },
  {
    name: 'sombria',
    params: [
      { key: 'shadow_aura', type: 'bool', chance: 0.8 },
      { key: 'palette_darkened', type: 'bool', chance: 0.7 },
    ],
    render: (p) =>
      [
        p.palette_darkened ? 'a darkened, desaturated version of its colors' : 'shadowy tones',
        p.shadow_aura ? 'a subtle dark aura around it' : '',
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
      `${Math.max(1, Math.round(p.crystal_count * f))} translucent crystals (color ${p.crystal_color_hex}) growing from the plant`,
  },
  {
    name: 'luminosa',
    params: [
      { key: 'glow_color_hex', type: 'color' },
      { key: 'glow_intensity', type: 'enum', values: ['soft', 'bright'] },
    ],
    render: (p, f) =>
      `a ${f > 0.6 ? p.glow_intensity : 'soft'} glow (color ${p.glow_color_hex}) emanating from the leaves`,
  },
  {
    name: 'venenosa',
    params: [
      { key: 'toxic_spots', type: 'bool', chance: 0.8 },
      { key: 'spot_count', type: 'int', min: 3, max: 14 },
      { key: 'drip_color_hex', type: 'color' },
    ],
    render: (p, f) =>
      [
        p.toxic_spots ? `${Math.max(1, Math.round(p.spot_count * f))} toxic colored spots on the leaves` : '',
        f > 0.5 ? `dripping toxic sap (color ${p.drip_color_hex})` : '',
      ]
        .filter(Boolean)
        .join(', ') || 'a faintly toxic appearance',
  },
  {
    name: 'angelical',
    params: [
      { key: 'halo', type: 'bool', chance: 0.7 },
      { key: 'soft_glow', type: 'bool', chance: 0.9 },
      { key: 'extra_petals', type: 'bool', chance: 0.5 },
    ],
    render: (p, f) =>
      [
        p.halo && f > 0.4 ? 'a delicate halo floating above it' : '',
        p.soft_glow ? 'a gentle angelic glow' : '',
        p.extra_petals ? 'extra soft light-colored petals' : '',
      ]
        .filter(Boolean)
        .join(', ') || 'a serene, angelic presence',
  },
  {
    name: 'flamejante',
    params: [
      { key: 'flame_tips', type: 'bool', chance: 0.9 },
      { key: 'ember_count', type: 'int', min: 2, max: 10 },
      { key: 'flame_color_hex', type: 'color' },
    ],
    render: (p, f) =>
      [
        p.flame_tips ? `flame-like leaf tips (color ${p.flame_color_hex})` : '',
        f > 0.5 ? `${Math.max(1, Math.round(p.ember_count * f))} floating embers around it` : '',
      ]
        .filter(Boolean)
        .join(', ') || 'a warm, fiery hue',
  },
];

/** Catálogo indexado por nome para lookup rápido. */
export const TRAITS_BY_NAME: Record<string, TraitDef> = Object.fromEntries(
  TRAITS.map((t) => [t.name, t]),
);

export const TRAIT_NAMES = TRAITS.map((t) => t.name);
