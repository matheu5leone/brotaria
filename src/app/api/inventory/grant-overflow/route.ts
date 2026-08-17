import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { grantPotOverflow } from '@/services/shovelService';

/**
 * Entrega o material que a obra deixou devendo, agora que há espaço.
 * O cliente indica só o canteiro; O QUE entregar vem da anotação do servidor.
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { potId } = await request.json();
    if (!potId) return NextResponse.json({ error: 'Missing potId' }, { status: 400 });

    return NextResponse.json({ success: true, granted: await grantPotOverflow(user.id, potId) });
  } catch (error: unknown) {
    console.error('[Grant Overflow API] Error:', error);
    return NextResponse.json({ error: 'Falha ao entregar o material.' }, { status: 500 });
  }
}
