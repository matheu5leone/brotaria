import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { getGnomeStatus } from '@/services/gnomeService';
import { supabaseAdmin } from '@/lib/supabaseServer';

/**
 * TEMPORÁRIO (dev) — estorna a compra do chapéu do Pablo para RE-TESTAR a cutscene.
 * Reseta o gnomo para `locked` e devolve 1 estrela (só se estava desbloqueado,
 * pra não farmar estrela). Restrito ao usuário `lele`. REMOVER quando não precisar.
 */
const LELE_ID = '1d2695fc-4787-4917-a6ca-9392e5869165';

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.id !== LELE_ID) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: prof } = await supabaseAdmin
    .from('profiles').select('stars, gnome_unlocked').eq('id', user.id).single();

  const refund = prof?.gnome_unlocked ? 1 : 0; // devolve só o que foi gasto no unlock
  await supabaseAdmin
    .from('profiles')
    .update({
      gnome_unlocked: false,
      gnome_awoken_at: null,
      gnome_bucket_pending: false,
      stars: (prof?.stars ?? 0) + refund,
    })
    .eq('id', user.id);

  return NextResponse.json({ ok: true, status: await getGnomeStatus(user.id) });
}
