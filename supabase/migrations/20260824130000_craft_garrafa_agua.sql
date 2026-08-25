-- Oficina: primeiro item vindo de craft — a Garrafa de Água (3 terras molhadas).
-- Ao usar, rende +1 de água. Guardada como item, ela contorna o teto do saldo:
-- o jogador segura a garrafa e só converte quando tem espaço.
alter table public.inventory_items drop constraint if exists inventory_items_item_type_check;
alter table public.inventory_items add constraint inventory_items_item_type_check
  check (item_type = any (array[
    'seed', 'wrapping_kit', 'wrapped_plant', 'plant',
    'polen', 'elixir', 'minhoca', 'terra_molhada',
    'garrafa_agua'
  ]));

-- Primitiva atômica de craft: consome N unidades de um tipo e entrega 1 de outro,
-- tudo na mesma transação.
--
-- Existe porque o craft de elixir de hoje NÃO é atômico: ele gasta o pólen num
-- laço de update/delete sem CAS, e duas requisições concorrentes forjam 2
-- elixires com pólen de 1. Aqui o consumo e a entrega vivem numa transação só —
-- qualquer falha no meio desfaz o gasto.
--
-- As receitas continuam vivendo no TypeScript (src/config/recipes.ts, na
-- convenção do projeto para conteúdo). Esta função é só o braço mecânico: quem
-- decide o que casa com o quê é o servidor, antes de chamar.
create or replace function public.craft_consume_and_grant(
  p_user_id     uuid,
  p_input_type  text,
  p_input_qty   int,
  p_output_type text,
  p_output_max  int          -- stackMaxFor(output): 1 = não empilha
)
RETURNS int                  -- slot onde o resultado caiu
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_total int;
  v_rest  int;
  v_cap   int;
  v_slot  int;
  v_stack record;
begin
  if p_input_qty <= 0 then raise exception 'INVALID_AMOUNT'; end if;

  -- Trava as linhas do ingrediente até o fim da transação: é isto que impede
  -- duas requisições simultâneas de gastarem o mesmo material.
  --
  -- Em dois passos de propósito: o Postgres recusa FOR UPDATE junto de agregação
  -- ("FOR UPDATE is not allowed with aggregate functions"), então primeiro
  -- travamos as linhas e só depois somamos.
  perform 1 from public.inventory_items
    where user_id = p_user_id and item_type = p_input_type
    for update;

  select coalesce(sum(quantity), 0) into v_total
    from public.inventory_items
    where user_id = p_user_id and item_type = p_input_type;

  if v_total < p_input_qty then raise exception 'NOT_ENOUGH_INPUT'; end if;

  -- Consome do último stack para o primeiro.
  v_rest := p_input_qty;
  for v_stack in
    select id, quantity from public.inventory_items
      where user_id = p_user_id and item_type = p_input_type
      order by slot_index desc
  loop
    exit when v_rest <= 0;
    if v_stack.quantity > v_rest then
      update public.inventory_items set quantity = quantity - v_rest where id = v_stack.id;
      v_rest := 0;
    else
      v_rest := v_rest - v_stack.quantity;
      delete from public.inventory_items where id = v_stack.id;
    end if;
  end loop;

  -- Entrega: empilha se couber, senão ocupa um slot livre dentro da capacidade
  -- COMPRADA do jogador (profiles.inventory_slots), não um 10 fixo.
  if p_output_max > 1 then
    select id, quantity, slot_index into v_stack from public.inventory_items
      where user_id = p_user_id and item_type = p_output_type
        and rarity is null and biome is null and quantity < p_output_max
      order by slot_index limit 1;
    if found then
      update public.inventory_items set quantity = v_stack.quantity + 1 where id = v_stack.id;
      return v_stack.slot_index;
    end if;
  end if;

  select coalesce(inventory_slots, 10) into v_cap from public.profiles where id = p_user_id;
  select g into v_slot from generate_series(0, coalesce(v_cap, 10) - 1) g
    where g not in (select slot_index from public.inventory_items where user_id = p_user_id)
    order by g limit 1;
  if v_slot is null then raise exception 'INVENTORY_FULL'; end if;

  insert into public.inventory_items(user_id, slot_index, item_type, quantity)
    values (p_user_id, v_slot, p_output_type, 1);

  return v_slot;
end;
$function$;
