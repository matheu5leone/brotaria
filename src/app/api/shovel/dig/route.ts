import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { digPot } from '@/services/shovelService';

/** Cava um canteiro: gasta 1 uso da pá, agenda a obra e sorteia o material. */
export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { posX, posY, accuracy } = await request.json();

    // `accuracy` é o desempenho no minigame (0..1). Vem do cliente e não tem
    // como ser auditado — o service clampa e o ganho máximo é curto de propósito.
    const result = await digPot(user.id, posX, posY, Number(accuracy) || 0);

    if (!result.ok) {
      const status = result.code === 'NO_DURABILITY' ? 409 : 400;
      const error =
        result.code === 'NO_DURABILITY'   ? 'Sua pá quebrou. Pegue uma nova na loja.'
        : result.code === 'OCCUPIED'      ? 'Já existe um canteiro aqui.'
        :                                   'Lugar inválido para cavar.';
      return NextResponse.json({ error, code: result.code }, { status });
    }

    return NextResponse.json({
      success: true,
      pot: result.pot,
      loot: result.loot,
      durability: result.durability,
    });
  } catch (error: unknown) {
    console.error('[Shovel Dig API] Error:', error);
    return NextResponse.json({ error: 'Falha ao cavar.' }, { status: 500 });
  }
}
