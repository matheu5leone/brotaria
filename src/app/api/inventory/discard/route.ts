import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { discardItems } from '@/services/inventoryService';

/** Descarta slots da mochila (tela de mochila cheia). Só remove — nunca concede. */
export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { itemIds } = await request.json();
    if (!Array.isArray(itemIds)) {
      return NextResponse.json({ error: 'itemIds inválido' }, { status: 400 });
    }

    const removed = await discardItems(user.id, itemIds.slice(0, 10));
    return NextResponse.json({ success: true, removed });
  } catch (error: unknown) {
    console.error('[Inventory Discard API] Error:', error);
    return NextResponse.json({ error: 'Falha ao descartar itens.' }, { status: 500 });
  }
}
