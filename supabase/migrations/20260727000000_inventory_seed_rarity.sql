-- ═══════════════════════════════════════════════════════════════════════════
-- Reciclagem de plantas — raridade da semente no inventário.
-- Aplicada via MCP em 2026-07-27.
--
-- Sementes recicladas carregam uma `rarity` (null = semente genérica). O
-- empilhamento passa a ser por (item_type, rarity): a genérica não mistura com
-- as de raridade, e cada raridade tem seu próprio stack.
-- Ver docs/superpowers/specs/2026-07-27-recycling-design.md
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.inventory_items
  add column if not exists rarity text;

alter table public.inventory_items
  drop constraint if exists inventory_items_rarity_check;
alter table public.inventory_items
  add constraint inventory_items_rarity_check
  check (rarity is null or rarity in ('comum','incomum','raro','epico','lendario','brotaria'));

create index if not exists idx_inventory_items_stack
  on public.inventory_items(user_id, item_type, rarity);
