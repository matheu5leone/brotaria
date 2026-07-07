import { supabaseAdmin } from '@/lib/supabaseServer';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  BROTARIA — Fotos de perfil (catálogo desbloqueável)
 *
 *  Toda leitura do catálogo passa por aqui (service role) e é filtrada por
 *  desbloqueio: itens bloqueados voltam SEM imagem/nome (spoiler-free).
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type AvatarSlot =
  | { id: string; locked: false; name: string; imageUrl: string; selected: boolean }
  | { id: string; locked: true };

export type AvatarPickerData = {
  slots: AvatarSlot[];
  unlockedCount: number;
  total: number;
};

/** Catálogo (só avatares ativos) com estado de bloqueio por usuário, sem spoiler. */
export async function getAvatarsForUser(userId: string): Promise<AvatarPickerData> {
  const [{ data: catalog }, { data: unlocks }, { data: profile }] = await Promise.all([
    supabaseAdmin
      .from('avatar_catalog')
      .select('id, name, image_url')
      .eq('active', true)
      .eq('kind', 'avatar')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    supabaseAdmin.from('user_avatars').select('avatar_id').eq('user_id', userId),
    supabaseAdmin.from('profiles').select('avatar_id').eq('id', userId).maybeSingle(),
  ]);

  const unlocked = new Set((unlocks ?? []).map((u) => u.avatar_id as string));
  const selectedId = profile?.avatar_id ?? null;

  const slots: AvatarSlot[] = (catalog ?? []).map((c) =>
    unlocked.has(c.id)
      ? { id: c.id, locked: false, name: c.name, imageUrl: c.image_url, selected: c.id === selectedId }
      : { id: c.id, locked: true },
  );

  return {
    slots,
    unlockedCount: slots.filter((s) => !s.locked).length,
    total: slots.length,
  };
}

/** Define o avatar do usuário (só se ele já o desbloqueou). */
export async function selectAvatar(userId: string, avatarId: string): Promise<{ avatarUrl: string }> {
  const { data: unlock } = await supabaseAdmin
    .from('user_avatars')
    .select('id')
    .eq('user_id', userId)
    .eq('avatar_id', avatarId)
    .maybeSingle();

  if (!unlock) {
    const e = new Error('Avatar não desbloqueado.') as Error & { code?: string };
    e.code = 'LOCKED';
    throw e;
  }

  const { data: cat } = await supabaseAdmin
    .from('avatar_catalog')
    .select('image_url')
    .eq('id', avatarId)
    .eq('active', true)
    .maybeSingle();

  if (!cat) {
    const e = new Error('Avatar inválido.') as Error & { code?: string };
    e.code = 'NOT_FOUND';
    throw e;
  }

  await supabaseAdmin
    .from('profiles')
    .update({ avatar_id: avatarId, avatar_url: cat.image_url })
    .eq('id', userId);

  return { avatarUrl: cat.image_url };
}

/**
 * Desbloqueia a foto default para o usuário e a define como foto se ainda não
 * tiver uma. Chamado no onboarding (initializeUser). Idempotente.
 */
export async function grantDefaultAvatar(userId: string): Promise<void> {
  const { data: def } = await supabaseAdmin
    .from('avatar_catalog')
    .select('id, image_url')
    .eq('is_default', true)
    .eq('active', true)
    .limit(1)
    .maybeSingle();

  if (!def) return;

  await supabaseAdmin
    .from('user_avatars')
    .upsert({ user_id: userId, avatar_id: def.id }, { onConflict: 'user_id,avatar_id', ignoreDuplicates: true });

  // Só define como foto se ainda não houver seleção (não sobrescreve escolha).
  await supabaseAdmin
    .from('profiles')
    .update({ avatar_id: def.id, avatar_url: def.image_url })
    .eq('id', userId)
    .is('avatar_id', null);
}
