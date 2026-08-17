import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { supabaseAdmin } from '@/lib/supabaseServer';

/**
 * Planta num canteiro vazio uma planta que está NA MOCHILA (recebida de
 * presente ou recolhida com o carrinho).
 *
 * Diferente de /api/plants/plant, que consome uma SEMENTE e cria uma planta
 * nova: aqui a planta já existe, só está sem canteiro.
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { itemId, potId } = await request.json();
    if (!itemId || !potId) return NextResponse.json({ error: 'Missing itemId or potId' }, { status: 400 });

    // Dono + tipo conferidos na query: ninguém planta item alheio.
    const { data: item } = await supabaseAdmin
      .from('inventory_items')
      .select('id, plant_id')
      .eq('id', itemId)
      .eq('user_id', user.id)
      .eq('item_type', 'plant')
      .maybeSingle();
    if (!item?.plant_id) return NextResponse.json({ error: 'Planta não encontrada na mochila.' }, { status: 404 });

    const { data: pot } = await supabaseAdmin
      .from('pots')
      .select('id, plant_id, digging_started_at, dig_duration_ms, dig_claimed_at')
      .eq('id', potId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!pot) return NextResponse.json({ error: 'Canteiro não encontrado.' }, { status: 404 });
    if (pot.plant_id) {
      return NextResponse.json({ error: 'Este canteiro já tem planta.', code: 'OCCUPIED' }, { status: 409 });
    }
    // Obra em andamento ou não concluída não recebe planta — mesma regra do
    // plantio por semente, que só aceita canteiro no estado 'ready'.
    const pronto = !pot.digging_started_at
      || (!!pot.dig_claimed_at
          && Date.now() >= new Date(pot.digging_started_at).getTime() + (pot.dig_duration_ms ?? 60_000));
    if (!pronto) {
      return NextResponse.json({ error: 'Este canteiro ainda não está pronto.', code: 'NOT_READY' }, { status: 409 });
    }

    // CAS no canteiro: só ocupa se ainda estiver vazio (dois arrastes simultâneos
    // não podem plantar duas plantas no mesmo lugar).
    const { data: taken } = await supabaseAdmin
      .from('pots')
      .update({ plant_id: item.plant_id })
      .eq('id', potId)
      .is('plant_id', null)
      .select('id')
      .maybeSingle();
    if (!taken) {
      return NextResponse.json({ error: 'Este canteiro já tem planta.', code: 'OCCUPIED' }, { status: 409 });
    }

    await supabaseAdmin.from('plants').update({ pot_id: potId }).eq('id', item.plant_id);
    // Só some da mochila DEPOIS de estar no canteiro: se algo falhar antes, a
    // planta continua guardada em vez de sumir do jogo.
    await supabaseAdmin.from('inventory_items').delete().eq('id', itemId).eq('user_id', user.id);

    return NextResponse.json({ success: true, plantId: item.plant_id });
  } catch (error: unknown) {
    console.error('[Plant Place API] Error:', error);
    return NextResponse.json({ error: 'Falha ao plantar.' }, { status: 500 });
  }
}
