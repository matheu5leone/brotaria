import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/getAuthUser';

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { itemId } = await request.json();
    const userId = user.id;
    if (!itemId) return NextResponse.json({ error: 'Missing itemId' }, { status: 400 });

    const { data: item, error: itemError } = await supabaseAdmin
      .from('inventory_items')
      .select('id, plant_id')
      .eq('id', itemId)
      .eq('user_id', userId)
      .eq('item_type', 'wrapped_plant')
      .single();

    if (itemError || !item?.plant_id)
      return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 });

    // Muda tipo para 'plant' (sem animação) e pausa a planta
    await Promise.all([
      supabaseAdmin
        .from('inventory_items')
        .update({ item_type: 'plant', label: null })
        .eq('id', itemId),
      supabaseAdmin
        .from('plants')
        .update({ hydration_status: 'paused', next_water_needed_at: null })
        .eq('id', item.plant_id),
    ]);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[Unwrap API]', err);
    return NextResponse.json({ error: 'Erro ao desfazer embrulho' }, { status: 500 });
  }
}
