/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  BROTARIA — Missões (one-shot)
 *
 *  Cada missão é concluída UMA vez por conta e concede 1 semente. São as únicas
 *  torneiras de semente grátis além do onboarding (guarda-custo de IA).
 *
 *  `metric` é a coluna de `profiles` usada como progresso:
 *    - total_waters: contador vitalício de regas
 *    - herbo: saldo de herbo (só cresce hoje)
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type MissionMetric =
  | 'total_waters'
  | 'herbo'
  | 'likes_received'   // curtidas recebidas no próprio jardim
  | 'likes_given'      // curtidas dadas em jardins de outros
  | 'gifts_sent'       // presentes enviados (profiles.total_gifts_sent)
  | 'referrals';       // amigos indicados que já qualificaram (chegaram ao broto)

export type MissionReward = 'seed' | 'wrapping_kit';

export interface Mission {
  key: string;
  title: string;
  description: string;
  goal: number;
  metric: MissionMetric;
  reward: MissionReward;
  /** Texto opcional do infobox (?) exibido ao lado da descrição. */
  info?: string;
}

const REFERRAL_INFO =
  'Seu amigo deve ter pelo menos uma planta em estágio broto ou superior para contabilizar';

export const MISSIONS: Mission[] = [
  { key: 'water_100',     title: 'Regador Dedicado',  description: 'Regue 100 vezes',                  goal: 100, metric: 'total_waters',   reward: 'seed' },
  { key: 'herbo_100',     title: 'Primeira Colheita', description: 'Junte 100 herbo',                  goal: 100, metric: 'herbo',          reward: 'seed' },
  { key: 'likes_recv_10', title: 'Jardim Querido',    description: 'Receba 10 curtidas no seu jardim', goal: 10,  metric: 'likes_received', reward: 'seed' },
  { key: 'likes_give_10', title: 'Bom Vizinho',       description: 'Curta 10 jardins de outros',       goal: 10,  metric: 'likes_given',    reward: 'seed' },
  { key: 'gift_1',        title: 'Presente da Casa',  description: 'Presenteie alguém com uma planta',  goal: 1,   metric: 'gifts_sent',     reward: 'seed' },
  { key: 'refer_1',       title: 'Convide um Amigo',  description: 'Indique 1 amigo',                  goal: 1,   metric: 'referrals',      reward: 'wrapping_kit', info: REFERRAL_INFO },
  { key: 'refer_2',       title: 'Amigos no Jardim',  description: 'Indique 2 amigos',                 goal: 2,   metric: 'referrals',      reward: 'seed',         info: REFERRAL_INFO },
];

export function getMission(key: string): Mission | undefined {
  return MISSIONS.find((m) => m.key === key);
}
