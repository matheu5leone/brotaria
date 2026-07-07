import { supabaseAdmin } from '@/lib/supabaseServer';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  BROTARIA — Indicações (campanha "Convide Amigos")
 *
 *  Fluxo: código opaco por usuário → link /convite/<code> → cadastro cria vínculo
 *  PENDENTE → 1ª planta do indicado vira broto → vínculo QUALIFICADO → conta nas
 *  missões de indicação. Toda escrita passa por aqui (service role).
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Gera um código opaco de 8 chars hex. */
function genCode(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Garante que o usuário tenha um referral_code e o retorna. Normalmente o DEFAULT
 * do banco já preenche na criação; isto é rede de segurança para linhas antigas.
 */
export async function ensureReferralCode(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('profiles').select('referral_code').eq('id', userId).maybeSingle();
  if (data?.referral_code) return data.referral_code;

  for (let i = 0; i < 5; i++) {
    const code = genCode();
    const { error } = await supabaseAdmin
      .from('profiles').update({ referral_code: code }).eq('id', userId).is('referral_code', null);
    if (!error) {
      const { data: after } = await supabaseAdmin
        .from('profiles').select('referral_code').eq('id', userId).maybeSingle();
      if (after?.referral_code) return after.referral_code;
    }
    // 23505 (colisão de código) → tenta outro
  }
  console.error('[Referral] Não foi possível gerar referral_code para', userId);
  return null;
}

/**
 * Registra um vínculo de indicação PENDENTE para um usuário recém-criado.
 * Idempotente e resistente a abuso básico: ignora código inválido, auto-indicação
 * e contas já indicadas (unique referred_id). Deve ser chamado só na 1ª init.
 */
export async function recordPendingReferral(referredUserId: string, code: string): Promise<void> {
  const clean = code.trim().toLowerCase();
  if (!clean) return;

  const { data: referrer } = await supabaseAdmin
    .from('profiles').select('id').eq('referral_code', clean).maybeSingle();
  if (!referrer || referrer.id === referredUserId) return;

  const { error } = await supabaseAdmin.from('referrals').insert({
    referrer_id: referrer.id,
    referred_id: referredUserId,
    status: 'pending',
  });
  // 23505 = conta já indicada (unique) — ignora silenciosamente
  if (error && (error as { code?: string }).code !== '23505') {
    console.error('[Referral] Falha ao registrar indicação:', error);
  }
}

/**
 * Qualifica a indicação pendente de um usuário — chamado quando sua 1ª planta
 * atinge o broto. No-op se não houver pendência (idempotente: só pending → qualified).
 */
export async function qualifyReferralIfPending(userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('referrals')
    .update({ status: 'qualified', qualified_at: new Date().toISOString() })
    .eq('referred_id', userId)
    .eq('status', 'pending');
  if (error) console.error('[Referral] Falha ao qualificar indicação:', error);
}
