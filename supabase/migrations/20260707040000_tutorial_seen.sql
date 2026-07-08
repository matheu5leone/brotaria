-- ═══════════════════════════════════════════════════════════════════════════
-- Tutorial de onboarding (coach marks do jardim). Aplicada via MCP em 2026-07-07.
-- tutorial_seen controla o tour automático (1x). Backfill dos usuários atuais =
-- true, então só contas novas veem o tour sozinho (o botão "?" reabre sempre).
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.profiles add column if not exists tutorial_seen boolean not null default false;
update public.profiles set tutorial_seen = true;
