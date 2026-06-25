import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

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
