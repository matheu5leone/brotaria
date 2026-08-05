import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { useElixir } from '@/services/beeService';

/**
 * Usa 1 Elixir Floral numa planta: reroll do intervalo de sede.
 * Devolve o novo período para a animação da roleta.
 */
export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { plantId } = await request.json().catch(() => ({ plantId: null }));
  if (!plantId) return NextResponse.json({ error: 'Missing plantId' }, { status: 400 });

  const r = await useElixir(user.id, plantId);
  if (!r.ok) {
    const status = r.code === 'PLANT_NOT_FOUND' ? 404 : r.code === 'NOT_OWNER' ? 403 : 409;
    return NextResponse.json({ error: r.code, code: r.code }, { status });
  }
  return NextResponse.json(r);
}
