-- ═══════════════════════════════════════════════════════════════════════════
-- Campanha "Convide Amigos" (indicação / referral). Aplicada via MCP em 2026-07-07.
--
-- Cada usuário ganha um código opaco (link /convite/<code>). Ao se cadastrar por
-- um link, cria-se um vínculo PENDENTE. Quando a 1ª planta do indicado vira broto
-- (order_index >= 2), o vínculo é QUALIFICADO e passa a contar nas missões.
--
-- Anti-abuso básico: cada conta só é indicada uma vez (unique referred_id),
-- sem auto-indicação (check), e a barreira natural do broto contra contas falsas.
-- ═══════════════════════════════════════════════════════════════════════════

-- Código de indicação opaco por usuário. Novas linhas recebem via DEFAULT.
alter table public.profiles
  add column if not exists referral_code text unique
  default substr(md5(gen_random_uuid()::text), 1, 8);

-- Backfill: gera código para quem já existe (mistura o id p/ evitar colisão).
update public.profiles
  set referral_code = substr(md5(gen_random_uuid()::text || id::text), 1, 8)
  where referral_code is null;

alter table public.profiles alter column referral_code set not null;

-- Vínculo de indicação
create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references profiles(id) on delete cascade,
  referred_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'qualified')),
  created_at timestamptz not null default now(),
  qualified_at timestamptz,
  unique (referred_id),               -- cada conta só pode ser indicada uma vez
  check (referrer_id <> referred_id)  -- sem auto-indicação
);
create index referrals_referrer_idx on public.referrals (referrer_id, status);

alter table public.referrals enable row level security;
-- O indicador pode ler suas indicações (progresso). Escrita só via service role.
create policy referrals_select_own
  on public.referrals for select using (auth.uid() = referrer_id);
