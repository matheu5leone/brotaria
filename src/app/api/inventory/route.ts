import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/getAuthUser';

export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = user.id;
    const { data, error } = await supabaseAdmin
      .from('inventory_items')
      .select('*')
      .eq('user_id', userId)
      .order('slot_index', { ascending: true });
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch inventory';
    console.error('[Inventory API] Error:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
