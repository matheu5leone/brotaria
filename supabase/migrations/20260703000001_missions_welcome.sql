-- ═══════════════════════════════════════════════════════════════════════════
-- Missões (one-shot) + popup de boas-vindas. Aplicada via MCP em 2026-07-03.
--
-- Retenção barata: as 2 missões (regar 100x, juntar 100 herbo) dão 1 semente
-- cada, uma única vez por conta — as únicas torneiras de semente grátis além
-- do onboarding. total_waters é um contador vitalício (o daily_waters_used
-- reseta todo dia). welcome_ack controla o popup de cortesia.
-- ═══════════════════════════════════════════════════════════════════════════

-- Contador vitalício de regas (não reseta como o daily_waters_used)
alter table public.profiles add column if not exists total_waters int not null default 0;

-- Flag do popup de boas-vindas. Backfill: quem já existe NÃO vê o popup.
alter table public.profiles add column if not exists welcome_ack boolean not null default false;
update public.profiles set welcome_ack = true;   -- só contas novas (default false) verão

-- Resgates de missão (one-shot por conta) — mesmo padrão de coupon_redemptions
create table public.mission_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  mission_key text not null,
  claimed_at timestamptz not null default now(),
  unique (user_id, mission_key)
);
alter table public.mission_claims enable row level security;
create policy mission_claims_select_own
  on public.mission_claims for select using (auth.uid() = user_id);
-- escrita só via service role (rotas server-side)
