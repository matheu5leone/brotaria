-- ═══════════════════════════════════════════════════════════════════════════
-- Upgrades da Coleta de Água (pagos em herbo). Aplicada via MCP em 2026-07-19.
--
-- Introduz melhorias compráveis na página /agua:
--   • water_capacity (nível 1, único): teto de água +5 (5 → 10).
--   • water_bonus (níveis 1 e 2): chance de coletar +1 água por coleta (20% / 40%).
--
-- Persistência numa tabela dedicada `user_upgrades` (user_id, upgrade_id, level)
-- e compra atômica via RPC `buy_water_upgrade` (espelha o padrão spend_coins).
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Tabela de upgrades comprados por usuário. Ausência de linha = nível 0.
create table if not exists public.user_upgrades (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  upgrade_id text not null,
  level      int  not null default 0 check (level >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, upgrade_id)
);

alter table public.user_upgrades enable row level security;

-- Leitura só do próprio usuário; escrita apenas via service role (RPC no servidor).
drop policy if exists user_upgrades_select_own on public.user_upgrades;
create policy user_upgrades_select_own
  on public.user_upgrades for select using (auth.uid() = user_id);

-- 2) Compra atômica de um upgrade de água.
--    Numa transação: trava o profile, confere nível esperado (< max) e saldo de
--    herbo (>= custo), debita herbo e sobe o nível. Sem "entrega" que possa falhar
--    depois do débito → não precisa de estorno.
--    Exceções: PROFILE_NOT_FOUND, MAX_LEVEL, INSUFFICIENT_HERBO.
create or replace function public.buy_water_upgrade(
  p_user_id    uuid,
  p_upgrade_id text,
  p_cost       int,
  p_max_level  int
) returns table (new_level int, new_herbo int)
language plpgsql
security definer
set search_path = public
as $$
declare
  cur_level int;
  bal       int;
begin
  if p_cost < 0 then raise exception 'INVALID_AMOUNT'; end if;

  -- Trava a linha do profile p/ evitar corrida de saldo (double-spend).
  select herbo into bal from public.profiles where id = p_user_id for update;
  if bal is null then raise exception 'PROFILE_NOT_FOUND'; end if;

  select coalesce(level, 0) into cur_level
    from public.user_upgrades
    where user_id = p_user_id and upgrade_id = p_upgrade_id;
  cur_level := coalesce(cur_level, 0);

  if cur_level >= p_max_level then raise exception 'MAX_LEVEL'; end if;
  if bal < p_cost            then raise exception 'INSUFFICIENT_HERBO'; end if;

  update public.profiles set herbo = herbo - p_cost where id = p_user_id
    returning herbo into bal;

  insert into public.user_upgrades (user_id, upgrade_id, level, updated_at)
    values (p_user_id, p_upgrade_id, cur_level + 1, now())
    on conflict (user_id, upgrade_id)
      do update set level = excluded.level, updated_at = now();

  new_level := cur_level + 1;
  new_herbo := bal;
  return next;
end;
$$;
