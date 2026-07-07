-- ═══════════════════════════════════════════════════════════════════════════
-- Coleta de Água (Nível 1). Aplicada via MCP em 2026-07-07.
--
-- Água deixa de ser um contador diário (daily_waters_used/water_reset_date, que
-- ficam no banco mas sem uso) e vira um SALDO estocável (máx 10) enchido pela
-- página de coleta (mini-game, cooldown de 2h) e gasto na rega.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists water_balance int not null default 10,
  add column if not exists water_last_collected_at timestamptz;

alter table public.profiles
  add constraint profiles_water_balance_nonneg check (water_balance >= 0);
