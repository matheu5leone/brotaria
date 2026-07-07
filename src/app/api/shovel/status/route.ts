import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/getAuthUser';

const SHOVEL_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = user.id;

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('shovel_last_used_at')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Com 0 canteiros a pá está liberada (cooldown zerado) — camada de segurança.
    const { count: potCount } = await supabaseAdmin
      .from('pots')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const lastUsedAt = profile.shovel_last_used_at ?? null;
    const cooldownRemainingMs =
      lastUsedAt && (potCount ?? 0) > 0
        ? Math.max(0, SHOVEL_COOLDOWN_MS - (Date.now() - new Date(lastUsedAt).getTime()))
        : 0;

    return NextResponse.json({ lastUsedAt, cooldownRemainingMs });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to get shovel status';
    console.error('[Shovel Status API] Error:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
