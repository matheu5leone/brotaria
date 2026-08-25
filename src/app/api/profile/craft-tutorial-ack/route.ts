import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { supabaseAdmin } from '@/lib/supabaseServer';

/** Marca o coach mark da Oficina como visto (não reabre na próxima visita). */
export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ craft_tutorial_seen: true })
    .eq('id', user.id);

  if (error) {
    console.error('[CraftTutorial] Falha ao marcar visto:', error);
    return NextResponse.json({ error: 'Falha ao confirmar.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
