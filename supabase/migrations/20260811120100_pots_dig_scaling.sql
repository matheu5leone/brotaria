-- ═══════════════════════════════════════════════════════════════════════════
-- Obra escalonada + raridade oculta do solo.
-- Ver docs/superpowers/specs/2026-08-11-cavar-redesign-design.md
--
-- O tempo de cavar deixa de ser 60s fixos e passa a depender de quantos
-- canteiros VAZIOS o jogador já tem (incluindo os ainda em obra):
--   0 vazios → 1 min · 1 → 5h · 2 → 24h · 3+ → 7 dias
-- Como a duração agora varia por canteiro, ela precisa ser gravada NO canteiro:
-- o cliente não tem como recalcular (o estado do jardim mudou desde a cavada).
--
-- `soil_rarity` é sorteado no ato de cavar (uniforme entre as 6 raridades) e
-- fica INERTE por enquanto — dado guardado para a mecânica de fertilidade.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.pots
  add column if not exists dig_duration_ms int,
  add column if not exists soil_rarity     text;

-- Mesma lista de raridades de inventory_items_rarity_check (20260727000000).
-- Nullable: canteiros anteriores a esta migração não têm solo sorteado.
alter table public.pots drop constraint if exists pots_soil_rarity_check;
alter table public.pots add constraint pots_soil_rarity_check
  check (soil_rarity is null or soil_rarity in
    ('comum','incomum','raro','epico','lendario','brotaria'));

-- Canteiros já existentes foram cavados sob a regra antiga (60s fixos).
update public.pots set dig_duration_ms = 60000 where dig_duration_ms is null;
