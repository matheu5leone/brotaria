-- ═══════════════════════════════════════════════════════════════════════════
-- Teto de água baixado para 5 (upgrade de espaço fica para depois). Aplicada via
-- MCP em 2026-07-07. Novos usuários passam a começar com 5 (antes 10) para não
-- nascerem acima do teto. GAME.WATER_MAX_BALANCE no código também virou 5.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.profiles alter column water_balance set default 5;
