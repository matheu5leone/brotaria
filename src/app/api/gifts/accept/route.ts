import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { findFreeSlot } from '@/services/inventoryService';

export async function POST(request: Request) {
  try {
    const { userId, giftId } = await request.json();
    if (!userId || !giftId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const { data: gift } = await supabaseAdmin
      .from('gifts')
      .select('id, plant_id, sender_id, message')
      .eq('id', giftId)
      .eq('recipient_id', userId)
      .eq('status', 'pending')
      .single();

    if (!gift) return NextResponse.json({ error: 'Presente não encontrado' }, { status: 404 });

    const slot = await findFreeSlot(userId);
    if (slot === null) return NextResponse.json({ error: 'Inventário cheio', code: 'INVENTORY_FULL' }, { status: 400 });

    // Transfere propriedade da planta
    await supabaseAdmin.from('plants').update({ user_id: userId }).eq('id', gift.plant_id);

    // Cria item no inventário do destinatário
    await supabaseAdmin.from('inventory_items').insert({
      user_id: userId,
      slot_index: slot,
      item_type: 'wrapped_plant',
      plant_id: gift.plant_id,
      quantity: 1,
    });

    // Marca presente como aceito
    await supabaseAdmin.from('gifts').update({ status: 'accepted' }).eq('id', giftId);

    // Retorna dados da planta para animação
    const { data: plant } = await supabaseAdmin
      .from('plants')
      .select('dna, current_stage:plant_stages(name, order_index)')
      .eq('id', gift.plant_id)
      .single();

    return NextResponse.json({ success: true, plant, message: gift.message });
  } catch (err: unknown) {
    console.error('[Gift Accept]', err);
    return NextResponse.json({ error: 'Erro ao aceitar presente' }, { status: 500 });
  }
}
