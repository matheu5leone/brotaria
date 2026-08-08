import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { supabaseAdmin } from '@/lib/supabaseServer';

/** Marca o tutorial do pólen como visto (não reabre na próxima abelha). */
export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ polen_tutorial_seen: true })
    .eq('id', user.id);

  if (error) {
    console.error('[PolenTutorial] Falha ao marcar visto:', error);
    return NextResponse.json({ error: 'Falha ao confirmar.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
