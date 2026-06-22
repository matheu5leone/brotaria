/**
 * Configuração da economia do jogo — fonte única de verdade.
 *
 * Importada tanto pela UI quanto pelas rotas de API. O servidor NUNCA confia em
 * valores (preço/moedas) enviados pelo client: ele busca o pacote/produto por
 * `id` aqui e usa os valores desta config.
 *
 * Fluxo: R$ -> moedas -> produtos (sementes).
 */

export interface CoinPackage {
  id: string;
  /** Preço em reais (mockado por enquanto — Stripe no fim do projeto). */
  price_brl: number;
  /** Moedas creditadas ao comprar este pacote. */
  coins: number;
}

export const COIN_PACKAGES: CoinPackage[] = [
  { id: 'pkg_10', price_brl: 10, coins: 10 },
  { id: 'pkg_50', price_brl: 50, coins: 60 },
  { id: 'pkg_100', price_brl: 100, coins: 140 },
];

export function getCoinPackage(id: string): CoinPackage | undefined {
  return COIN_PACKAGES.find((p) => p.id === id);
}

/** Custo em moedas de uma semente. */
export const SEED_COST_COINS = 5;

export interface StoreProduct {
  id: string;
  name: string;
  description: string;
  cost_coins: number;
}

const SEED_PRODUCT: StoreProduct = {
  id: 'seed',
  name: 'Semente',
  description: 'Uma semente para plantar uma planta única no seu jardim.',
  cost_coins: SEED_COST_COINS,
};

const WRAPPING_KIT_PRODUCT: StoreProduct = {
  id: 'wrapping_kit',
  name: '🎁 Kit de Embrulho',
  description: 'Embrulha uma planta como presente misterioso. Ela fica no inventário sem revelar o que tem dentro.',
  cost_coins: 20,
};

const SKIP_TIME_PRODUCT: StoreProduct = {
  id: 'skip_time',
  name: '⏩ Avançar Tempo',
  description: '[DEV] Marca todas as plantas como aguardando rega agora.',
  cost_coins: 0,
};

export const STORE_PRODUCTS: StoreProduct[] = [
  SEED_PRODUCT,
  WRAPPING_KIT_PRODUCT,
  ...(process.env.NODE_ENV !== 'production' ? [SKIP_TIME_PRODUCT] : []),
];

export function getStoreProduct(id: string): StoreProduct | undefined {
  return STORE_PRODUCTS.find((p) => p.id === id);
}
