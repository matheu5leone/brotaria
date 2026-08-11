import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { rushDig } from '@/services/shovelService';

/** Termina agora uma obra longa (24h ou 7 dias), pagando em moedas. */
export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { potId } = await request.json();
    if (!potId) return NextResponse.json({ error: 'Missing potId' }, { status: 400 });

    const result = await rushDig(user.id, potId);

    if (!result.ok) {
      const status =
        result.code === 'NOT_FOUND'          ? 404
        : result.code === 'INSUFFICIENT_COINS' ? 400
        :                                        409;
      const error =
        result.code === 'NOT_FOUND'            ? 'Canteiro não encontrado.'
        : result.code === 'NOT_RUSHABLE'       ? 'Esta obra não pode ser apressada.'
        : result.code === 'ALREADY_DONE'       ? 'Esta obra já terminou.'
        :                                        'Moedas insuficientes.';
      return NextResponse.json({ error, code: result.code }, { status });
    }

    return NextResponse.json({ success: true, potId: result.potId, coins: result.coins });
  } catch (error: unknown) {
    console.error('[Pot Rush API] Error:', error);
    return NextResponse.json({ error: 'Falha ao apressar a obra.' }, { status: 500 });
  }
}
