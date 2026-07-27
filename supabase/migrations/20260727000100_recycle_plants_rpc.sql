-- ═══════════════════════════════════════════════════════════════════════════
-- Reciclagem de plantas — RPC atômica. Aplicada via MCP em 2026-07-27.
--
-- recycle_plants(user, [3 plant_ids]): valida 3 plantas do usuário, da MESMA
-- raridade e que não seja brotaria (topo); esvazia os canteiros (mantendo-os),
-- deleta as 3 plantas e entrega 1 semente do próximo tier ao inventário
-- (stack por (item_type,rarity) ou slot novo). Tudo numa transação — se faltar
-- espaço no inventário (INVENTORY_FULL), nada é consumido.
-- Exceções: INVALID_SET, MIXED_RARITY, TOP_RARITY, INVENTORY_FULL.
-- Ver docs/superpowers/specs/2026-07-27-recycling-design.md
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.recycle_plants(p_user_id uuid, p_plant_ids uuid[])
returns table (seed_rarity text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count    int;
  v_distinct int;
  v_rarity   text;
  v_next     text;
  v_slot     int;
  v_stack    record;
begin
  if array_length(p_plant_ids, 1) is distinct from 3 then raise exception 'INVALID_SET'; end if;

  select count(*), count(distinct dna->>'rarity')
    into v_count, v_distinct
    from public.plants
    where id = any(p_plant_ids) and user_id = p_user_id;

  if v_count <> 3     then raise exception 'INVALID_SET'; end if;
  if v_distinct <> 1  then raise exception 'MIXED_RARITY'; end if;

  select dna->>'rarity' into v_rarity
    from public.plants where id = any(p_plant_ids) and user_id = p_user_id limit 1;

  v_next := case v_rarity
    when 'comum'    then 'incomum'
    when 'incomum'  then 'raro'
    when 'raro'     then 'epico'
    when 'epico'    then 'lendario'
    when 'lendario' then 'brotaria'
    else null end;
  if v_next is null then raise exception 'TOP_RARITY'; end if;

  update public.pots set plant_id = null
    where plant_id = any(p_plant_ids) and user_id = p_user_id;
  delete from public.plants where id = any(p_plant_ids) and user_id = p_user_id;

  select id, quantity into v_stack from public.inventory_items
    where user_id = p_user_id and item_type = 'seed' and rarity = v_next and quantity < 10
    order by slot_index limit 1;

  if found then
    update public.inventory_items set quantity = v_stack.quantity + 1 where id = v_stack.id;
  else
    select g into v_slot from generate_series(0,9) g
      where g not in (select slot_index from public.inventory_items where user_id = p_user_id)
      order by g limit 1;
    if v_slot is null then raise exception 'INVENTORY_FULL'; end if;
    insert into public.inventory_items(user_id, slot_index, item_type, rarity, quantity)
      values (p_user_id, v_slot, 'seed', v_next, 1);
  end if;

  seed_rarity := v_next;
  return next;
end;
$$;
