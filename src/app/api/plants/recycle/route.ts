import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { recyclePlants } from '@/services/recycleService';

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { plantIds } = await request.json();
    const result = await recyclePlants(user.id, plantIds);

    if (!result.ok) {
      const status = result.code === 'INVENTORY_FULL' ? 409 : 400;
      return NextResponse.json({ error: result.code, code: result.code }, { status });
    }

    return NextResponse.json({ ok: true, seedRarity: result.seedRarity });
  } catch (err) {
    console.error('[Recycle API] Error:', err);
    return NextResponse.json({ error: 'Failed to recycle plants' }, { status: 500 });
  }
}
