import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { craft } from '@/services/craftService';

/** Fecha uma receita da Oficina. O minigame é do cliente; a conferência é aqui. */
export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { recipeId } = await request.json().catch(() => ({ recipeId: null }));
  if (!recipeId) return NextResponse.json({ error: 'Missing recipeId' }, { status: 400 });

  try {
    const result = await craft(user.id, recipeId);
    if (result.ok) return NextResponse.json(result);

    const mensagem = {
      UNKNOWN_RECIPE:   'Receita desconhecida.',
      NOT_ENOUGH_INPUT: 'Faltou ingrediente para essa receita.',
      INVENTORY_FULL:   'Mochila cheia — abra espaço antes de macetar.',
    }[result.code];

    return NextResponse.json({ error: mensagem, code: result.code }, { status: 400 });
  } catch (err) {
    console.error('[Craft API]', err);
    return NextResponse.json({ error: 'Falha ao macetar.' }, { status: 500 });
  }
}
