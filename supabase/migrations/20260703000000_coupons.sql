-- ═══════════════════════════════════════════════════════════════════════════
-- CUPONS (early access / campanhas). Aplicada em produção via MCP em 2026-07-03.
--
-- Cupons de pacote 100% grátis NÃO passam pelo Stripe (R$0 de receita): a
-- concessão é direta, e a regra "1 cupom por campanha por conta" é enforçada
-- por constraints no banco (race-safe). Os cupons em si vivem em
-- src/config/coupons.ts (fonte única, apontando pra um pacote de economy.ts).
-- ═══════════════════════════════════════════════════════════════════════════

-- Tabela de resgates (audit + enforcement das regras)
create table public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  code text not null,
  campaign text not null,
  coins_granted int not null,
  redeemed_at timestamptz not null default now(),
  -- REGRA: 1 cupom por campanha por conta
  constraint coupon_redemptions_one_per_campaign unique (user_id, campaign)
);
-- REGRA: mesmo código não resgatável 2x (explícito p/ futuras campanhas)
create unique index coupon_redemptions_user_code_uniq
  on public.coupon_redemptions (user_id, code);

alter table public.coupon_redemptions enable row level security;
-- Usuário lê os próprios resgates; escrita só via RPC SECURITY DEFINER / service role
create policy coupon_redemptions_select_own
  on public.coupon_redemptions for select using (auth.uid() = user_id);

-- Resgate atômico: registra + credita + loga, tudo ou nada
create or replace function public.redeem_coupon_tx(
  p_user_id uuid, p_code text, p_campaign text, p_coins int
) returns int  -- novo saldo de moedas
language plpgsql security definer set search_path = public as $$
declare v_balance int;
begin
  if p_coins <= 0 then raise exception 'INVALID_AMOUNT'; end if;

  insert into coupon_redemptions (user_id, code, campaign, coins_granted)
  values (p_user_id, p_code, p_campaign, p_coins);

  update profiles set coins = coins + p_coins where id = p_user_id
  returning coins into v_balance;
  if v_balance is null then raise exception 'PROFILE_NOT_FOUND'; end if;

  insert into transactions (user_id, item_type, amount, status)
  values (p_user_id, 'coupon', 0, 'completed');

  return v_balance;
exception
  when unique_violation then raise exception 'ALREADY_REDEEMED';
end;
$$;
revoke execute on function public.redeem_coupon_tx(uuid, text, text, int)
  from public, anon, authenticated;
