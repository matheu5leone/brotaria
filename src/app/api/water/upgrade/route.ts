import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { buyWaterUpgrade } from '@/services/waterUpgradeService';

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { upgradeId } = await request.json();
    if (!upgradeId || typeof upgradeId !== 'string') {
      return NextResponse.json({ error: 'Missing upgradeId' }, { status: 400 });
    }

    const result = await buyWaterUpgrade(user.id, upgradeId);

    if (!result.ok) {
      const status =
        result.code === 'INSUFFICIENT_HERBO' ? 400 :
        result.code === 'MAX_LEVEL' ? 409 :
        400;
      const error =
        result.code === 'INSUFFICIENT_HERBO' ? 'Herbo insuficiente.' :
        result.code === 'MAX_LEVEL' ? 'Upgrade já está no nível máximo.' :
        'Upgrade inválido.';
      return NextResponse.json({ error, code: result.code }, { status });
    }

    return NextResponse.json({
      success: true,
      herbo: result.herbo,
      capacityLevel: result.capacityLevel,
      bonusLevel: result.bonusLevel,
      max: result.max,
      bonusChance: result.bonusChance,
    });
  } catch (err) {
    console.error('[Water Upgrade API] Error:', err);
    return NextResponse.json({ error: 'Failed to buy water upgrade' }, { status: 500 });
  }
}
