import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { isDevUser } from '@/lib/devUser';
import { getBeeStatus } from '@/services/beeService';
import { supabaseAdmin } from '@/lib/supabaseServer';

/**
 * TEMPORÁRIO (dev) — força a abelha a aparecer agora, sem esperar o cooldown
 * de 1–3h. Restrito à conta de desenvolvimento. REMOVER com o botão.
 *
 * Só antecipa o agendamento: quem faz a abelha nascer continua sendo o
 * `getBeeStatus` (mesma regra do jogo real).
 */
export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isDevUser(user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await supabaseAdmin
    .from('profiles')
    .update({ bee_next_at: new Date(Date.now() - 60_000).toISOString(), bee_spawned_at: null })
    .eq('id', user.id);

  return NextResponse.json({ ok: true, status: await getBeeStatus(user.id) });
}
