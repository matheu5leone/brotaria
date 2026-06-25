import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/getAuthUser';

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = user.id;

  const { data, error } = await supabaseAdmin
    .from('gifts')
    .select(`
      id, message, created_at,
      plant:plants(id, dna, current_stage:plant_stages(name, order_index)),
      sender:profiles!sender_id(id, nickname, avatar_url)
    `)
    .eq('recipient_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
