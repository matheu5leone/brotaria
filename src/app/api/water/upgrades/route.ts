import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { getWaterUpgrades } from '@/services/waterUpgradeService';

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await getWaterUpgrades(user.id);
    return NextResponse.json(data);
  } catch (err) {
    console.error('[Water Upgrades API] Error:', err);
    return NextResponse.json({ error: 'Failed to get water upgrades' }, { status: 500 });
  }
}
