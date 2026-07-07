import { supabaseAdmin } from '@/lib/supabaseServer';
import { MissionMetric } from '@/config/missions';

/**
 * Valor atual de uma métrica de missão para um usuário (server-side).
 * - total_waters / herbo / gifts_sent → colunas de profiles
 * - likes_received / likes_given      → contagem de garden_likes
 */
export async function getMetricValue(userId: string, metric: MissionMetric): Promise<number> {
  switch (metric) {
    case 'total_waters':
    case 'herbo': {
      const { data } = await supabaseAdmin.from('profiles').select(metric).eq('id', userId).single();
      return Number((data as Record<string, number> | null)?.[metric] ?? 0);
    }
    case 'gifts_sent': {
      const { data } = await supabaseAdmin.from('profiles').select('total_gifts_sent').eq('id', userId).single();
      return Number(data?.total_gifts_sent ?? 0);
    }
    case 'likes_received': {
      const { count } = await supabaseAdmin
        .from('garden_likes').select('*', { count: 'exact', head: true }).eq('owner_id', userId);
      return count ?? 0;
    }
    case 'likes_given': {
      const { count } = await supabaseAdmin
        .from('garden_likes').select('*', { count: 'exact', head: true }).eq('liker_id', userId);
      return count ?? 0;
    }
    case 'referrals': {
      const { count } = await supabaseAdmin
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', userId)
        .eq('status', 'qualified');
      return count ?? 0;
    }
  }
}
