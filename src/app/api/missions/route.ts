import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { MISSIONS } from '@/config/missions';

/** Lista as missões do usuário com progresso e estado de resgate. */
export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('total_waters, herbo')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 500 });
  }

  const { data: claims } = await supabaseAdmin
    .from('mission_claims')
    .select('mission_key')
    .eq('user_id', user.id);

  const claimedKeys = new Set((claims ?? []).map((c) => c.mission_key));

  const missions = MISSIONS.map((m) => {
    const current = Number((profile as Record<string, number>)[m.metric] ?? 0);
    const claimed = claimedKeys.has(m.key);
    return {
      key: m.key,
      title: m.title,
      description: m.description,
      goal: m.goal,
      reward: m.reward,
      progress: Math.min(current, m.goal),
      claimed,
      claimable: current >= m.goal && !claimed,
    };
  });

  return NextResponse.json(missions);
}
