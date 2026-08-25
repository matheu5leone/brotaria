import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getWaterUpgradeLevels } from '@/services/waterService';
import { waterMaxFor } from '@/config/economy';
import { addStackableItem } from '@/services/inventoryService';

/**
 * Bebe uma Garrafa de Água: consome o item e credita +1 de água.
 *
 * Com o saldo no teto a garrafa NÃO é gasta — devolve WATER_FULL e o item fica
 * na mochila. É o ponto da garrafa: ela é o estoque que o saldo não comporta, e
 * gastar uma para ganhar zero seria o pior desfecho possível.
 */
export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { itemId } = await request.json().catch(() => ({ itemId: null }));
  if (!itemId) return NextResponse.json({ error: 'Missing itemId' }, { status: 400 });

  try {
    const [{ data: prof }, levels] = await Promise.all([
      supabaseAdmin.from('profiles').select('water_balance').eq('id', user.id).single(),
      getWaterUpgradeLevels(user.id),
    ]);

    const balance = prof?.water_balance ?? 0;
    const max = waterMaxFor(levels.capacity);
    if (balance >= max) {
      return NextResponse.json(
        { error: 'Sua água já está no máximo — guarde a garrafa para depois.', code: 'WATER_FULL' },
        { status: 400 },
      );
    }

    // Consome 1 unidade da garrafa com CAS na quantidade: dois toques rápidos
    // não podem render duas águas com uma garrafa só.
    const { data: item } = await supabaseAdmin
      .from('inventory_items')
      .select('id, quantity')
      .eq('id', itemId)
      .eq('user_id', user.id)
      .eq('item_type', 'garrafa_agua')
      .maybeSingle();

    if (!item) return NextResponse.json({ error: 'Garrafa não encontrada.' }, { status: 404 });

    const consumida = item.quantity > 1
      ? await supabaseAdmin.from('inventory_items')
          .update({ quantity: item.quantity - 1 })
          .eq('id', item.id).eq('quantity', item.quantity).select('id').maybeSingle()
      : await supabaseAdmin.from('inventory_items')
          .delete().eq('id', item.id).eq('quantity', 1).select('id').maybeSingle();

    if (!consumida.data) {
      return NextResponse.json({ error: 'Garrafa já usada.', code: 'RACE' }, { status: 409 });
    }

    // Crédito no mesmo molde do collectWater: CAS no saldo lido.
    const { data: updated } = await supabaseAdmin
      .from('profiles')
      .update({ water_balance: Math.min(balance + 1, max) })
      .eq('id', user.id)
      .eq('water_balance', balance)
      .select('water_balance')
      .maybeSingle();

    if (!updated) {
      // Perdeu a corrida DEPOIS de consumir: devolve a garrafa para ninguém sair
      // no prejuízo. Via addStackableItem, que acha slot livre de verdade.
      await addStackableItem(user.id, 'garrafa_agua').catch(() => {});
      return NextResponse.json({ error: 'Tente de novo.', code: 'RACE' }, { status: 409 });
    }

    return NextResponse.json({ success: true, balance: updated.water_balance });
  } catch (err) {
    console.error('[UseGarrafa]', err);
    return NextResponse.json({ error: 'Falha ao usar a garrafa.' }, { status: 500 });
  }
}
