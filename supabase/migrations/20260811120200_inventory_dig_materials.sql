-- Libera os materiais que saem da terra ao cavar: 'minhoca' (10%) e
-- 'terra_molhada' (40%). Sem uso mecânico ainda — guardados para a próxima leva.
--
-- A coluna item_type é `text`, mas tem CHECK constraint com a lista permitida —
-- sem esta migração o insert falha com 23514.
alter table public.inventory_items drop constraint if exists inventory_items_item_type_check;

alter table public.inventory_items add constraint inventory_items_item_type_check
  check (item_type = any (array[
    'seed'::text,
    'wrapping_kit'::text,
    'wrapped_plant'::text,
    'plant'::text,
    'polen'::text,
    'elixir'::text,
    'minhoca'::text,
    'terra_molhada'::text
  ]));
