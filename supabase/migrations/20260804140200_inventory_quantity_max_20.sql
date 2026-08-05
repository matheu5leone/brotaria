-- O teto de empilhamento passou a ser POR TIPO de item (`stackMaxFor` em
-- src/config/economy.ts): 10 no geral, 20 para pólen, 1 para elixir.
--
-- A constraint do banco existia travada em 10, o que quebraria no 11º pólen.
-- Ela vira agora o teto MÁXIMO possível (20); o limite fino de cada tipo é
-- aplicado no inventoryService.
alter table public.inventory_items drop constraint if exists inventory_items_quantity_check;

alter table public.inventory_items add constraint inventory_items_quantity_check
  check (quantity >= 1 and quantity <= 20);
