import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { requireStripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabaseServer';

/**
 * Webhook do Stripe — FONTE DE VERDADE para creditar moedas.
 *
 * Stripe chama esta rota diretamente (sem JWT); a autenticidade é garantida
 * pela verificação de assinatura com STRIPE_WEBHOOK_SECRET.
 *
 * IMPORTANTE: precisa do corpo bruto (raw) para verificar a assinatura.
 * No App Router, request.text() entrega o corpo sem parsing.
 */

// Evita cache/otimizações que poderiam alterar o corpo bruto
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET não configurado.');
    return NextResponse.json({ error: 'Webhook não configurado' }, { status: 500 });
  }

  const stripe = requireStripe();
  const signature = request.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Sem assinatura' }, { status: 400 });

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Assinatura inválida';
    console.error('[Stripe Webhook] Falha na verificação:', msg);
    return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 });
  }

  // Só nos interessa o pagamento concluído
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    // Pagamento precisa estar de fato pago (cartões instantâneos => 'paid')
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ received: true, skipped: 'not_paid' });
    }

    const userId = session.metadata?.userId;
    const coins = Number(session.metadata?.coins ?? 0);
    const amountBrl = (session.amount_total ?? 0) / 100;

    if (!userId || coins <= 0) {
      console.error('[Stripe Webhook] Metadata ausente/inválida:', session.id);
      return NextResponse.json({ received: true, skipped: 'bad_metadata' });
    }

    // Idempotência: se já processamos esta sessão, não credita de novo
    const { data: existing } = await supabaseAdmin
      .from('transactions')
      .select('id')
      .eq('stripe_session_id', session.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Credita as moedas (RPC atômico)
    const { error: creditError } = await supabaseAdmin.rpc('add_coins', {
      p_user_id: userId,
      p_amount: coins,
    });

    if (creditError) {
      console.error('[Stripe Webhook] Falha ao creditar moedas:', creditError);
      // Retorna 500 para que o Stripe reenvie o evento (retry automático)
      return NextResponse.json({ error: 'Falha ao creditar' }, { status: 500 });
    }

    // Registra a transação (também serve de marca de idempotência)
    await supabaseAdmin.from('transactions').insert({
      user_id: userId,
      item_type: 'coins',
      amount: amountBrl,
      status: 'completed',
      stripe_session_id: session.id,
    });

    console.log(`[Stripe Webhook] Creditadas ${coins} moedas a ${userId} (R$${amountBrl})`);
  }

  return NextResponse.json({ received: true });
}
