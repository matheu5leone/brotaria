import { PlantDNA, Biome, Rarity, DNAForm, TraitInstance, TraitDef, TraitParamSpec } from '../types';
import {
  COLOR_NAMES,
  colorFromName,
  LEAF_STYLES,
  LEAF_DENSITIES,
  STEM_STYLES,
  STEM_THICKNESSES,
  GROWTH_PATTERNS,
  MAX_HEIGHT_CM_RANGE,
  FLOWER_CHANCE,
  FRUIT_CHANCE,
  TRAITS,
  TRAITS_BY_NAME,
} from '../config/genome';

const BIOMES: Biome[] = ['planicie', 'floresta', 'deserto', 'montanha', 'pantano'];
const PERSONALITIES = ['feliz', 'misteriosa', 'perigosa', 'sombria', 'tranquila', 'agitada', 'sabia', 'curiosa'];

/* ------------------------------------------------------------------ */
/* Helpers de sorteio                                                  */
/* ------------------------------------------------------------------ */

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomHex(): string {
  return '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
}

/** Sorteia os params de um perk a partir do seu esquema declarado no catálogo. */
function rollTraitParams(specs: TraitParamSpec[]): Record<string, any> {
  const params: Record<string, any> = {};
  for (const spec of specs) {
    switch (spec.type) {
      case 'int':
        params[spec.key] = randInt(spec.min, spec.max);
        break;
      case 'bool':
        params[spec.key] = Math.random() < (spec.chance ?? 0.5);
        break;
      case 'enum':
        params[spec.key] = pick(spec.values);
        break;
      case 'color':
        params[spec.key] = randomHex();
        break;
    }
  }
  return params;
}

/** Cria uma instância de trait (com params sorteados) a partir do catálogo. */
function instantiateTrait(def: TraitDef): TraitInstance {
  return { name: def.name, params: rollTraitParams(def.params) };
}

/* ------------------------------------------------------------------ */
/* Geração de DNA                                                      */
/* ------------------------------------------------------------------ */

function randomForm(): DNAForm {
  const has_flowers = Math.random() < FLOWER_CHANCE;
  const has_fruit = Math.random() < FRUIT_CHANCE;
  return {
    leaf_style: pick(LEAF_STYLES),
    leaf_density: pick(LEAF_DENSITIES),
    stem_style: pick(STEM_STYLES),
    stem_thickness_grown: pick(STEM_THICKNESSES),
    growth_pattern: pick(GROWTH_PATTERNS),
    max_height_cm: randInt(MAX_HEIGHT_CM_RANGE.min, MAX_HEIGHT_CM_RANGE.max),
    has_flowers,
    flower_color_hex: has_flowers ? randomHex() : undefined,
    has_fruit,
    fruit_color_hex: has_fruit ? randomHex() : undefined,
  };
}

export function generateRandomDNA(): PlantDNA {
  const rarity = calculateRarity();
  const personality = pick(PERSONALITIES);

  // Trait inicial: se a personalidade existir no catálogo, começa com ela (sabor);
  // caso contrário, sorteia um perk qualquer do catálogo.
  const initialDef = TRAITS_BY_NAME[personality] ?? pick(TRAITS);

  return {
    biome: pick(BIOMES),
    rarity,
    personality,
    color: colorFromName(pick(COLOR_NAMES)),
    form: randomForm(),
    traits: [instantiateTrait(initialDef)],
  };
}

const RARITY_TABLE: [Rarity, number][] = [
  ['comum',    60],
  ['incomum',  15],
  ['raro',     10],
  ['epico',     5],
  ['lendario',  4],
  ['brotaria',  1],
];

function calculateRarity(): Rarity {
  const total = RARITY_TABLE.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [rarity, weight] of RARITY_TABLE) {
    roll -= weight;
    if (roll < 0) return rarity;
  }
  return 'comum';
}

/* ------------------------------------------------------------------ */
/* Mutação                                                             */
/* ------------------------------------------------------------------ */

export function mutateDNA(dna: PlantDNA): PlantDNA {
  const newDNA: PlantDNA = {
    ...dna,
    color: { ...dna.color },
    form: { ...dna.form },
    traits: dna.traits.map((t) => ({ name: t.name, params: { ...t.params } })),
  };
  const rarity = calculateRarity();

  // Em mutação favorável, adiciona um perk novo (nunca remove/duplica).
  if (rarity !== 'comum') {
    const owned = new Set(newDNA.traits.map((t) => t.name));
    const available = TRAITS.filter((t) => !owned.has(t.name));
    if (available.length > 0) {
      newDNA.traits.push(instantiateTrait(pick(available)));
    }
  }

  return newDNA;
}
