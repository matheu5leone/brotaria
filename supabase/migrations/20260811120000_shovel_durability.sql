-- ═══════════════════════════════════════════════════════════════════════════
-- Pá consumível: durabilidade no lugar do cooldown de 24h.
-- Ver docs/superpowers/specs/2026-08-11-cavar-redesign-design.md
--
-- A pá deixa de ser uma ferramenta com cooldown e vira item com 5 usos.
-- Quando zera, o jogador repõe por 10 moedas OU 300 herbo (recarrega pra 5).
-- `profiles.shovel_last_used_at` para de ser lido (coluna mantida de propósito:
-- dropar quebraria o código em produção enquanto esta branch é local).
--
-- Tabela genérica `user_tools` — mesma forma de `user_upgrades`, para quando
-- regador/tesoura/ancinho também tiverem durabilidade.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Ferramentas por usuário. AUSÊNCIA DE LINHA = durabilidade 0 (quebrada).
create table if not exists public.user_tools (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  tool_id    text not null,
  durability int  not null default 0 check (durability >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, tool_id)
);

alter table public.user_tools enable row level security;

-- Leitura só do próprio usuário; escrita apenas via service role (RPC/servidor).
drop policy if exists user_tools_select_own on public.user_tools;
create policy user_tools_select_own
  on public.user_tools for select using (auth.uid() = user_id);

-- 2) Backfill: todo jogador existente ganha uma pá cheia. Sem isto, quem já joga
--    acordaria com a pá quebrada — o cooldown antigo some e nada o substitui.
insert into public.user_tools (user_id, tool_id, durability)
  select id, 'shovel', 5 from public.profiles
  on conflict (user_id, tool_id) do nothing;

-- 3) Compra atômica da pá. Numa transação: trava o profile, confere que a pá
--    está DE FATO quebrada (evita desperdiçar usos já pagos), confere saldo na
--    moeda escolhida, debita e recarrega. Sem entrega que possa falhar depois
--    do débito → não precisa de estorno.
--    Exceções: INVALID_CURRENCY, PROFILE_NOT_FOUND, ALREADY_FULL,
--              INSUFFICIENT_COINS, INSUFFICIENT_HERBO.
create or replace function public.buy_shovel(
  p_user_id  uuid,
  p_currency text,
  p_cost     int,
  p_max      int
) returns table (new_durability int, new_coins int, new_herbo int)
language plpgsql
security definer
set search_path = public
as $$
declare
  cur_dur   int;
  bal_coins int;
  bal_herbo int;
begin
  if p_cost < 0 then raise exception 'INVALID_AMOUNT'; end if;
  if p_currency not in ('coins', 'herbo') then raise exception 'INVALID_CURRENCY'; end if;

  -- Trava a linha do profile p/ evitar corrida de saldo (double-spend).
  select coins, herbo into bal_coins, bal_herbo
    from public.profiles where id = p_user_id for update;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;

  select durability into cur_dur
    from public.user_tools
    where user_id = p_user_id and tool_id = 'shovel';
  cur_dur := coalesce(cur_dur, 0);

  -- Só vende pá quebrada: comprar com usos sobrando jogaria fora o que já foi pago.
  if cur_dur > 0 then raise exception 'ALREADY_FULL'; end if;

  if p_currency = 'coins' then
    if bal_coins < p_cost then raise exception 'INSUFFICIENT_COINS'; end if;
    update public.profiles set coins = coins - p_cost where id = p_user_id
      returning coins, herbo into bal_coins, bal_herbo;
  else
    if bal_herbo < p_cost then raise exception 'INSUFFICIENT_HERBO'; end if;
    update public.profiles set herbo = herbo - p_cost where id = p_user_id
      returning coins, herbo into bal_coins, bal_herbo;
  end if;

  insert into public.user_tools (user_id, tool_id, durability, updated_at)
    values (p_user_id, 'shovel', p_max, now())
    on conflict (user_id, tool_id)
      do update set durability = excluded.durability, updated_at = now();

  new_durability := p_max;
  new_coins      := bal_coins;
  new_herbo      := bal_herbo;
  return next;
end;
$$;

-- 4) Consumo atômico de 1 uso. Só desce se ainda houver durabilidade — o
--    `where durability > 0` é o CAS que impede duas cavadas simultâneas de
--    gastarem o mesmo último uso.
create or replace function public.consume_shovel_use(p_user_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  left_after int;
begin
  update public.user_tools
     set durability = durability - 1, updated_at = now()
   where user_id = p_user_id and tool_id = 'shovel' and durability > 0
   returning durability into left_after;

  if not found then raise exception 'NO_DURABILITY'; end if;
  return left_after;
end;
$$;
