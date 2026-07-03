/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  BROTARIA — Cupons de campanha (early access)
 *
 *  Fonte única dos cupons. Cada cupom aponta para um pacote de COIN_PACKAGES
 *  (economy.ts) e concede as moedas dele DE GRAÇA, uma única vez por conta.
 *
 *  Regra de campanha: dentro de uma mesma campanha, a conta só pode resgatar
 *  UM cupom (enforçado por constraint no banco — ver migration coupons).
 *
 *  Para adicionar cupom: acrescente uma entrada aqui apontando pra um packageId
 *  existente. Para nova campanha: adicione um valor em CAMPAIGNS.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const CAMPAIGNS = {
  CLOSED_BETA: 'CLOSED_BETA',
} as const;

export type Campaign = typeof CAMPAIGNS[keyof typeof CAMPAIGNS];

export interface Coupon {
  /** Código digitado pelo usuário (sempre em UPPERCASE). */
  code: string;
  /** Campanha à qual pertence — só 1 cupom por campanha por conta. */
  campaign: Campaign;
  /** Pacote de COIN_PACKAGES cujas moedas são concedidas de graça. */
  packageId: string;
}

export const COUPONS: Coupon[] = [
  { code: 'BIGBROTARIA',   campaign: CAMPAIGNS.CLOSED_BETA, packageId: 'pkg_10'  },
  { code: 'SUPERBROTARIA', campaign: CAMPAIGNS.CLOSED_BETA, packageId: 'pkg_50'  },
  { code: 'HYPERBROTARIA', campaign: CAMPAIGNS.CLOSED_BETA, packageId: 'pkg_100' },
];

/** Busca um cupom pelo código (case-insensitive, ignora espaços nas pontas). */
export function getCoupon(code: string): Coupon | undefined {
  const norm = code.trim().toUpperCase();
  return COUPONS.find((c) => c.code === norm);
}
