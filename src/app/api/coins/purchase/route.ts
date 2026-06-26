import { NextResponse } from 'next/server';

/**
 * DESATIVADO — esta rota era um MOCK que creditava moedas sem pagamento real.
 * A compra de moedas agora passa por Stripe Checkout:
 *   POST /api/coins/create-checkout  →  redireciona ao Stripe
 *   POST /api/webhooks/stripe        →  credita após pagamento confirmado
 *
 * Mantida apenas para retornar 410 caso algum cliente antigo ainda a chame.
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Rota desativada. Use /api/coins/create-checkout.' },
    { status: 410 },
  );
}
