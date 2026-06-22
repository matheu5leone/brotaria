import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function PATCH(request: Request) {
  try {
    const { userId, itemId, label } = await request.json();
    if (!userId || !itemId) {
      return NextResponse.json({ error: 'Missing userId or itemId' }, { status: 400 });
    }
    const trimmed = typeof label === 'string' ? label.trim().slice(0, 100) : null;
    const { error } = await supabaseAdmin
      .from('inventory_items')
      .update({ label: trimmed || null })
      .eq('id', itemId)
      .eq('user_id', userId)
      .eq('item_type', 'wrapped_plant');
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to update label';
    console.error('[Inventory Label API] Error:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
