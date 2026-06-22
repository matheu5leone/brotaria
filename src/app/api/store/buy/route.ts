import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getStoreProduct } from '@/config/economy';
import { processGrowth } from '@/services/growthService';
import { addStackableItem } from '@/services/inventoryService';

/**
 * Compra de um produto da loja usando moedas.
 *
 * Suporta múltiplos produtos (seed, wrapping_kit). Gasta moedas de forma atômica (RPC
 * spend_coins) e entrega o item ao inventário via addStackableItem. Se a entrega
 * falhar após o débito, faz refund das moedas (add_coins).
 */
export async function POST(request: Request) {
  try {
    const { userId, productId } = await request.json();

    if (!userId || !productId) {
      return NextResponse.json({ error: 'Missing userId or productId' }, { status: 400 });
    }

    const product = getStoreProduct(productId);
    if (!product) {
      return NextResponse.json({ error: 'Invalid product' }, { status: 400 });
    }

    // Produtos de custo zero não passam por débito (evita chamada desnecessária ao RPC).
    if (product.cost_coins === 0) {
      if (product.id === 'skip_time') {
        if (process.env.NODE_ENV === 'production') {
          return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
        }
        await processGrowth();
        return NextResponse.json({ success: true, product: 'skip_time' });
      }
      // Produto grátis desconhecido — não deveria chegar aqui
      return NextResponse.json({ error: 'Invalid free product' }, { status: 400 });
    }

    // 1) Débito atômico das moedas.
    const { data: newBalance, error: spendError } = await supabaseAdmin.rpc('spend_coins', {
      p_user_id: userId,
      p_amount: product.cost_coins,
    });

    if (spendError) {
      const msg = spendError.message || '';
      if (msg.includes('INSUFFICIENT_COINS')) {
        return NextResponse.json(
          { error: 'Moedas insuficientes', code: 'INSUFFICIENT_COINS' },
          { status: 400 }
        );
      }
      throw spendError;
    }

    // 2) Entrega o produto.
    if (product.id === 'seed' || product.id === 'wrapping_kit') {
      try {
        await addStackableItem(userId, product.id as 'seed' | 'wrapping_kit');
      } catch (deliveryError: unknown) {
        // Refund em caso de falha na entrega
        await supabaseAdmin.rpc('add_coins', { p_user_id: userId, p_amount: product.cost_coins });
        throw deliveryError;
      }
    }

    // Log da "transação" interna (gasto de moedas, sem valor em reais).
    await supabaseAdmin.from('transactions').insert({
      user_id: userId,
      item_type: product.id,
      amount: 0,
      status: 'completed',
    });

    return NextResponse.json({ success: true, coins: newBalance, product: product.id });
  } catch (error) {
    console.error('[Store Buy API] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to buy product';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
