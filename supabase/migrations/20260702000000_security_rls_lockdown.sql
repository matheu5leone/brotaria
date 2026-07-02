-- ═══════════════════════════════════════════════════════════════════════════
-- SEGURANÇA (pré-lançamento): fecha políticas RLS abertas e habilita RLS
-- onde faltava. Aplicada em produção via MCP em 2026-07-02.
--
-- Mantém leitura pública (anon) apenas do que o modo visitante e o ranking
-- precisam: pots, plants, plant_versions, plant_stages.
-- ═══════════════════════════════════════════════════════════════════════════

-- profiles: e-mail não pode vazar — leitura/insert apenas da própria linha.
-- (ranking e jardim visitante obtêm nickname/avatar via rotas server-side)
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy profiles_select_own on public.profiles for select using (auth.uid() = id);
create policy profiles_insert_own on public.profiles for insert with check (auth.uid() = id);

-- plants: remove policy aberta (ALL/true); leitura pública p/ jardim visitante
drop policy if exists "Users can manage their own plants" on public.plants;
create policy plants_read on public.plants for select using (true);

-- pots: remove policy aberta; pots_owner (ALL) + pots_read (SELECT público) já cobrem
drop policy if exists "Users can manage their own pots" on public.pots;

-- seeds: restringe ao dono
drop policy if exists "Users can manage their own seeds" on public.seeds;
create policy seeds_owner on public.seeds for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- plant_stages: habilita RLS; config do jogo é leitura pública, escrita só service role
alter table public.plant_stages enable row level security;
create policy plant_stages_read on public.plant_stages for select using (true);

-- transactions: habilita RLS sem policies — só o service role acessa
alter table public.transactions enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- Log enxuto de requisições de IA (sem imagens/base64 — só metadados e excertos)
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.ai_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  type text not null check (type in ('LLM','IMAGE')),
  model text not null,
  status int not null,
  duration_ms int,
  prompt_chars int,
  response_excerpt text,
  error text
);
alter table public.ai_requests enable row level security; -- sem policies: só service role

-- ═══════════════════════════════════════════════════════════════════════════
-- Evolução atômica: update da planta + versão + herbo numa transação única
-- (substitui 3 round-trips do growthService por 1 RPC)
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.evolve_plant_tx(
  p_plant_id uuid,
  p_stage_id uuid,
  p_dna jsonb,
  p_next_water timestamptz,
  p_image_url text default null,
  p_prompt text default null,
  p_model text default null,
  p_herbo int default 0
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
begin
  update plants set
    current_stage_id = p_stage_id,
    current_stage_waters = 0,
    dna = p_dna,
    hydration_status = 'hydrated',
    last_watered_at = now(),
    next_water_needed_at = p_next_water
  where id = p_plant_id
  returning user_id into v_user;

  if v_user is null then
    raise exception 'plant % not found', p_plant_id;
  end if;

  if p_image_url is not null then
    insert into plant_versions (plant_id, image_url, prompt_used, dna_snapshot, stage_id, model_used)
    values (p_plant_id, p_image_url, p_prompt, p_dna, p_stage_id, p_model);
  end if;

  if p_herbo > 0 then
    update profiles set herbo = coalesce(herbo, 0) + p_herbo where id = v_user;
  end if;
end;
$$;

revoke execute on function public.evolve_plant_tx(uuid, uuid, jsonb, timestamptz, text, text, text, int) from public, anon, authenticated;
