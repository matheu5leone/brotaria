import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { findFreeSlot } from '@/services/inventoryService';
import { getAuthUser } from '@/lib/getAuthUser';

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { itemId, recipientNickname, message } = await request.json();
    const userId = user.id;
    if (!itemId || !recipientNickname)
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    // 1. Verifica o item
    const { data: item } = await supabaseAdmin
      .from('inventory_items')
      .select('id, plant_id')
      .eq('id', itemId)
      .eq('user_id', userId)
      .eq('item_type', 'wrapped_plant')
      .single();

    if (!item?.plant_id)
      return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 });

    // 2. Encontra destinatário por nickname
    const nick = (recipientNickname as string).replace(/^@/, '').trim().toLowerCase();
    const { data: recipient } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .ilike('nickname', nick)
      .single();

    if (!recipient)
      return NextResponse.json({ error: 'Usuário @' + nick + ' não encontrado' }, { status: 404 });

    if (recipient.id === userId)
      return NextResponse.json({ error: 'Não pode presentear a si mesmo' }, { status: 400 });

    // 3. Remove o item do inventário do remetente
    await supabaseAdmin.from('inventory_items').delete().eq('id', itemId);

    // 4. Cria registro de presente
    const { error: giftError } = await supabaseAdmin.from('gifts').insert({
      sender_id: userId,
      recipient_id: recipient.id,
      plant_id: item.plant_id,
      message: message ?? null,
      status: 'pending',
      item_type: 'wrapped_plant',
    });

    if (giftError) {
      // Compensação: devolver item ao remetente
      const slot = await findFreeSlot(userId);
      if (slot !== null)
        await supabaseAdmin.from('inventory_items').insert({
          user_id: userId, slot_index: slot,
          item_type: 'wrapped_plant', plant_id: item.plant_id, quantity: 1,
        });
      throw giftError;
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[Gift Send]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro ao enviar presente' }, { status: 500 });
  }
}
