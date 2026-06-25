import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { findFreeSlot } from '@/services/inventoryService';

export async function POST(request: Request) {
  try {
    const { userId, giftId } = await request.json();
    if (!userId || !giftId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const { data: gift } = await supabaseAdmin
      .from('gifts')
      .select('id, plant_id, sender_id')
      .eq('id', giftId)
      .eq('recipient_id', userId)
      .eq('status', 'pending')
      .single();

    if (!gift) return NextResponse.json({ error: 'Presente não encontrado' }, { status: 404 });

    // Devolve ao remetente
    const slot = await findFreeSlot(gift.sender_id);
    if (slot !== null) {
      await supabaseAdmin.from('inventory_items').insert({
        user_id: gift.sender_id,
        slot_index: slot,
        item_type: 'wrapped_plant',
        plant_id: gift.plant_id,
        quantity: 1,
      });
    }

    await supabaseAdmin.from('gifts').update({ status: 'declined' }).eq('id', giftId);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[Gift Decline]', err);
    return NextResponse.json({ error: 'Erro ao recusar presente' }, { status: 500 });
  }
}
