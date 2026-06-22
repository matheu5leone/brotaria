import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }
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
