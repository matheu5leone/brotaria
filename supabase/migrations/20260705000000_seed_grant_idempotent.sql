-- ═══════════════════════════════════════════════════════════════════════════
-- Concessão idempotente da semente de onboarding. Aplicada via MCP em 2026-07-05.
--
-- Bug: o cadastro Google chama /api/auth/init 2x (login + completar perfil) e a
-- checagem antiga (if invCount > 0) tinha janela de corrida → alguns usuários
-- ganhavam 2 sementes (2× custo de IA). O gate atômico abaixo (UPDATE ...
-- WHERE seed_granted = false) garante que só UMA chamada concede a semente.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.profiles add column if not exists seed_granted boolean not null default false;

-- Backfill: todos os perfis existentes já passaram pelo onboarding → não devem
-- receber semente de novo. Contas novas nascem com o default false.
update public.profiles set seed_granted = true;
