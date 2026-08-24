-- Expansão de mochila: a capacidade do inventário deixa de ser a constante 10
-- espalhada entre o cliente e o findFreeSlot, e passa a viver no perfil.
--
-- Contas existentes começam nos mesmos 10 de sempre — o default cobre elas sem
-- backfill.
alter table public.profiles
  add column if not exists inventory_slots int not null default 10;

-- Compra da expansão. Espelha o spend_coins: a regra de negócio mora no UPDATE
-- condicional, então duas compras simultâneas não passam do teto (a segunda não
-- casa o WHERE e sai por exceção, sem gravar).
--
-- Exige o incremento INTEIRO: com o teto em 30 e passos de 5 a partir de 10 dá
-- sempre exato, mas se alguém mexer no teto é melhor recusar a compra do que
-- vender 5 slots e entregar 2.
create or replace function public.grant_inventory_slots(
  p_user_id uuid,
  p_amount integer,
  p_max integer
)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE novo INTEGER;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;

  UPDATE profiles
     SET inventory_slots = inventory_slots + p_amount
   WHERE id = p_user_id
     AND inventory_slots + p_amount <= p_max
  RETURNING inventory_slots INTO novo;

  IF novo IS NULL THEN RAISE EXCEPTION 'MAX_SLOTS_REACHED'; END IF;
  RETURN novo;
END; $function$;
