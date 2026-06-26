import { NextResponse } from 'next/server';
import { requireStripe } from '@/lib/stripe';
import { getCoinPackage } from '@/config/economy';
import { getAuthUser } from '@/lib/getAuthUser';

/**
 * Cria uma Stripe Checkout Session (hosted) para a compra de um pacote de moedas.
 *
 * O preço vem SEMPRE do servidor (economy.ts), nunca do cliente — o cliente só
 * envia o packageId. As moedas são creditadas pelo webhook após o pagamento
 * confirmado (NÃO aqui), garantindo que só se credita pagamento real.
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { packageId } = await request.json();
    if (!packageId) return NextResponse.json({ error: 'Missing packageId' }, { status: 400 });

    const pkg = getCoinPackage(packageId);
    if (!pkg) return NextResponse.json({ error: 'Pacote inválido' }, { status: 400 });

    const stripe = requireStripe();
    const origin = request.headers.get('origin') ?? new URL(request.url).origin;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      // Preço definido inline a partir da config do servidor (fonte única de verdade)
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'brl',
            unit_amount: Math.round(pkg.price_brl * 100), // reais → centavos
            product_data: {
              name: `${pkg.label} — ${pkg.coins} moedas`,
              description: 'Moedas para o seu jardim na Brotaria',
            },
          },
        },
      ],
      // Metadata é a chave usada pelo webhook para creditar o usuário certo
      metadata: {
        userId: user.id,
        packageId: pkg.id,
        coins: String(pkg.coins),
      },
      success_url: `${origin}/loja?success={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/loja?canceled=1`,
      ...(user.email ? { customer_email: user.email } : {}),
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao iniciar pagamento';
    console.error('[Create Checkout] Error:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
