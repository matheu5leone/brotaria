-- ═══════════════════════════════════════════════════════════════════════════
-- Fotos de perfil desbloqueáveis (catálogo). Aplicada via MCP em 2026-07-07.
--
-- avatar_catalog é alimentado pelo admin com o tempo. user_avatars registra o
-- que cada conta desbloqueou; profiles.avatar_id é a seleção atual (avatar_url
-- fica denormalizado para leituras rápidas: visitante, ranking, sidebar).
--
-- O catálogo tem RLS fechado: só o service role lê. O cliente recebe o catálogo
-- filtrado por rota server-side (bloqueadas voltam sem imagem/nome → sem spoiler).
-- ═══════════════════════════════════════════════════════════════════════════

create table public.avatar_catalog (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  image_url text not null,
  kind text not null default 'avatar' check (kind in ('avatar', 'frame')),
  is_default boolean not null default false,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.avatar_catalog enable row level security; -- sem policy: só service role

create table public.user_avatars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  avatar_id uuid not null references avatar_catalog(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (user_id, avatar_id)
);
alter table public.user_avatars enable row level security;
create policy user_avatars_select_own on public.user_avatars for select using (auth.uid() = user_id);

alter table public.profiles add column if not exists avatar_id uuid references avatar_catalog(id);

insert into public.avatar_catalog (key, name, image_url, is_default, sort_order)
values ('default_wood', 'Madeira', '/imgs/avatar-default.webp', true, 0);

insert into public.user_avatars (user_id, avatar_id)
select p.id, c.id from public.profiles p cross join public.avatar_catalog c
where c.key = 'default_wood'
on conflict do nothing;

update public.profiles p
set avatar_id = c.id,
    avatar_url = coalesce(p.avatar_url, c.image_url)
from public.avatar_catalog c
where c.key = 'default_wood' and p.avatar_id is null;
