import type { StemStyle, StemThickness, GrowthPattern } from '@/types';

/**
 * ARQUÉTIPOS — o PLANO CORPORAL da planta
 * =========================================================================
 * Antes disto o vocabulário só descrevia erva de folha simples com caule:
 * nem samambaia nem cacto eram alcançáveis, porque faltavam três noções —
 * folha COMPOSTA (folíolos num ráquis), crescimento em ROSETA (sem caule
 * central) e reprodução por ESPORO (sem flor).
 *
 * Perk não resolvia: perk é ornamento pendurado por cima, e samambaia é o
 * corpo inteiro. Por isso o arquétipo vive na FORMA, não nos traits.
 *
 * O arquétipo amarra os eixos de forma coerente (não dá cacto com fronde), e
 * o PESO controla o quanto o jardim muda. `erva` domina de propósito: mexer
 * nos pesos abaixo é o único lugar para dosar a variedade.
 * =========================================================================
 */

/** Arquitetura da folha — o que faltava para fronde, fita e espinho existirem. */
export type LeafArchitecture =
  | 'simple'      // lâmina única (todo o jogo até aqui)
  | 'pinnate'     // folíolos ao longo de um ráquis (fronde)
  | 'bipinnate'   // folíolos subdivididos outra vez (fronde rendada)
  | 'palmate'     // folíolos irradiando de um ponto (leque)
  | 'linear'      // fita longa e estreita (gramínea)
  | 'scale'       // escamas sobrepostas
  | 'succulent'   // folha carnuda e grossa
  | 'spines';     // folha reduzida a espinho (cacto)

/** Como a planta se reproduz — decide se FLOR é sequer possível. */
export type Reproduction = 'flower' | 'spore' | 'cone';

export type PlantArchetype =
  | 'erva' | 'arbusto' | 'suculenta' | 'cacto'
  | 'samambaia' | 'trepadeira' | 'graminea' | 'palmeira';

export interface ArchetypeDef {
  /** Peso no sorteio, relativo à soma de todos. */
  weight: number;
  leaf_architecture: LeafArchitecture;
  reproduction: Reproduction;
  /** Trilhos: quando presentes, substituem o sorteio livre daquele eixo. */
  stem_style?: StemStyle;
  growth_pattern?: GrowthPattern;
  stem_thickness_grown?: StemThickness;
  /** Multiplica a chance de flor. 0 = nunca floresce. */
  flowerMultiplier: number;
  /** Frase injetada no prompt — é o que o gerador de imagem realmente lê. */
  prompt: string;
}

/**
 * PESOS — o dial da feature.
 *
 * Hoje ~70% continua `erva`: 7 em 10 plantas saem exatamente como saíam antes,
 * então o jardim não vira outro jogo da noite para o dia. Subir os outros
 * aumenta a variedade sem tocar em mais nada.
 */
export const ARCHETYPES: Record<PlantArchetype, ArchetypeDef> = {
  erva: {
    weight: 70,
    leaf_architecture: 'simple',
    reproduction: 'flower',
    flowerMultiplier: 1,
    prompt: 'a soft-stemmed herbaceous plant with simple single-blade leaves',
  },

  arbusto: {
    weight: 10,
    leaf_architecture: 'simple',
    reproduction: 'flower',
    stem_style: 'branching',
    stem_thickness_grown: 'woody',
    growth_pattern: 'bushy',
    flowerMultiplier: 1,
    prompt: 'a woody shrub with several branching stems rising from the base',
  },

  suculenta: {
    weight: 6,
    leaf_architecture: 'succulent',
    reproduction: 'flower',
    stem_style: 'none',
    growth_pattern: 'compact',
    flowerMultiplier: 0.4,
    prompt:
      'a succulent growing as a tight ROSETTE of thick fleshy leaves spiralling out from a central point, with no visible stem',
  },

  samambaia: {
    weight: 5,
    leaf_architecture: 'pinnate',
    reproduction: 'spore',
    stem_style: 'none',
    growth_pattern: 'spreading',
    flowerMultiplier: 0,
    prompt:
      'a fern: arching FRONDS rising directly from a basal ROSETTE, with no central stem. Each frond is a COMPOUND leaf — many small paired LEAFLETS arranged along a central RACHIS. Young fronds appear as tightly coiled CROSIERS (fiddleheads) unrolling into open fronds. Rows of spore dots (sori) under the leaflets. A fern NEVER flowers and never bears fruit',
  },

  cacto: {
    weight: 4,
    leaf_architecture: 'spines',
    reproduction: 'flower',
    stem_style: 'none',
    stem_thickness_grown: 'thick',
    growth_pattern: 'compact',
    flowerMultiplier: 0.35,
    prompt:
      'a cactus: a thick swollen water-storing body with vertical RIBS, its leaves reduced entirely to SPINES growing in clusters from areoles along the ribs. No ordinary leaves at all',
  },

  trepadeira: {
    weight: 3,
    leaf_architecture: 'simple',
    reproduction: 'flower',
    stem_style: 'twisting',
    stem_thickness_grown: 'thin',
    growth_pattern: 'vine',
    flowerMultiplier: 1,
    prompt: 'a climbing vine with long twining stems and curling tendrils',
  },

  graminea: {
    weight: 1.5,
    leaf_architecture: 'linear',
    reproduction: 'cone',
    stem_style: 'none',
    growth_pattern: 'tall',
    // 0, não 0.2: quem reproduz por cone NÃO floresce. A "flor" da gramínea é
    // a espiga, que já está descrita no prompt abaixo.
    flowerMultiplier: 0,
    prompt:
      'a grass-like plant: a TUFT of long narrow ribbon leaves rising from the base, topped by a dry seed spike instead of a flower',
  },

  palmeira: {
    weight: 0.5,
    leaf_architecture: 'palmate',
    reproduction: 'flower',
    stem_style: 'straight',
    stem_thickness_grown: 'woody',
    growth_pattern: 'tall',
    flowerMultiplier: 0.3,
    prompt:
      'a small palm: a single stout trunk crowned by a few large fan-shaped fronds whose LEAFLETS radiate from one point',
  },
};

/** Planta anterior ao arquétipo lê como `erva` — nada muda para ela. */
export const DEFAULT_ARCHETYPE: PlantArchetype = 'erva';

/** Sorteia o arquétipo respeitando os pesos. */
export function rollArchetype(): PlantArchetype {
  const entries = Object.entries(ARCHETYPES) as [PlantArchetype, ArchetypeDef][];
  const total = entries.reduce((sum, [, a]) => sum + a.weight, 0);
  let roll = Math.random() * total;
  for (const [name, def] of entries) {
    roll -= def.weight;
    if (roll < 0) return name;
  }
  return DEFAULT_ARCHETYPE;
}

/** Definição do arquétipo, com fallback para plantas antigas (sem o campo). */
export function archetypeOf(name: string | undefined | null): ArchetypeDef {
  return ARCHETYPES[(name as PlantArchetype) ?? DEFAULT_ARCHETYPE] ?? ARCHETYPES[DEFAULT_ARCHETYPE];
}
