import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { supabaseAdmin } from '@/lib/supabaseServer';

/** Confirma o recebimento da semente-cortesia (fecha o popup de boas-vindas). */
export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ welcome_ack: true })
    .eq('id', user.id);

  if (error) {
    console.error('[Welcome] Falha ao confirmar boas-vindas:', error);
    return NextResponse.json({ error: 'Falha ao confirmar.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
