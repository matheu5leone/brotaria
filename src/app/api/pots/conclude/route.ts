import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { concludeDig } from '@/services/shovelService';

/** Fecha a obra vencida e revela o material que a terra guardava. */
export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { potId } = await request.json();
    if (!potId) return NextResponse.json({ error: 'Missing potId' }, { status: 400 });

    const result = await concludeDig(user.id, potId);

    if (!result.ok) {
      const status = result.code === 'NOT_FOUND' ? 404 : 409;
      const error =
        result.code === 'NOT_FOUND'      ? 'Canteiro não encontrado.'
        : result.code === 'STILL_DIGGING' ? 'A obra ainda não terminou.'
        :                                   'Esta obra já foi concluída.';
      return NextResponse.json({ error, code: result.code }, { status });
    }

    return NextResponse.json({ success: true, loot: result.loot, overflow: result.overflow });
  } catch (error: unknown) {
    console.error('[Pot Conclude API] Error:', error);
    return NextResponse.json({ error: 'Falha ao concluir a obra.' }, { status: 500 });
  }
}
