/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  BROTARIA — Configuração Central de Economia
 *  Fonte única de verdade para TODOS os valores monetários e mecânicas de jogo.
 *
 *  Para ajustar o balanceamento: edite apenas este arquivo.
 *  Nenhum valor de preço/limite/recompensa deve ser hardcoded fora daqui.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. PACOTES DE MOEDAS  (R$ → moedas)
//
//    Integração Stripe: o preço (price_brl) é enviado ao Stripe como
//    `price_data` inline na criação do Checkout Session — NÃO é preciso
//    pré-criar produtos/preços no dashboard. Este arquivo é a única fonte
//    de verdade dos preços. Para alterar valores, edite apenas aqui.
// ─────────────────────────────────────────────────────────────────────────────

export interface CoinPackage {
  id: string;
  /** Preço em reais (BRL). Enviado ao Stripe como unit_amount (× 100 centavos). */
  price_brl: number;
  /** Moedas creditadas ao comprar este pacote. */
  coins: number;
  /** Label de exibição na loja. */
  label: string;
  /** Destaque visual (ex.: "mais popular"). */
  highlight?: boolean;
}

export const COIN_PACKAGES: CoinPackage[] = [
  {
    id: 'pkg_10',
    price_brl: 10,
    coins: 10,
    label: 'Saco de moedas',
  },
  {
    id: 'pkg_50',
    price_brl: 50,
    coins: 65,          // ← bônus de +15 (30% extra) para incentivar
    label: 'Cesta de moedas',
    highlight: true,
  },
  {
    id: 'pkg_100',
    price_brl: 100,
    coins: 150,         // ← bônus de +50 (50% extra) para incentivar
    label: 'Baú de moedas',
  },
];

export function getCoinPackage(id: string): CoinPackage | undefined {
  return COIN_PACKAGES.find((p) => p.id === id);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. PRODUTOS DA LOJA  (moedas → itens de jogo)
// ─────────────────────────────────────────────────────────────────────────────

export interface StoreProduct {
  id: string;
  name: string;
  description: string;
  cost_coins: number;
}

export const PRICES = {
  /** Custo de uma semente (moedas). */
  SEED:         5,
  /** Custo de um kit de embrulho (moedas). */
  WRAPPING_KIT: 20,
} as const;

const SEED_PRODUCT: StoreProduct = {
  id:          'seed',
  name:        'Semente',
  description: 'Uma semente para plantar uma planta única no seu jardim.',
  cost_coins:  PRICES.SEED,
};

const WRAPPING_KIT_PRODUCT: StoreProduct = {
  id:          'wrapping_kit',
  name:        '🎁 Kit de Embrulho',
  description: 'Embrulha uma planta como presente misterioso. Fica no inventário sem revelar o conteúdo.',
  cost_coins:  PRICES.WRAPPING_KIT,
};

const SKIP_TIME_PRODUCT: StoreProduct = {
  id:          'skip_time',
  name:        '⏩ Avançar Tempo',
  description: '[DEV] Marca todas as plantas como aguardando rega agora.',
  cost_coins:  0,
};

export const STORE_PRODUCTS: StoreProduct[] = [
  SEED_PRODUCT,
  WRAPPING_KIT_PRODUCT,
  ...(process.env.NODE_ENV !== 'production' ? [SKIP_TIME_PRODUCT] : []),
];

export function getStoreProduct(id: string): StoreProduct | undefined {
  return STORE_PRODUCTS.find((p) => p.id === id);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. MECÂNICAS DE JOGO
// ─────────────────────────────────────────────────────────────────────────────

export const GAME = {
  // ── Rega ──────────────────────────────────────────────────────────────────
  /** Horas de cooldown entre regas da mesma planta. */
  WATER_COOLDOWN_HOURS: 8,

  // ── Água (recurso estocável) ────────────────────────────────────────────
  /** Saldo máximo de água que o jogador pode estocar (upgrade de espaço futuro). */
  WATER_MAX_BALANCE:     5,
  /** Água ganha por coleta bem-sucedida (barra a 100%). */
  WATER_PER_COLLECT:     1,
  /** Cooldown entre coletas (horas). */
  WATER_COLLECT_COOLDOWN_HOURS: 2,

  // ── Coleta de água (mini-game da barra) — parâmetros do cliente ───────────
  /** % que cada clique/toque enche na barra vertical. */
  WATER_BAR_FILL_PER_CLICK: 7,
  /** % que a barra decai a cada tick (exige cliques rápidos). */
  WATER_BAR_DECAY_PER_TICK: 1.5,
  /** Intervalo do tick de decaimento (ms). */
  WATER_BAR_TICK_MS:        50,

  // ── Pá (canteiro) ─────────────────────────────────────────────────────────
  /** Horas de cooldown para usar a pá novamente. */
  SHOVEL_COOLDOWN_HOURS: 24,
  /** Segundos para cavar um canteiro (animação). */
  DIG_DURATION_SECONDS:  60,

  // ── Recompensas de evolução (Herbo) ───────────────────────────────────────
  /**
   * Herbo (🍃) é a moeda orgânica do jogo — ganha por evoluir plantas.
   * Quantidade = calcPlantScore(dna, nextStage.order_index)
   *   score = rarity_weight × stage_order_index × (1 + traits.length × 0.2)
   *
   * Herbo NÃO é comprado com dinheiro real. É obtido apenas jogando.
   * Moedas (coins) são compradas com R$ e gastas na loja.
   */
  /** XP ganho por evolução (implementação futura). */
  XP_PER_EVOLUTION: 10,

  // ── Satisfação ────────────────────────────────────────────────────────────
  /** Ponto de satisfação perdido ao exibir rosto triste (mover planta com 0 regas). */
  STRESS_PENALTY: -1,
} as const;

// ── Helpers derivados ─────────────────────────────────────────────────────────

/** Milissegundos de cooldown de rega. */
export const WATER_COOLDOWN_MS = GAME.WATER_COOLDOWN_HOURS * 60 * 60 * 1000;

/** Milissegundos de cooldown entre coletas de água. */
export const WATER_COLLECT_COOLDOWN_MS = GAME.WATER_COLLECT_COOLDOWN_HOURS * 60 * 60 * 1000;

/** Milissegundos de cooldown da pá. */
export const SHOVEL_COOLDOWN_MS = GAME.SHOVEL_COOLDOWN_HOURS * 60 * 60 * 1000;

/** Milissegundos de duração da animação de cavar. */
export const DIG_DURATION_MS = GAME.DIG_DURATION_SECONDS * 1_000;
