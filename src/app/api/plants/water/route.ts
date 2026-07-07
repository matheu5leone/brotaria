import { NextResponse } from 'next/server';
import { waterPlant } from '@/services/growthService';
import { getAuthUser } from '@/lib/getAuthUser';

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { plantId } = await request.json();
    const userId = user.id;

    if (!plantId) {
      return NextResponse.json({ error: 'Missing plantId' }, { status: 400 });
    }

    const result = await waterPlant(plantId, userId);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const e = error as Error & { code?: string };
    const status = e.code === 'NO_WATER' ? 429 : e.code === 'NOT_READY' ? 422 : 500;
    return NextResponse.json(
      { error: e.message ?? 'Failed to water plant', code: e.code },
      { status },
    );
  }
}
