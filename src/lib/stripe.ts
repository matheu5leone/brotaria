import Stripe from 'stripe';

/**
 * Cliente Stripe (server-side apenas) com alternância de modo.
 *
 * STRIPE_MODE controla qual par de chaves é usado:
 *   - 'prod'          → chaves LIVE  (STRIPE_SECRET_KEY_LIVE / STRIPE_WEBHOOK_SECRET_LIVE)
 *   - qualquer outro  → chaves TESTE (STRIPE_SECRET_KEY_TEST / STRIPE_WEBHOOK_SECRET_TEST)
 *
 * Fallback: se a chave sufixada não existir, usa a var legada não sufixada
 * (STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET) — mantém compatibilidade.
 */
export function stripeMode(): 'live' | 'test' {
  return process.env.STRIPE_MODE === 'prod' ? 'live' : 'test';
}

function activeSecretKey(): string | undefined {
  const key = stripeMode() === 'live'
    ? process.env.STRIPE_SECRET_KEY_LIVE
    : process.env.STRIPE_SECRET_KEY_TEST;
  return key || process.env.STRIPE_SECRET_KEY;
}

/** Segredo de assinatura do webhook conforme o modo ativo. */
export function activeWebhookSecret(): string | undefined {
  const secret = stripeMode() === 'live'
    ? process.env.STRIPE_WEBHOOK_SECRET_LIVE
    : process.env.STRIPE_WEBHOOK_SECRET_TEST;
  return secret || process.env.STRIPE_WEBHOOK_SECRET;
}

const secretKey = activeSecretKey();

export const stripe = secretKey ? new Stripe(secretKey) : null;

/** Lança erro claro se o Stripe não estiver configurado para o modo atual. */
export function requireStripe(): Stripe {
  if (!stripe) {
    throw new Error(`Stripe não configurado (STRIPE_MODE=${process.env.STRIPE_MODE ?? 'dev'}).`);
  }
  return stripe;
}
