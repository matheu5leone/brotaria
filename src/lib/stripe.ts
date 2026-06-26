import Stripe from 'stripe';

/**
 * Cliente Stripe (server-side apenas).
 * STRIPE_SECRET_KEY deve estar definido no ambiente (Vercel + .env.local).
 */
const secretKey = process.env.STRIPE_SECRET_KEY;

export const stripe = secretKey ? new Stripe(secretKey) : null;

/** Lança erro claro se o Stripe não estiver configurado. */
export function requireStripe(): Stripe {
  if (!stripe) {
    throw new Error('STRIPE_SECRET_KEY não configurado no ambiente.');
  }
  return stripe;
}
