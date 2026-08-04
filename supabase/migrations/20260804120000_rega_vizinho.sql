-- Rega de vizinho — ajudar o jardim dos outros.
-- Ver docs/superpowers/specs/2026-08-04-rega-vizinho-design.md
--
-- `reputation` é saldo de status: acumula e NUNCA se gasta.
-- `neighbor_waters_today` + `neighbor_waters_date` formam o contador diário
-- (reset preguiçoso: se a data virou, o contador é tratado como 0).
alter table public.profiles
  add column if not exists reputation            integer not null default 0,
  add column if not exists neighbor_waters_today integer not null default 0,
  add column if not exists neighbor_waters_date  date;

-- Log de regas: serve de anti-duplicata (1 por planta/dia) e do rastro visual
-- de 24h no jardim do dono.
create table if not exists public.neighbor_waterings (
  id           uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id   uuid not null references public.profiles(id) on delete cascade,
  plant_id     uuid not null references public.plants(id)   on delete cascade,
  herbo_gained integer not null,
  created_at   timestamptz not null default now()
);

-- RLS ligada SEM policies = ninguém acessa via anon/authenticated; só service role.
alter table public.neighbor_waterings enable row level security;

create index if not exists neighbor_waterings_from_created_idx
  on public.neighbor_waterings (from_user_id, created_at desc);
create index if not exists neighbor_waterings_to_created_idx
  on public.neighbor_waterings (to_user_id, created_at desc);
create index if not exists neighbor_waterings_plant_created_idx
  on public.neighbor_waterings (plant_id, created_at desc);
