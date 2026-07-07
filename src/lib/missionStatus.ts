import { supabaseAdmin } from '@/lib/supabaseServer';
import { MISSIONS, Mission, MissionReward } from '@/config/missions';
import { getMetricValue } from '@/lib/missionMetrics';

export type MissionStatus = {
  key: string;
  title: string;
  description: string;
  goal: number;
  reward: MissionReward;
  info?: string;
  progress: number;
  claimed: boolean;
  claimable: boolean;
};

/** Persiste (idempotente) as missões cuja meta o usuário já atingiu. */
async function persistReached(userId: string, keys: string[]) {
  if (!keys.length) return;
  await supabaseAdmin
    .from('mission_reached')
    .upsert(
      keys.map((mission_key) => ({ user_id: userId, mission_key })),
      { onConflict: 'user_id,mission_key', ignoreDuplicates: true },
    );
}

/**
 * Status completo das missões. "Reached" é PICO: uma vez atingida a meta, fica
 * resgatável mesmo se o valor atual cair (ex.: curtidas 10 → 9). Marca reached
 * ao detectar meta batida, então mesmo caindo depois continua resgatável.
 */
export async function getMissionStatus(userId: string): Promise<MissionStatus[]> {
  const [{ data: claims }, { data: reached }] = await Promise.all([
    supabaseAdmin.from('mission_claims').select('mission_key').eq('user_id', userId),
    supabaseAdmin.from('mission_reached').select('mission_key').eq('user_id', userId),
  ]);
  const claimedKeys = new Set((claims ?? []).map((c) => c.mission_key));
  const reachedKeys = new Set((reached ?? []).map((r) => r.mission_key));

  const newlyReached: string[] = [];
  const list = await Promise.all(
    MISSIONS.map(async (m) => {
      const current = await getMetricValue(userId, m.metric);
      const hitNow = current >= m.goal;
      if (hitNow && !reachedKeys.has(m.key)) newlyReached.push(m.key);
      const claimed = claimedKeys.has(m.key);
      return {
        key: m.key,
        title: m.title,
        description: m.description,
        goal: m.goal,
        reward: m.reward,
        info: m.info,
        progress: Math.min(current, m.goal),
        claimed,
        claimable: (reachedKeys.has(m.key) || hitNow) && !claimed,
      };
    }),
  );

  await persistReached(userId, newlyReached);
  return list;
}

/** Pode resgatar? true se já atingiu a meta agora OU em algum momento (reached). */
export async function canClaimMission(userId: string, mission: Mission): Promise<boolean> {
  const current = await getMetricValue(userId, mission.metric);
  if (current >= mission.goal) {
    await persistReached(userId, [mission.key]);
    return true;
  }
  const { data } = await supabaseAdmin
    .from('mission_reached')
    .select('id')
    .eq('user_id', userId)
    .eq('mission_key', mission.key)
    .maybeSingle();
  return !!data;
}

/** Marca como reached qualquer missão do usuário já concluída (chamado após ações). */
export async function markReachedForUser(userId: string): Promise<void> {
  const keys: string[] = [];
  for (const m of MISSIONS) {
    if ((await getMetricValue(userId, m.metric)) >= m.goal) keys.push(m.key);
  }
  await persistReached(userId, keys);
}
