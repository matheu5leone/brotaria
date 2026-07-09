-- ═══════════════════════════════════════════════════════════════════════════
-- Foto de perfil "Novato" — prêmio da missão water_50 (regar 50 vezes).
--
-- Só adiciona o item ao catálogo. NÃO concede a ninguém: o desbloqueio acontece
-- no resgate da missão (app: /api/missions/claim → unlockAvatarByKey('novato'),
-- que insere em user_avatars). Idempotente via key única.
--
-- ⚠️ Migration MANUAL: aplicar no dashboard/SQL editor do projeto Supabase.
-- ═══════════════════════════════════════════════════════════════════════════

insert into public.avatar_catalog (key, name, image_url, kind, is_default, sort_order, active)
values ('novato', 'Novato', '/imgs/avatar-novato.webp', 'avatar', false, 1, true)
on conflict (key) do nothing;
