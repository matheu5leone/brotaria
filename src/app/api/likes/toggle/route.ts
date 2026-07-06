import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { markReachedForUser } from '@/lib/missionStatus';

/**
 * POST /api/likes/toggle { owner }
 * Liga/desliga a curtida do usuário logado no jardim `owner` (1 por jardim).
 * Só logado pode curtir. Não pode curtir o próprio jardim. Voto anônimo.
 */
export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let owner: unknown;
  try {
    ({ owner } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
  }
  if (!owner || typeof owner !== 'string') {
    return NextResponse.json({ error: 'Missing owner' }, { status: 400 });
  }
  if (owner === user.id) {
    return NextResponse.json({ error: 'Não dá pra curtir o próprio jardim.' }, { status: 400 });
  }

  // Já curtiu? Então desliga; senão, liga.
  const { data: existing } = await supabaseAdmin
    .from('garden_likes')
    .select('id')
    .eq('owner_id', owner)
    .eq('liker_id', user.id)
    .maybeSingle();

  let liked: boolean;
  if (existing) {
    await supabaseAdmin.from('garden_likes').delete().eq('id', existing.id);
    liked = false;
  } else {
    const { error } = await supabaseAdmin
      .from('garden_likes')
      .insert({ owner_id: owner, liker_id: user.id });
    // corrida (23505): já existe → considera curtido
    if (error && (error as { code?: string }).code !== '23505') {
      console.error('[Likes] toggle insert error:', error);
      return NextResponse.json({ error: 'Falha ao curtir.' }, { status: 500 });
    }
    liked = true;
    // Curtida nova pode ter batido a meta de "receber 10" (dono) e "dar 10"
    // (curtidor). Marca reached (pico) para não perder se as curtidas caírem.
    await Promise.all([markReachedForUser(owner), markReachedForUser(user.id)]);
  }

  const { count } = await supabaseAdmin
    .from('garden_likes')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', owner);

  return NextResponse.json({ liked, total: count ?? 0 });
}
