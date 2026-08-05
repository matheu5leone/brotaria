-- Abelha (fonte de pólen) — ver
-- docs/superpowers/specs/2026-08-04-abelha-polen-elixir-design.md
--
-- `bee_next_at`    = quando a próxima abelha pode aparecer (sorteado 1–3h a cada evento).
-- `bee_spawned_at` = quando a abelha atual apareceu; janela ativa = +BEE_ACTIVE_MINUTES.
--                    Null = não há abelha no jardim agora.
--
-- Pólen e Elixir NÃO precisam de migração: inventory_items.item_type é text livre.
alter table public.profiles
  add column if not exists bee_next_at    timestamptz,
  add column if not exists bee_spawned_at timestamptz;
