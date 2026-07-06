import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { supabaseAdmin } from '@/lib/supabaseServer';

/**
 * GET /api/likes?owner=<userId>
 * Retorna o total de curtidas do jardim e se o usuário logado curtiu.
 * Total é público; `liked` só faz sentido se estiver logado (senão false).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const owner = url.searchParams.get('owner');
  if (!owner) return NextResponse.json({ error: 'Missing owner' }, { status: 400 });

  const { count } = await supabaseAdmin
    .from('garden_likes')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', owner);

  let liked = false;
  const user = await getAuthUser(request);
  if (user) {
    const { data } = await supabaseAdmin
      .from('garden_likes')
      .select('id')
      .eq('owner_id', owner)
      .eq('liker_id', user.id)
      .maybeSingle();
    liked = !!data;
  }

  return NextResponse.json({ total: count ?? 0, liked });
}
