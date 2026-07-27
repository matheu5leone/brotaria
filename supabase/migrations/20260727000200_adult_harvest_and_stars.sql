-- ═══════════════════════════════════════════════════════════════════════════
-- Auge da planta adulta — ciclo de colheita. Aplicada via MCP em 2026-07-27.
--
-- A adulta deixa de ser terminal e ganha uma barra de rega. Cada vez que a barra
-- enche concede uma recompensa em sequência (encerra no auge):
--   1ª → +10% do valor de herbo da planta
--   2ª → 1 semente genérica COM o bioma da planta (stack próprio)
--   3ª → +1 estrela (auge) para o usuário; a planta fica no auge (terminal).
--
--   plants.adult_harvest (0-3): colheitas completadas na adulta.
--   profiles.stars: saldo de estrelas do usuário.
--   inventory_items.biome: semente-bioma empilha por (item_type, rarity, biome).
-- Ver docs/superpowers/specs (design confirmado no chat 2026-07-27).
-- ═══════════════════════════════════════════════════════════════════════════
alter table public.plants    add column if not exists adult_harvest int not null default 0;
alter table public.profiles  add column if not exists stars int not null default 0;
alter table public.inventory_items add column if not exists biome text;

alter table public.inventory_items drop constraint if exists inventory_items_biome_check;
alter table public.inventory_items add constraint inventory_items_biome_check
  check (biome is null or biome in
    ('planicie','floresta','deserto','montanha','pantano','oceano','vulcao','tundra','selva','caverna'));

drop index if exists idx_inventory_items_stack;
create index if not exists idx_inventory_items_stack
  on public.inventory_items(user_id, item_type, rarity, biome);
