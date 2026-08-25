-- Oficina destravada por progresso, não por menu sempre visível.
--
-- O jogador só descobre a sala quando ela tem sentido: a primeira obra concluída
-- é também a primeira vez que ele recebe terra molhada, o ingrediente da
-- garrafa. Antes disso a Oficina seria uma sala vazia com receitas impossíveis.
alter table public.profiles
  add column if not exists craft_unlocked boolean not null default false;

-- Coach mark da primeira visita (aponta o livro de receitas). Flag separada do
-- unlock: destravar e aprender são momentos diferentes.
alter table public.profiles
  add column if not exists craft_tutorial_seen boolean not null default false;

-- Quem já cavou alguma obra até o fim ganha a Oficina de graça — a feature
-- nasceu depois deles, e mandar cavar de novo só para destravar seria pedágio
-- retroativo.
update public.profiles p
   set craft_unlocked = true
 where exists (
   select 1 from public.pots t
    where t.user_id = p.id and t.dig_claimed_at is not null
 );
