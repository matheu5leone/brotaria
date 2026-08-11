import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { getShovelStatus } from '@/services/shovelService';

/** Durabilidade da pá + quanto a próxima obra vai durar. */
export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    return NextResponse.json(await getShovelStatus(user.id));
  } catch (error: unknown) {
    console.error('[Shovel Status API] Error:', error);
    return NextResponse.json({ error: 'Falha ao ler o estado da pá.' }, { status: 500 });
  }
}
