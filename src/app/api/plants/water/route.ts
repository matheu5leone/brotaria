import { NextResponse } from 'next/server';
import { waterPlant } from '@/services/growthService';

export async function POST(request: Request) {
  try {
    const { plantId, userId } = await request.json();

    if (!plantId || !userId) {
      return NextResponse.json({ error: 'Missing plantId or userId' }, { status: 400 });
    }

    const result = await waterPlant(plantId, userId);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const e = error as Error & { code?: string };
    const status = e.code === 'DAILY_LIMIT_REACHED' ? 429 : e.code === 'NOT_READY' ? 422 : 500;
    return NextResponse.json(
      { error: e.message ?? 'Failed to water plant', code: e.code },
      { status },
    );
  }
}
