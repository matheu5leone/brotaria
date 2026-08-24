-- A capacidade da mochila estava presa em TRÊS lugares, não dois: o cliente, o
-- findFreeSlot e — só descoberto ao comprar a expansão de verdade — esta CHECK,
-- que travava slot_index em 0..9 e devolvia 23514 ao gravar o slot 10.
--
-- O teto passa a acompanhar INVENTORY_MAX_SLOTS (30 → índices 0..29). Continua
-- sendo uma trava real: quem manda no quanto CADA jogador pode usar é o
-- findFreeSlot, que lê profiles.inventory_slots. Esta constraint é o limite
-- absoluto do sistema, não a capacidade individual.
alter table public.inventory_items
  drop constraint if exists inventory_items_slot_index_check;

alter table public.inventory_items
  add constraint inventory_items_slot_index_check
  check (slot_index >= 0 and slot_index <= 29);
