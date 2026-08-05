import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { getBeeStatus } from '@/services/beeService';

/** Estado da abelha no jardim do próprio jogador (faz a abelha nascer se o cooldown venceu). */
export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return NextResponse.json(await getBeeStatus(user.id));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
