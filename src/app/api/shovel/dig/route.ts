import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/getAuthUser';

const SHOVEL_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 1 day

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { posX, posY } = await request.json();
    const userId = user.id;

    if (posX == null || posY == null) {
      return NextResponse.json({ error: 'Missing posX or posY' }, { status: 400 });
    }

    if (posX < 0 || posX > 100 || posY < 0 || posY > 100) {
      return NextResponse.json({ error: 'Invalid position' }, { status: 400 });
    }

    // Check shovel cooldown against server time
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('shovel_last_used_at')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Camada de segurança: o cooldown só vale se o usuário já tiver ao menos um
    // canteiro. Com 0 canteiros a pá está sempre liberada — assim ninguém fica
    // preso sem jardim ao cavar e remover o buraco logo em seguida.
    const { count: potCount } = await supabaseAdmin
      .from('pots')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if ((potCount ?? 0) > 0 && profile.shovel_last_used_at) {
      const lastUsed = new Date(profile.shovel_last_used_at).getTime();
      const cooldownRemaining = SHOVEL_COOLDOWN_MS - (Date.now() - lastUsed);
      if (cooldownRemaining > 0) {
        return NextResponse.json(
          { error: 'Shovel on cooldown', code: 'COOLDOWN', cooldownRemainingMs: cooldownRemaining },
          { status: 429 }
        );
      }
    }

    // Create a new pot at the requested position with digging timer started
    const { data: pot, error: potError } = await supabaseAdmin
      .from('pots')
      .insert({
        user_id: userId,
        pos_x: posX,
        pos_y: posY,
        digging_started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (potError) throw potError;

    // Record shovel use (server timestamp is authoritative for cooldown)
    await supabaseAdmin
      .from('profiles')
      .update({ shovel_last_used_at: new Date().toISOString() })
      .eq('id', userId);

    return NextResponse.json({ success: true, pot });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to start digging';
    console.error('[Shovel Dig API] Error:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
