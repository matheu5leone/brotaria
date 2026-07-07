import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { collectWater } from '@/services/waterService';

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await collectWater(user.id);

    if (!result.ok) {
      const status = result.code === 'FULL' ? 409 : 429;
      const error =
        result.code === 'FULL'
          ? 'Regador cheio.'
          : 'Ainda em recarga. Aguarde para coletar de novo.';
      return NextResponse.json(
        { error, code: result.code, cooldownRemainingMs: result.cooldownRemainingMs },
        { status },
      );
    }

    return NextResponse.json({
      success: true,
      balance: result.balance,
      cooldownRemainingMs: result.cooldownRemainingMs,
    });
  } catch (err) {
    console.error('[Water Collect API] Error:', err);
    return NextResponse.json({ error: 'Failed to collect water' }, { status: 500 });
  }
}
