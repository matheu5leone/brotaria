-- ═══════════════════════════════════════════════════════════════════════════
-- Marcador "reached" de missão. Aplicada via MCP em 2026-07-06.
--
-- Missões passam a valer por PICO (atingiu a meta em algum momento), não pelo
-- valor atual. Necessário porque curtidas oscilam (10 → 9): uma vez que o
-- usuário bateu a meta, a missão fica resgatável mesmo caindo abaixo. O resgate
-- continua one-shot (mission_claims), então não dá pra completar de novo.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.mission_reached (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  mission_key text not null,
  reached_at timestamptz not null default now(),
  unique (user_id, mission_key)
);
alter table public.mission_reached enable row level security;
create policy mission_reached_select_own
  on public.mission_reached for select using (auth.uid() = user_id);
