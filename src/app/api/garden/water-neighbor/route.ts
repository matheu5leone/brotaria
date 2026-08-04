import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { waterNeighborPlant } from '@/services/neighborService';

/**
 * Rega a planta de OUTRO jogador: custa 1 água, paga herbo + reputação e não
 * altera a planta do dono. Limites (3/dia, 1 por planta/dia) são do servidor.
 */
export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { plantId } = await request.json().catch(() => ({ plantId: null }));
  if (!plantId) return NextResponse.json({ error: 'Missing plantId' }, { status: 400 });

  const r = await waterNeighborPlant(user.id, plantId);
  if (!r.ok) {
    const status = r.code === 'PLANT_NOT_FOUND' ? 404 : r.code === 'OWN_PLANT' ? 403 : 409;
    return NextResponse.json({ error: r.code, code: r.code }, { status });
  }
  return NextResponse.json(r);
}
