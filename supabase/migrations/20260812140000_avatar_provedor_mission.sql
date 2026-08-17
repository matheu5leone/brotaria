-- Foto de perfil "Provedor": prêmio de presentear uma planta a alguém.
--
-- O desbloqueio retroativo é intencional: quem já foi generoso antes da missão
-- existir não deveria ter que presentear de novo para ganhar o reconhecimento.
insert into public.avatar_catalog (key, name, image_url, kind, sort_order, active)
values ('provedor', 'Provedor', '/imgs/avatar-provedor.webp', 'avatar', 2, true)
on conflict (key) do update
  set name = excluded.name, image_url = excluded.image_url, active = true;

insert into public.user_avatars (user_id, avatar_id)
select p.id, c.id
  from public.profiles p
 cross join (select id from public.avatar_catalog where key = 'provedor') c
 where coalesce(p.total_gifts_sent, 0) >= 1
on conflict (user_id, avatar_id) do nothing;
