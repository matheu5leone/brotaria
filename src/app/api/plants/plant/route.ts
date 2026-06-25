import { NextResponse } from 'next/server';
import { plantSeed } from '@/services/inventoryService';
import { getAuthUser } from '@/lib/getAuthUser';

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { potId } = await request.json();
    const userId = user.id;

    if (!potId) {
      return NextResponse.json({ error: 'Missing potId' }, { status: 400 });
    }

    const plant = await plantSeed(userId, potId);

    return NextResponse.json({ success: true, plant });
  } catch (error: any) {
    console.error('[Plant API] Error:', error);

    // Erro de negócio esperado: usuário sem sementes -> 400 com código para a UI
    // abrir o popup de compra de moedas em vez de tratar como falha do servidor.
    if (error?.code === 'NO_SEEDS') {
      return NextResponse.json(
        { error: 'No seeds available', code: 'NO_SEEDS' },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: error.message || 'Failed to plant seed' }, { status: 500 });
  }
}
