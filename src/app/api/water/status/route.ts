import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { getWaterStatus } from '@/services/waterService';

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const status = await getWaterStatus(user.id);
    return NextResponse.json(status);
  } catch (err) {
    console.error('[Water Status API] Error:', err);
    return NextResponse.json({ error: 'Failed to get water status' }, { status: 500 });
  }
}
