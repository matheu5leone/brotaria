import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get('nickname') ?? '';
  const nickname = raw.replace(/^@/, '').trim().toLowerCase();

  if (!nickname) return NextResponse.json({ error: 'Missing nickname' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, nickname, avatar_url')
    .ilike('nickname', nickname)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

  return NextResponse.json(data);
}
