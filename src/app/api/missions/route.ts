import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { MISSIONS } from '@/config/missions';
import { getMetricValue } from '@/lib/missionMetrics';

/** Lista as missões do usuário com progresso e estado de resgate. */
export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: claims } = await supabaseAdmin
    .from('mission_claims')
    .select('mission_key')
    .eq('user_id', user.id);

  const claimedKeys = new Set((claims ?? []).map((c) => c.mission_key));

  const missions = await Promise.all(
    MISSIONS.map(async (m) => {
      const current = await getMetricValue(user.id, m.metric);
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
    }),
  );

  return NextResponse.json(missions);
}
