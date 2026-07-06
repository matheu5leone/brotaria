-- ═══════════════════════════════════════════════════════════════════════════
-- Likes de jardim (anônimos) + contador de presentes. Aplicada via MCP 2026-07-06.
--
-- 1 like por (dono, curtidor), toggle (like/unlike). Votos anônimos: a tabela
-- não tem policies de leitura — todo acesso é via API (service role), então o
-- cliente nunca vê quem curtiu. Alimenta as missões likes_received/likes_given.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.garden_likes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  liker_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint garden_likes_unique unique (owner_id, liker_id),
  constraint garden_likes_no_self check (owner_id <> liker_id)
);
create index garden_likes_owner_idx on public.garden_likes (owner_id);
create index garden_likes_liker_idx on public.garden_likes (liker_id);

alter table public.garden_likes enable row level security; -- sem policies: só service role

-- Contador monotônico de presentes enviados (missão "presentear alguém").
alter table public.profiles add column if not exists total_gifts_sent int not null default 0;
