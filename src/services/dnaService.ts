import { PlantDNA, Biome, Rarity, DNAForm, TraitInstance, TraitDef, TraitParamSpec } from '../types';
import { rarityRank } from '../config/rarity';
import { ARCHETYPES, rollArchetype } from '../config/genome/archetypes';
import {
  randomColor,
  LEAF_STYLES,
  LEAF_DENSITIES,
  STEM_STYLES,
  STEM_THICKNESSES,
  GROWTH_PATTERNS,
  MAX_HEIGHT_CM_RANGE,
  FLOWER_CHANCE,
  FRUIT_CHANCE,
  YOUNG_FLOWER_CHANCE,
  TREE_POTENTIAL_CHANCE,
  TRAITS,
  PERKS_BY_RARITY,
  poolForRarity,
  independentForRarity,
} from '../config/genome';

const BIOMES: Biome[] = [
  'planicie', 'floresta', 'deserto', 'montanha', 'pantano',
  'oceano', 'vulcao', 'tundra', 'selva', 'caverna',
];

// Personalidade é só um rótulo de "sabor" (alimenta a descrição). Não está mais
// ligada ao perk inicial (perks agora são 100% aleatórios — ver rollInitialTraits).
const PERSONALITIES = [
  'feliz', 'misteriosa', 'perigosa', 'sombria', 'tranquila', 'agitada', 'sabia', 'curiosa',
  'raiva', 'medo', 'angustia', 'descolada', 'gotica', 'tropical', 'gelada', 'cavernosa',
  'cyber', 'carnivora', 'melancolica', 'radiante', 'selvagem', 'ancestral', 'majestosa',
  'brincalhona', 'timida', 'orgulhosa', 'mistica', 'festiva', 'guerreira', 'sonhadora',
  'rebelde', 'serena', 'noturna', 'faminta', 'real', 'zen',
];

// Perks no plantio: 1 garantido; 33% de um 2º; se veio o 2º, 11% de um 3º.
const SECOND_PERK_CHANCE = 0.33;
const THIRD_PERK_CHANCE = 0.11;

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
  // O arquétipo vem primeiro: ele põe trilhos nos eixos que não podem brigar
  // entre si (cacto não tem fronde) e zera a flor de quem não floresce.
  const archetype = rollArchetype();
  const arch = ARCHETYPES[archetype];

  const has_flowers = Math.random() < FLOWER_CHANCE * arch.flowerMultiplier;
  const has_flowers_young = Math.random() < YOUNG_FLOWER_CHANCE * arch.flowerMultiplier;
  const anyFlowers = has_flowers || has_flowers_young;
  // Fruto segue a flor: quem não floresce não frutifica (samambaia, gramínea).
  // Sem isto o DNA dizia 'tem fruto' enquanto o prompt dizia 'nunca frutifica'.
  const has_fruit = anyFlowers && Math.random() < FRUIT_CHANCE;
  return {
    archetype,
    leaf_architecture: arch.leaf_architecture,
    reproduction: arch.reproduction,
    leaf_style: pick(LEAF_STYLES),
    leaf_density: pick(LEAF_DENSITIES),
    // Trilho do arquétipo quando existe; senão, sorteio livre de sempre.
    stem_style: arch.stem_style ?? pick(STEM_STYLES),
    stem_thickness_grown: arch.stem_thickness_grown ?? pick(STEM_THICKNESSES),
    growth_pattern: arch.growth_pattern ?? pick(GROWTH_PATTERNS),
    max_height_cm: randInt(MAX_HEIGHT_CM_RANGE.min, MAX_HEIGHT_CM_RANGE.max),
    has_flowers,
    has_flowers_young,
    flower_color_hex: anyFlowers ? randomHex() : undefined,
    has_fruit,
    fruit_color_hex: has_fruit ? randomHex() : undefined,
    tree_potential: Math.random() < TREE_POTENTIAL_CHANCE,
  };
}

/**
 * Perks de nascença, agora dependentes da RARIDADE.
 *
 * O pool só inclui perks cuja trava `minRarity` a planta alcança, e a
 * QUANTIDADE vem de PERKS_BY_RARITY — planta rara sai com mais perks e com
 * acesso aos perks travados.
 *
 * Perks de sorteio próprio (`independentChance`) ficam FORA do pool e são
 * rolados à parte: é o que mantém `marca_do_bioma` rara mesmo numa lendária,
 * em vez de virar quase certa por ser um entre poucos do topo.
 */
function rollInitialTraits(rarity: Rarity): TraitInstance[] {
  const pool = poolForRarity(rarity);
  const chosen: TraitDef[] = [];
  const take = () => chosen.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);

  const { base, extraChance } = PERKS_BY_RARITY[rarity];
  for (let i = 0; i < base && pool.length; i++) take();
  if (Math.random() < extraChance && pool.length) take();

  for (const def of independentForRarity(rarity)) {
    if (Math.random() < (def.independentChance ?? 0)) chosen.push(def);
  }

  return chosen.map(instantiateTrait);
}

/**
 * Gera um DNA aleatório.
 * - `minRarity` (semente reciclada) atua como PISO de raridade: rola a tabela
 *   normal e eleva ao piso se cair abaixo (chances acima do piso inalteradas).
 * - `biome` (semente-bioma da colheita adulta) TRAVA o bioma; sem raridade.
 */
export function generateRandomDNA(minRarity?: Rarity, biome?: Biome): PlantDNA {
  let rarity = calculateRarity();
  if (minRarity && rarityRank(rarity) < rarityRank(minRarity)) rarity = minRarity;
  return {
    biome: biome ?? pick(BIOMES),
    rarity,
    personality: pick(PERSONALITIES),
    color: randomColor(),
    form: randomForm(),
    traits: rollInitialTraits(rarity),
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
  //
  // O dado acima só decide SE aparece perk novo. QUAL perk é limitado pela
  // raridade da PRÓPRIA planta — senão uma comum ganharia perk lendário pela
  // porta dos fundos, driblando a trava do plantio.
  if (rarity !== 'comum') {
    const owned = new Set(newDNA.traits.map((t) => t.name));
    const available = poolForRarity(dna.rarity).filter((t) => !owned.has(t.name));
    if (available.length > 0) {
      newDNA.traits.push(instantiateTrait(pick(available)));
    }
  }

  return newDNA;
}
