import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { findFreeSlot } from '@/services/inventoryService';
import { getAuthUser } from '@/lib/getAuthUser';

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { plantId } = await request.json();
    const userId = user.id;

    if (!plantId) {
      return NextResponse.json({ error: 'Missing plantId' }, { status: 400 });
    }

    // 1. Verifica que o usuário tem kit de embrulho
    const { data: kitSlot, error: kitError } = await supabaseAdmin
      .from('inventory_items')
      .select('id, quantity')
      .eq('user_id', userId)
      .eq('item_type', 'wrapping_kit')
      .gt('quantity', 0)
      .order('slot_index', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (kitError) throw kitError;
    if (!kitSlot) {
      return NextResponse.json({ error: 'Sem kit de embrulho', code: 'NO_KIT' }, { status: 400 });
    }

    // 2. Verifica que a planta pertence ao usuário e está num pot
    const { data: plant, error: plantError } = await supabaseAdmin
      .from('plants')
      .select('id, pot_id, user_id')
      .eq('id', plantId)
      .eq('user_id', userId)
      .maybeSingle();

    if (plantError) throw plantError;
    if (!plant) {
      return NextResponse.json({ error: 'Planta não encontrada' }, { status: 404 });
    }
    if (!plant.pot_id) {
      return NextResponse.json({ error: 'Planta não está num vaso', code: 'PLANT_NOT_IN_POT' }, { status: 400 });
    }

    // 3. Verifica slot livre no inventário
    const freeSlot = await findFreeSlot(userId);
    if (freeSlot === null) {
      return NextResponse.json({ error: 'Inventário cheio', code: 'INVENTORY_FULL' }, { status: 400 });
    }

    // 4. Transação atômica: remove planta do pot → cria wrapped_plant → decrementa kit
    const potId = plant.pot_id;

    const { error: potError } = await supabaseAdmin
      .from('pots')
      .update({ plant_id: null })
      .eq('id', potId);
    if (potError) throw potError;

    const { data: newItem, error: insertError } = await supabaseAdmin
      .from('inventory_items')
      .insert({
        user_id: userId,
        slot_index: freeSlot,
        item_type: 'wrapped_plant',
        plant_id: plantId,
        quantity: 1,
      })
      .select()
      .single();
    if (insertError) {
      // Compensate: put the plant back in its pot to avoid orphaning it
      await supabaseAdmin.from('pots').update({ plant_id: plantId }).eq('id', potId);
      throw insertError;
    }

    if (kitSlot.quantity > 1) {
      await supabaseAdmin
        .from('inventory_items')
        .update({ quantity: kitSlot.quantity - 1 })
        .eq('id', kitSlot.id);
    } else {
      await supabaseAdmin.from('inventory_items').delete().eq('id', kitSlot.id);
    }

    return NextResponse.json({ success: true, item: newItem });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to wrap plant';
    console.error('[Use Kit API] Error:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
