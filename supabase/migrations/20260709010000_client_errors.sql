-- ═══════════════════════════════════════════════════════════════════════════
-- Telemetria de erro CLIENT-SIDE (a tela "This page couldn't load" não gera log
-- de servidor). Alimentada por /api/client-error via beacon do navegador.
--
-- Serve para: saber QUEM viu a tela, QUANDO, em QUAL navegador, com QUAL erro e
-- em QUAL build (app_version). Transforma "erro constante misterioso" em query.
--
-- RLS fechado: só o service role escreve (pela rota). Cliente não lê.
-- user_id é TEXT (não FK): payload do cliente é não-confiável — nunca deve fazer
-- o insert falhar.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.client_errors (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  user_id     text,
  kind        text,          -- window | rejection | resource | boundary | boot | boundary-global
  message     text,
  stack       text,
  url         text,
  user_agent  text,
  browser     text,          -- firefox | chrome | safari | edge | other (parseado no server)
  app_version text,          -- commit do deploy (VERCEL_GIT_COMMIT_SHA)
  ip          text
);

alter table public.client_errors enable row level security; -- sem policy: só service role

create index if not exists client_errors_created_idx on public.client_errors (created_at desc);
create index if not exists client_errors_browser_idx on public.client_errors (browser, created_at desc);
create index if not exists client_errors_user_idx    on public.client_errors (user_id, created_at desc);
