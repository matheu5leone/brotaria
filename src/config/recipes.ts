/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  BROTARIA — Receitas da Oficina
 *
 *  Conteúdo em TypeScript, como missions.ts e genome/archetypes.ts. O banco não
 *  guarda receita: a RPC `craft_consume_and_grant` é só o braço mecânico
 *  (consome N de um tipo, entrega 1 de outro, atômico). Quem decide o que casa
 *  com o quê é o servidor, lendo daqui.
 *
 *  Como o craft acontece: o jogador põe os ingredientes na mesa, arrasta o
 *  macetador e joga o minigame de macetar (o do poço, com metade da
 *  dificuldade). Só ao vencer o servidor é chamado.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { GAME, stackMaxFor } from './economy';
import type { StackableItemType } from '@/services/inventoryService';

export interface Recipe {
  id: string;
  /** Nome na página do grimório. */
  name: string;
  /** Uma frase: o que o item faz. */
  description: string;
  input: { type: StackableItemType; qty: number };
  output: { type: StackableItemType };
  /**
   * Como a receita se fecha. Cada estação pede uma HABILIDADE diferente — se as
   * duas fossem barra-no-toque, seriam a mesma coisa com outro sprite.
   *   macetar → velocidade (bater rápido, o poço com metade da dificuldade)
   *   torcer  → gesto (girar o pano em círculo até espremer a água)
   */
  minigame: 'macetar' | 'torcer';
  /** Sprite do resultado (o ITEM_VISUAL e a fonte para os icones na mochila). */
  image?: string;
}

export const RECIPES: Recipe[] = [
  {
    id: 'elixir',
    name: 'Elixir Floral',
    description: 'Re-sorteia o intervalo de sede de uma planta. Arraste sobre ela para usar.',
    input: { type: 'polen', qty: GAME.ELIXIR_POLEN_COST },
    output: { type: 'elixir' },
    minigame: 'macetar',
    image: '/imgs/elixir.webp',
  },
  {
    id: 'garrafa_agua',
    name: 'Garrafa de Água',
    description: 'Vale +1 de água na hora de usar. Guardada na mochila, ela espera o momento em que você precisa.',
    input: { type: 'terra_molhada', qty: 3 },
    output: { type: 'garrafa_agua' },
    minigame: 'torcer',
    image: '/imgs/craft/garrafa-de-agua.webp',
  },
];

export function getRecipe(id: string): Recipe | undefined {
  return RECIPES.find((r) => r.id === id);
}

/** Teto de stack do resultado — a RPC precisa dele para saber se empilha. */
export function outputStackMax(recipe: Recipe): number {
  return stackMaxFor(recipe.output.type);
}

/**
 * MINIGAME DE MACETAR — o do poço com METADE da dificuldade.
 *
 * No poço: +7 por toque contra −1,5 a cada 50ms (−30/s), ou seja, é preciso
 * passar de ~4,3 toques por segundo para a barra subir. Aqui o decaimento cai
 * pela metade (−15/s), então ~2,2 toques por segundo já enchem — a metade
 * exata do esforço, mantendo o mesmo enchimento por toque para o gesto
 * continuar reconhecível.
 */
export const CRAFT_BAR = {
  FILL_PER_CLICK: GAME.WATER_BAR_FILL_PER_CLICK,
  DECAY_PER_TICK: GAME.WATER_BAR_DECAY_PER_TICK / 2,
  TICK_MS:        GAME.WATER_BAR_TICK_MS,
} as const;

/**
 * TORCER O PANO — espremer a terra molhada até pingar água.
 *
 * Aqui o desafio não é rapidez, é o GESTO: o jogador gira o dedo em volta do
 * pano e a rotação acumulada é o progresso. Conta giro nos dois sentidos (torcer
 * é vaivém), então não pune quem inverte a mão.
 *
 * Sem decaimento de propósito: numa tela pequena, perder progresso por parar o
 * dedo um instante transformaria um gesto gostoso em teste de perícia — e o
 * teste de perícia já é do macetador.
 */
export const CRAFT_TORCER = {
  /** Voltas completas para encher a garrafa. */
  VOLTAS: 3,
  /** Rotação total exigida, em radianos. */
  get RAD_TOTAL() { return this.VOLTAS * 2 * Math.PI; },
  /** Ignora tremida de dedo parado (rad por evento). */
  RUIDO_MIN: 0.01,
  /** Trava saltos absurdos (dedo que pula de um lado ao outro do círculo). */
  SALTO_MAX: Math.PI / 2,
} as const;
