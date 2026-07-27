-- ═══════════════════════════════════════════════════════════════════════════
-- Colheita da adulta (atômica). Aplicada via MCP em 2026-07-27.
--
-- harvest_adult_tx: incrementa plants.adult_harvest, reprograma o próximo ciclo
-- (ou encerra no auge via p_next_target=0 + sentinela), e concede a recompensa
-- daquele passo numa única transação:
--   p_herbo > 0     → +herbo (10% do valor da planta)
--   p_seed_biome    → +1 semente-bioma (stack próprio; INVENTORY_FULL se cheio)
--   p_star = true   → +1 estrela (auge)
-- Exceções: PLANT_NOT_FOUND, INVENTORY_FULL.
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.harvest_adult_tx(
  p_plant_id    uuid,
  p_user_id     uuid,
  p_next_target int,
  p_next_water  timestamptz,
  p_herbo       int,
  p_seed_biome  text,
  p_star        boolean
) returns table (new_harvest int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_h    int;
  v_slot int;
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
      select g into v_slot from generate_series(0,9) g
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
$$;
