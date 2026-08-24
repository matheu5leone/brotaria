-- Regressão da expansão de mochila (20260823140000): duas RPCs procuram slot
-- livre com `generate_series(0,9)` fixo. Quem comprou espaço e está com os 10
-- primeiros slots ocupados recebia INVENTORY_FULL mesmo tendo slots 10..29
-- livres — a expansão era vendida e não valia nestes dois caminhos:
--
--   * recycle_plants   → a semente do tier acima não tinha onde cair
--   * harvest_adult_tx → a semente-bioma da colheita não tinha onde cair
--
-- Agora o intervalo vem de profiles.inventory_slots, a mesma coluna que o
-- findFreeSlot do TypeScript lê. `coalesce(...,10)` mantém o valor de sempre
-- caso o perfil não exista.
--
-- O resto das duas funções segue idêntico ao que estava em produção.

CREATE OR REPLACE FUNCTION public.recycle_plants(p_user_id uuid, p_plant_ids uuid[])
 RETURNS TABLE(seed_rarity text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_count    int;
  v_distinct int;
  v_rarity   text;
  v_next     text;
  v_slot     int;
  v_cap      int;
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

  -- consome as 3 plantas: esvazia os canteiros (que continuam existindo) e deleta.
  update public.pots set plant_id = null
    where plant_id = any(p_plant_ids) and user_id = p_user_id;
  delete from public.plants where id = any(p_plant_ids) and user_id = p_user_id;

  -- entrega 1 semente do proximo tier: empilha no stack (item_type='seed', rarity)
  -- ou cria um slot novo. Sem slot livre -> INVENTORY_FULL (rollback de tudo).
  select id, quantity into v_stack from public.inventory_items
    where user_id = p_user_id and item_type = 'seed' and rarity = v_next and quantity < 10
    order by slot_index limit 1;

  if found then
    update public.inventory_items set quantity = v_stack.quantity + 1 where id = v_stack.id;
  else
    select coalesce(inventory_slots, 10) into v_cap from public.profiles where id = p_user_id;
    select g into v_slot from generate_series(0, coalesce(v_cap, 10) - 1) g
      where g not in (select slot_index from public.inventory_items where user_id = p_user_id)
      order by g limit 1;
    if v_slot is null then raise exception 'INVENTORY_FULL'; end if;
    insert into public.inventory_items(user_id, slot_index, item_type, rarity, quantity)
      values (p_user_id, v_slot, 'seed', v_next, 1);
  end if;

  seed_rarity := v_next;
  return next;
end;
$function$;

CREATE OR REPLACE FUNCTION public.harvest_adult_tx(p_plant_id uuid, p_user_id uuid, p_next_target integer, p_next_water timestamp with time zone, p_herbo integer, p_seed_biome text, p_star boolean)
 RETURNS TABLE(new_harvest integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_h    int;
  v_slot int;
  v_cap  int;
  v_stack record;
begin
  select adult_harvest into v_h from public.plants
    where id = p_plant_id and user_id = p_user_id for update;
  if v_h is null then raise exception 'PLANT_NOT_FOUND'; end if;
  v_h := v_h + 1;

  update public.plants set
    adult_harvest        = v_h,
    current_stage_waters = 0,
    current_target       = p_next_target,
    hydration_status     = 'hydrated',
    last_watered_at      = now(),
    next_water_needed_at = p_next_water
  where id = p_plant_id;

  if p_herbo > 0 then
    update public.profiles set herbo = coalesce(herbo, 0) + p_herbo where id = p_user_id;
  end if;
  if p_star then
    update public.profiles set stars = coalesce(stars, 0) + 1 where id = p_user_id;
  end if;
  if p_seed_biome is not null then
    select id, quantity into v_stack from public.inventory_items
      where user_id = p_user_id and item_type = 'seed'
        and rarity is null and biome = p_seed_biome and quantity < 10
      order by slot_index limit 1;
    if found then
      update public.inventory_items set quantity = v_stack.quantity + 1 where id = v_stack.id;
    else
      select coalesce(inventory_slots, 10) into v_cap from public.profiles where id = p_user_id;
      select g into v_slot from generate_series(0, coalesce(v_cap, 10) - 1) g
        where g not in (select slot_index from public.inventory_items where user_id = p_user_id)
        order by g limit 1;
      if v_slot is null then raise exception 'INVENTORY_FULL'; end if;
      insert into public.inventory_items(user_id, slot_index, item_type, rarity, biome, quantity)
        values (p_user_id, v_slot, 'seed', null, p_seed_biome, 1);
    end if;
  end if;

  new_harvest := v_h;
  return next;
end;
$function$;
