import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/getAuthUser';

export async function DELETE(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { potId } = await request.json();
    if (!potId) return NextResponse.json({ error: 'Missing potId' }, { status: 400 });

    const { data: pot } = await supabaseAdmin
      .from('pots')
      .select('id, plant_id, user_id')
      .eq('id', potId)
      .eq('user_id', user.id)
      .single();

    if (!pot) return NextResponse.json({ error: 'Canteiro não encontrado' }, { status: 404 });
    if (pot.plant_id) {
      return NextResponse.json(
        { error: 'Remova a planta antes de apagar o canteiro', code: 'HAS_PLANT' },
        { status: 400 },
      );
    }

    await supabaseAdmin.from('pots').delete().eq('id', potId);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[Pot Remove]', err);
    return NextResponse.json({ error: 'Erro ao remover canteiro' }, { status: 500 });
  }
}
