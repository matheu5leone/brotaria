import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getCoinPackage } from '@/config/economy';
import { getAuthUser } from '@/lib/getAuthUser';

/**
 * Compra de um pacote de moedas.
 *
 * MOCK: o pagamento (Stripe) ainda não existe — ao chamar esta rota as moedas
 * são creditadas direto. O valor de moedas vem da config do servidor (nunca do
 * client) buscando o pacote por `packageId`.
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { packageId } = await request.json();
    const userId = user.id;

    if (!packageId) {
      return NextResponse.json({ error: 'Missing packageId' }, { status: 400 });
    }

    const pkg = getCoinPackage(packageId);
    if (!pkg) {
      return NextResponse.json({ error: 'Invalid package' }, { status: 400 });
    }

    // TODO(stripe): aqui entraria a criação/confirmação do pagamento.
    // Por enquanto creditamos as moedas diretamente (mock).
    const { data: newBalance, error: creditError } = await supabaseAdmin.rpc('add_coins', {
      p_user_id: userId,
      p_amount: pkg.coins,
    });

    if (creditError) throw creditError;

    // Registra a transação (mock como 'completed').
    await supabaseAdmin.from('transactions').insert({
      user_id: userId,
      item_type: 'coins',
      amount: pkg.price_brl,
      status: 'completed',
    });

    return NextResponse.json({ success: true, coins: newBalance, granted: pkg.coins });
  } catch (error) {
    console.error('[Coins Purchase API] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to purchase coins';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
