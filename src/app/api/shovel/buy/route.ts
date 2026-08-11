import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { buyShovel } from '@/services/shovelService';

/** Repõe a pá quebrada. `currency`: 'coins' (10) ou 'herbo' (300). */
export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { currency } = await request.json();
    const result = await buyShovel(user.id, currency);

    if (!result.ok) {
      const status = result.code === 'ALREADY_FULL' ? 409 : 400;
      const error =
        result.code === 'ALREADY_FULL'         ? 'Sua pá ainda tem usos.'
        : result.code === 'INSUFFICIENT_COINS' ? 'Moedas insuficientes.'
        : result.code === 'INSUFFICIENT_HERBO' ? 'Herbo insuficiente.'
        :                                        'Moeda inválida.';
      return NextResponse.json({ error, code: result.code }, { status });
    }

    return NextResponse.json({
      success: true,
      durability: result.durability,
      coins: result.coins,
      herbo: result.herbo,
    });
  } catch (error: unknown) {
    console.error('[Shovel Buy API] Error:', error);
    return NextResponse.json({ error: 'Falha ao comprar a pá.' }, { status: 500 });
  }
}
