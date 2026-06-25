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
//    Preparado para Stripe: adicione stripe_price_id quando configurar.
// ─────────────────────────────────────────────────────────────────────────────

export interface CoinPackage {
  id: string;
  /** Preço em reais (BRL). */
  price_brl: number;
  /** Moedas creditadas ao comprar este pacote. */
  coins: number;
  /** Label de exibição na loja. */
  label: string;
  /** Destaque visual (ex.: "mais popular"). */
  highlight?: boolean;
  /**
   * Stripe Price ID — preencher quando a integração Stripe estiver ativa.
   * Formato: price_xxxxxxxxxxxxxxxxxxxx
   * @see https://dashboard.stripe.com/prices
   */
  stripe_price_id?: string;
}

export const COIN_PACKAGES: CoinPackage[] = [
  {
    id: 'pkg_10',
    price_brl: 10,
    coins: 10,
    label: 'Broto',
    // stripe_price_id: 'price_xxx',
  },
  {
    id: 'pkg_50',
    price_brl: 50,
    coins: 65,          // ← bônus de +15 (30% extra) para incentivar
    label: 'Florescendo',
    highlight: true,
    // stripe_price_id: 'price_xxx',
  },
  {
    id: 'pkg_100',
    price_brl: 100,
    coins: 150,         // ← bônus de +50 (50% extra) para incentivar
    label: 'Jardim Pleno',
    // stripe_price_id: 'price_xxx',
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
  /** Regas disponíveis por usuário por dia (reset à meia-noite de Brasília). */
  DAILY_WATER_LIMIT:    10,
  /** Horas de cooldown entre regas da mesma planta. */
  WATER_COOLDOWN_HOURS: 8,

  // ── Pá (canteiro) ─────────────────────────────────────────────────────────
  /** Horas de cooldown para usar a pá novamente. */
  SHOVEL_COOLDOWN_HOURS: 24,
  /** Segundos para cavar um canteiro (animação). */
  DIG_DURATION_SECONDS:  60,

  // ── Recompensas de evolução ────────────────────────────────────────────────
  /**
   * Moedas ganhas ao evoluir = order_index_do_novo_estágio * COINS_PER_STAGE.
   * Exemplo com COINS_PER_STAGE = 3:
   *   enterrada → broto  (order_index 0→1): 3 moedas
   *   broto     → adulta (order_index 1→2): 6 moedas
   */
  COINS_PER_STAGE:  3,
  /** XP ganho por evolução (implementação futura). */
  XP_PER_EVOLUTION: 10,

  // ── Satisfação ────────────────────────────────────────────────────────────
  /** Ponto de satisfação perdido ao exibir rosto triste (mover planta com 0 regas). */
  STRESS_PENALTY: -1,
} as const;

// ── Helpers derivados ─────────────────────────────────────────────────────────

/** Moedas ganhas ao atingir um estágio com o order_index dado. */
export function calcEvolutionCoins(newStageOrderIndex: number): number {
  return newStageOrderIndex * GAME.COINS_PER_STAGE;
}

/** Milissegundos de cooldown de rega. */
export const WATER_COOLDOWN_MS = GAME.WATER_COOLDOWN_HOURS * 60 * 60 * 1000;

/** Milissegundos de cooldown da pá. */
export const SHOVEL_COOLDOWN_MS = GAME.SHOVEL_COOLDOWN_HOURS * 60 * 60 * 1000;

/** Milissegundos de duração da animação de cavar. */
export const DIG_DURATION_MS = GAME.DIG_DURATION_SECONDS * 1_000;
