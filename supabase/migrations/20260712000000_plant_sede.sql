-- ═══════════════════════════════════════════════════════════════════════════
-- SEDE — rega aleatória por planta.
--   plants.current_target   : regas do SUB-PASSO ATUAL (client-readable; só o atual)
--   plants.water_period_ms  : período 5–12h da planta (client-readable; cadência atual)
--   plant_sede.waters (jsonb): plano completo pré-sorteado (order 1–10) — PROTEGIDO
--     por RLS (sem policy = só service role). É onde o "futuro" fica escondido.
-- Adulta (order ≥ 11) = terminal (não rega).
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.plants add column if not exists current_target  integer;
alter table public.plants add column if not exists water_period_ms integer;

create table if not exists public.plant_sede (
  plant_id   uuid primary key references public.plants(id) on delete cascade,
  waters     jsonb not null,          -- { "1":3, "2":5, ..., "10":7 }
  created_at timestamptz not null default now()
);
alter table public.plant_sede enable row level security; -- sem policy: só service role

-- RPC de evolução ganha p_current_target (grava a sede do próximo sub-passo, atômico)
CREATE OR REPLACE FUNCTION public.evolve_plant_tx(
  p_plant_id uuid, p_stage_id uuid, p_dna jsonb, p_next_water timestamptz,
  p_image_url text DEFAULT NULL, p_prompt text DEFAULT NULL, p_model text DEFAULT NULL,
  p_herbo integer DEFAULT 0, p_current_target integer DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_user uuid;
begin
  update plants set
    current_stage_id = p_stage_id,
    current_stage_waters = 0,
    current_target = p_current_target,
    dna = p_dna,
    hydration_status = 'hydrated',
    last_watered_at = now(),
    next_water_needed_at = p_next_water
  where id = p_plant_id
  returning user_id into v_user;

  if v_user is null then raise exception 'plant % not found', p_plant_id; end if;

  if p_image_url is not null then
    insert into plant_versions (plant_id, image_url, prompt_used, dna_snapshot, stage_id, model_used)
    values (p_plant_id, p_image_url, p_prompt, p_dna, p_stage_id, p_model);
  end if;

  if p_herbo > 0 then
    update profiles set herbo = coalesce(herbo, 0) + p_herbo where id = v_user;
  end if;
end;
$function$;

-- ── Backfill das plantas existentes ─────────────────────────────────────────
-- 1) período por planta (5h–12h em minutos → ms)
update public.plants set water_period_ms = (5*60 + floor(random()*(12*60 - 5*60 + 1)))::int * 60000
where water_period_ms is null;

-- 2) plano de regas (orders 1–10) por planta, nas faixas do tier
insert into public.plant_sede (plant_id, waters)
select p.id, jsonb_object_agg(o.ord::text, case
    when o.ord = 1            then 3
    when o.ord between 2 and 4  then (3 + floor(random()*4))::int   -- 3..6
    when o.ord between 5 and 7  then (4 + floor(random()*6))::int   -- 4..9
    else                            (5 + floor(random()*6))::int    -- 5..10 (8..10)
  end)
from public.plants p cross join generate_series(1,10) as o(ord)
group by p.id
on conflict (plant_id) do nothing;

-- 3) current_target do sub-passo atual (0 se adulta; senão o sorteado, sem travar quem já regou)
update public.plants p set current_target = case
    when st.order_index >= 11 then 0
    else greatest((ps.waters ->> st.order_index::text)::int, p.current_stage_waters + 1)
  end
from public.plant_stages st, public.plant_sede ps
where p.current_stage_id = st.id and ps.plant_id = p.id and p.current_target is null;

-- 4) adulta terminal: nunca mais pede água
update public.plants p set next_water_needed_at = '2999-01-01T00:00:00+00'::timestamptz, hydration_status = 'hydrated'
from public.plant_stages st
where p.current_stage_id = st.id and st.order_index >= 11;
