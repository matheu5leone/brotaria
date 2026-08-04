# Rega de Vizinho — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:executing-plans (inline) para implementar tarefa a tarefa. Steps usam checkbox (`- [ ]`).

**Goal:** Permitir regar plantas de outros jogadores (3×/dia, 1 água cada) ganhando herbo e reputação, sem alterar o progresso da planta do dono, e deixar um rastro visual de brilho na planta regada.

**Architecture:** Espelha `waterService`/`gnomeService`: serviço server-authoritative + rotas finas + hooks React Query. O estado do limite diário vive em `profiles` (reset preguiçoso por data BRT) e cada rega vira linha em `neighbor_waterings` (anti-duplicata + rastro). **Nenhum `UPDATE` na tabela `plants`** — é a garantia técnica de que a regra "não progride, não sacia" não vaza.

**Tech Stack:** Next.js 16 (App Router), React 19, TanStack Query, Supabase (`supabaseAdmin`), migração via MCP Supabase.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-08-04-rega-vizinho-design.md`. Em caso de conflito, o spec vence.
- **Regras invioláveis:** rega de vizinho **não** altera `plants` (nem `current_stage_waters`, nem `next_water_needed_at`, nem `hydration_status`); custa **1 água**; paga **5 herbo** (10% → **10**); **+1 reputação**; **máx. 3/dia**; **máx. 1 por planta/dia**; não pode regar o próprio jardim.
- **Migração:** manual via MCP `apply_migration` (projeto `cnsrpukgnsdxznhlyyvr`) + cópia em `supabase/migrations/`.
- **Sem framework de teste** no projeto — verificação **ao vivo** (dev server + `curl` com JWT + SQL via MCP). Não introduzir vitest/jest.
- **Conta de teste:** `claude-test@brotaria.test` / id `3dff607b-6f13-46ac-b074-85fe6feed74b`. Segunda conta para o par: `lele` / id `1d2695fc-4787-4917-a6ca-9392e5869165`.
- **Fuso do reset diário:** `America/Sao_Paulo` (não UTC).
- **Git:** commits locais por tarefa; push só ao final, com autorização.

---

## File Structure

- **Criar** `src/services/neighborService.ts` — regar + listar rastro. Server-only.
- **Criar** `src/app/api/garden/water-neighbor/route.ts` — POST regar.
- **Criar** `src/app/api/garden/waterings/route.ts` — GET rastro (24h) de um jardim.
- **Criar** `src/hooks/useNeighbor.ts` — `useWaterNeighbor`, `useGardenWaterings`.
- **Modificar** `src/config/economy.ts` — bloco `GAME.NEIGHBOR_*`.
- **Modificar** `src/middleware.ts` — rate limit da rota nova.
- **Modificar** `src/components/GardenView.tsx` — modo interativo (regar) + brilho do rastro.
- **Modificar** `src/app/jardim/[nickname]/page.tsx` — passar `ownerId` ao `GardenView` (2 pontos de render).
- **Modificar** `src/app/globals.css` — keyframe do brilho.
- **Criar** `supabase/migrations/20260804120000_rega_vizinho.sql`.

---

## Task 1: Migração — reputação, contador diário e log

**Files:**
- Create: `supabase/migrations/20260804120000_rega_vizinho.sql`
- DB: aplicar via MCP `apply_migration`.

**Interfaces — Produces:** `profiles.reputation`, `profiles.neighbor_waters_today`, `profiles.neighbor_waters_date`; tabela `public.neighbor_waterings`.

- [ ] **Step 1: Escrever o SQL**

```sql
alter table public.profiles
  add column if not exists reputation            integer not null default 0,
  add column if not exists neighbor_waters_today integer not null default 0,
  add column if not exists neighbor_waters_date  date;

create table if not exists public.neighbor_waterings (
  id           uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id   uuid not null references public.profiles(id) on delete cascade,
  plant_id     uuid not null references public.plants(id)   on delete cascade,
  herbo_gained integer not null,
  created_at   timestamptz not null default now()
);

alter table public.neighbor_waterings enable row level security;

create index if not exists neighbor_waterings_from_created_idx
  on public.neighbor_waterings (from_user_id, created_at desc);
create index if not exists neighbor_waterings_to_created_idx
  on public.neighbor_waterings (to_user_id, created_at desc);
create index if not exists neighbor_waterings_plant_created_idx
  on public.neighbor_waterings (plant_id, created_at desc);
```

> RLS habilitada **sem policies** = ninguém acessa via anon/authenticated; só o service role (padrão das tabelas de mecânica).

- [ ] **Step 2: Aplicar** via MCP: `apply_migration(project_id="cnsrpukgnsdxznhlyyvr", name="rega_vizinho", query=<SQL acima>)`.

- [ ] **Step 3: Salvar cópia** em `supabase/migrations/20260804120000_rega_vizinho.sql`.

- [ ] **Step 4: Verificar** via MCP `execute_sql`:

```sql
select column_name from information_schema.columns
 where table_schema='public' and table_name='profiles'
   and column_name in ('reputation','neighbor_waters_today','neighbor_waters_date');
select count(*) as tabela_existe from information_schema.tables
 where table_schema='public' and table_name='neighbor_waterings';
```
Esperado: 3 colunas + `tabela_existe = 1`.

- [ ] **Step 5: Commit** `git add supabase/migrations/20260804120000_rega_vizinho.sql && git commit -m "feat(vizinhanca): migracao de reputacao, contador diario e log de regas"`

---

## Task 2: Config em `economy.ts`

**Files:**
- Modify: `src/config/economy.ts` (dentro de `GAME`, após o bloco do Gnomo Pablo).

**Interfaces — Produces:** `GAME.NEIGHBOR_WATER_HERBO`, `..._HERBO_LUCKY`, `..._LUCKY_CHANCE`, `..._REPUTATION`, `..._DAILY_LIMIT`, `..._TRACE_HOURS`.

- [ ] **Step 1: Adicionar o bloco**

```ts
  // ── Rega de vizinho (ajudar o jardim dos outros) ──────────────────────────
  /** Herbo ganho ao regar a planta de outro jogador. */
  NEIGHBOR_WATER_HERBO:        5,
  /** Herbo no caso de sorte (substitui o valor base, não soma). */
  NEIGHBOR_WATER_HERBO_LUCKY:  10,
  /** Chance (0..1) de sair o valor de sorte. */
  NEIGHBOR_WATER_LUCKY_CHANCE: 0.10,
  /** Reputação ganha por rega de vizinho (saldo que nunca se gasta). */
  NEIGHBOR_WATER_REPUTATION:   1,
  /** Máximo de regas de vizinho por dia (reset à meia-noite BRT). */
  NEIGHBOR_WATER_DAILY_LIMIT:  3,
  /** Horas que o brilho do rastro fica na planta regada. */
  NEIGHBOR_WATER_TRACE_HOURS:  24,
```

- [ ] **Step 2: Verificar** `npx tsc --noEmit` → sem erros.
- [ ] **Step 3: Commit** `git commit -am "feat(vizinhanca): config de economia da rega de vizinho"`

---

## Task 3: `neighborService.ts`

**Files:**
- Create: `src/services/neighborService.ts`

**Interfaces — Consumes:** `supabaseAdmin` (`@/lib/supabaseServer`), `GAME` (`@/config/economy`).
**Produces:**
- `type WaterNeighborResult`
- `async waterNeighborPlant(userId: string, plantId: string): Promise<WaterNeighborResult>`
- `async getGardenWaterings(ownerId: string): Promise<{ plantId: string; nickname: string | null }[]>`

- [ ] **Step 1: Escrever o arquivo**

```ts
import { supabaseAdmin } from '@/lib/supabaseServer';
import { GAME } from '@/config/economy';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  BROTARIA — Rega de vizinho (ajudar o jardim dos outros)
 *
 *  Regar a planta de outro jogador NÃO altera a planta: não conta rega, não
 *  avança estágio e não sacia a sede do dono. O ganho é todo de quem rega
 *  (herbo + reputação), pagando 1 água. Limite de 3/dia e 1 por planta/dia.
 *
 *  INVARIANTE: este módulo nunca faz UPDATE em `plants`.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type WaterNeighborResult =
  | {
      ok: true;
      herboGained: number;
      lucky: boolean;
      waterBalance: number;
      reputation: number;
      remainingToday: number;
    }
  | { ok: false; code: 'PLANT_NOT_FOUND' | 'OWN_PLANT' | 'DAILY_LIMIT' | 'ALREADY_WATERED' | 'NO_WATER' };

/** Data de hoje no fuso do jogo (BRT), no formato YYYY-MM-DD. */
function todayBRT(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

/** Regas já usadas hoje: zera sozinho quando a data virou (reset preguiçoso). */
function usedToday(row: { neighbor_waters_today: number | null; neighbor_waters_date: string | null }): number {
  return row.neighbor_waters_date === todayBRT() ? (row.neighbor_waters_today ?? 0) : 0;
}

export async function waterNeighborPlant(userId: string, plantId: string): Promise<WaterNeighborResult> {
  // 1) Planta existe e não é minha
  const { data: plant } = await supabaseAdmin
    .from('plants').select('id, user_id').eq('id', plantId).maybeSingle();
  if (!plant) return { ok: false, code: 'PLANT_NOT_FOUND' };
  if (plant.user_id === userId) return { ok: false, code: 'OWN_PLANT' };

  // 2) Meu estado (saldo + contador diário)
  const { data: me, error: meErr } = await supabaseAdmin
    .from('profiles')
    .select('water_balance, herbo, reputation, neighbor_waters_today, neighbor_waters_date')
    .eq('id', userId).single();
  if (meErr || !me) throw new Error('Profile not found');

  const used = usedToday(me);
  if (used >= GAME.NEIGHBOR_WATER_DAILY_LIMIT) return { ok: false, code: 'DAILY_LIMIT' };

  // 3) Já reguei ESTA planta hoje? (dia BRT → limite inferior em UTC)
  const startOfDay = new Date(`${todayBRT()}T00:00:00-03:00`).toISOString();
  const { data: dup } = await supabaseAdmin
    .from('neighbor_waterings')
    .select('id')
    .eq('from_user_id', userId)
    .eq('plant_id', plantId)
    .gte('created_at', startOfDay)
    .maybeSingle();
  if (dup) return { ok: false, code: 'ALREADY_WATERED' };

  // 4) Água
  const balance = me.water_balance ?? 0;
  if (balance <= 0) return { ok: false, code: 'NO_WATER' };

  // 5) Aplica (CAS no saldo de água + no contador: barra clique duplo)
  const lucky = Math.random() < GAME.NEIGHBOR_WATER_LUCKY_CHANCE;
  const herboGained = lucky ? GAME.NEIGHBOR_WATER_HERBO_LUCKY : GAME.NEIGHBOR_WATER_HERBO;
  const newUsed = used + 1;

  const { data: updated } = await supabaseAdmin
    .from('profiles')
    .update({
      water_balance:         balance - 1,
      herbo:                 (me.herbo ?? 0) + herboGained,
      reputation:            (me.reputation ?? 0) + GAME.NEIGHBOR_WATER_REPUTATION,
      neighbor_waters_today: newUsed,
      neighbor_waters_date:  todayBRT(),
    })
    .eq('id', userId)
    .eq('water_balance', balance)
    .select('water_balance, reputation')
    .maybeSingle();

  if (!updated) {
    // Corrida perdida: relê para reportar o motivo atual.
    const { data: fresh } = await supabaseAdmin
      .from('profiles').select('water_balance, neighbor_waters_today, neighbor_waters_date')
      .eq('id', userId).single();
    if (fresh && usedToday(fresh) >= GAME.NEIGHBOR_WATER_DAILY_LIMIT) return { ok: false, code: 'DAILY_LIMIT' };
    return { ok: false, code: 'NO_WATER' };
  }

  // 6) Log (rastro + anti-duplicata). Falha aqui não desfaz a rega: só loga.
  const { error: logErr } = await supabaseAdmin.from('neighbor_waterings').insert({
    from_user_id: userId,
    to_user_id:   plant.user_id,
    plant_id:     plantId,
    herbo_gained: herboGained,
  });
  if (logErr) console.error('[neighbor] falha ao gravar log da rega:', logErr);

  return {
    ok: true,
    herboGained,
    lucky,
    waterBalance: updated.water_balance,
    reputation:   updated.reputation,
    remainingToday: Math.max(0, GAME.NEIGHBOR_WATER_DAILY_LIMIT - newUsed),
  };
}

/** Plantas do jardim regadas nas últimas NEIGHBOR_WATER_TRACE_HOURS (rastro visual). */
export async function getGardenWaterings(ownerId: string) {
  const since = new Date(Date.now() - GAME.NEIGHBOR_WATER_TRACE_HOURS * 3600_000).toISOString();
  const { data } = await supabaseAdmin
    .from('neighbor_waterings')
    .select('plant_id, from_user:profiles!neighbor_waterings_from_user_id_fkey(nickname)')
    .eq('to_user_id', ownerId)
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  const seen = new Set<string>();
  const out: { plantId: string; nickname: string | null }[] = [];
  for (const row of data ?? []) {
    const pid = row.plant_id as string;
    if (seen.has(pid)) continue;      // 1 entrada por planta: a mais recente
    seen.add(pid);
    const rel = row.from_user as unknown as { nickname: string | null } | null;
    out.push({ plantId: pid, nickname: rel?.nickname ?? null });
  }
  return out;
}
```

- [ ] **Step 2: Verificar** `npx tsc --noEmit` → sem erros.
- [ ] **Step 3: Commit** `git add src/services/neighborService.ts && git commit -m "feat(vizinhanca): neighborService (regar + rastro)"`

---

## Task 4: Rotas + rate limit

**Files:**
- Create: `src/app/api/garden/water-neighbor/route.ts`
- Create: `src/app/api/garden/waterings/route.ts`
- Modify: `src/middleware.ts` (mapa `LIMITS` e o `matcher` do `config`)

**Interfaces — Consumes:** `getAuthUser` (`@/lib/getAuthUser`), funções da Task 3.

- [ ] **Step 1: `water-neighbor/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { waterNeighborPlant } from '@/services/neighborService';

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { plantId } = await request.json().catch(() => ({ plantId: null }));
  if (!plantId) return NextResponse.json({ error: 'Missing plantId' }, { status: 400 });

  const r = await waterNeighborPlant(user.id, plantId);
  if (!r.ok) {
    const status = r.code === 'PLANT_NOT_FOUND' ? 404 : r.code === 'OWN_PLANT' ? 403 : 409;
    return NextResponse.json({ error: r.code, code: r.code }, { status });
  }
  return NextResponse.json(r);
}
```

- [ ] **Step 2: `waterings/route.ts`** (rastro do jardim visitado; leitura pública, sem dados sensíveis)

```ts
import { NextResponse } from 'next/server';
import { getGardenWaterings } from '@/services/neighborService';

export async function GET(request: Request) {
  const ownerId = new URL(request.url).searchParams.get('ownerId');
  if (!ownerId) return NextResponse.json({ error: 'Missing ownerId' }, { status: 400 });
  return NextResponse.json({ waterings: await getGardenWaterings(ownerId) });
}
```

- [ ] **Step 3: Rate limit** — em `src/middleware.ts`, adicionar ao `LIMITS` (após a linha de `/api/likes/toggle`):

```ts
  '/api/garden/water-neighbor': 10, // rega de vizinho (limite real é 3/dia no servidor)
```

E incluir a rota no array `matcher` do `export const config` (junto de `/api/likes/toggle`):

```ts
    '/api/garden/water-neighbor',
```

- [ ] **Step 4: Verificar ao vivo.** Subir dev server (`preview_start name "brotaria-dev"`). Com JWT da conta de teste (`claude-test`), regando uma planta da `lele`:
  - Preparar: `update profiles set water_balance=5, herbo=0, reputation=0, neighbor_waters_today=0, neighbor_waters_date=null where id='3dff607b-6f13-46ac-b074-85fe6feed74b';` e pegar um `plants.id` da `lele` (`select id from plants where user_id='1d2695fc-4787-4917-a6ca-9392e5869165' limit 1;`).
  - **Snapshot da planta antes:** `select current_stage_waters, next_water_needed_at, hydration_status from plants where id='<pid>';`
  - `POST /api/garden/water-neighbor {"plantId":"<pid>"}` → 200, `herboGained` 5 ou 10, `remainingToday: 2`.
  - Conferir: água 4, herbo +5/+10, reputação 1, 1 linha em `neighbor_waterings`.
  - **Snapshot da planta depois: idêntico ao de antes** (invariante do spec).
  - Repetir na MESMA planta → 409 `ALREADY_WATERED`.
  - Regar mais 2 plantas diferentes → ok; a 4ª → 409 `DAILY_LIMIT`.
  - Regar planta própria → 403 `OWN_PLANT`.
  - `water_balance=0` → 409 `NO_WATER` (e nada muda).
  - `GET /api/garden/waterings?ownerId=<lele>` → lista com `plantId` + `nickname`.

- [ ] **Step 5: Commit** `git add src/app/api/garden src/middleware.ts && git commit -m "feat(vizinhanca): rotas de rega de vizinho e rastro + rate limit"`

---

## Task 5: Hooks

**Files:**
- Create: `src/hooks/useNeighbor.ts`

**Interfaces — Consumes:** `authFetch`, `useAuth`.
**Produces:** `useWaterNeighbor()`, `useGardenWaterings(ownerId)`.

- [ ] **Step 1: Escrever**

```ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { authFetch } from '@/lib/authFetch';

export type WaterNeighborResponse = {
  ok: true; herboGained: number; lucky: boolean;
  waterBalance: number; reputation: number; remainingToday: number;
};

export function useWaterNeighbor() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (plantId: string) => {
      const res = await authFetch('/api/garden/water-neighbor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plantId }),
      });
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error(data.error ?? 'Erro ao regar'), { code: data.code });
      return data as WaterNeighborResponse;
    },
    onSuccess: () => {
      // Carteira (herbo/água/reputação) e saldo de água do poço.
      qc.invalidateQueries({ queryKey: ['wallet', user?.id] });
      qc.invalidateQueries({ queryKey: ['water', user?.id] });
      qc.invalidateQueries({ queryKey: ['garden', 'watering', user?.id] });
    },
  });
}

/** Rastro: plantas do jardim regadas por vizinhos nas últimas 24h. */
export function useGardenWaterings(ownerId: string) {
  return useQuery<{ plantId: string; nickname: string | null }[]>({
    queryKey: ['garden-waterings', ownerId],
    queryFn: async () => {
      const res = await fetch(`/api/garden/waterings?ownerId=${ownerId}`);
      if (!res.ok) throw new Error('Failed to fetch waterings');
      return (await res.json()).waterings;
    },
    enabled: !!ownerId,
    staleTime: 60_000,
  });
}
```

> `['wallet', user?.id]` é a chave real da carteira — verificado em `src/hooks/useWallet.tsx:55` (e usada assim em `useMissions`, `useGardenMutations`, `useWaterUpgrades`). Herbo e reputação aparecem por ela.

- [ ] **Step 2: Verificar** `npx tsc --noEmit`.
- [ ] **Step 3: Commit** `git add src/hooks/useNeighbor.ts && git commit -m "feat(vizinhanca): hooks de rega de vizinho e rastro"`

---

## Task 6: `GardenView` interativo (regar)

**Files:**
- Modify: `src/components/GardenView.tsx`
- Modify: `src/app/jardim/[nickname]/page.tsx` (2 chamadas do `GardenView`, linhas ~205 e ~223)

**Interfaces — Consumes:** `useWaterNeighbor` (Task 5), `useAuth`.
**Produces:** `<GardenView userId ownerId? />` com regador nas plantas.

- [ ] **Step 1:** Em `GardenView.tsx`, aceitar `ownerId` opcional e habilitar interação:
  - Assinatura: `export function GardenView({ userId, ownerId }: { userId: string; ownerId?: string })`.
  - `const { user } = useAuth();` e `const canWater = !!user && !!ownerId && user.id !== ownerId;`
  - No wrapper de cada pot, trocar `className="absolute pointer-events-none"` por `` className={`absolute ${canWater && pot.plant_id ? '' : 'pointer-events-none'}`} ``.
  - Quando `canWater && pot.plant_id`, renderizar **sobre** o pot um botão de regar (`aria-label="Regar planta deste jardim"`), posicionado no topo do box do pot, com o ícone `/imgs/watering-can.webp` (mesmo asset do poço), 28px, `title` conforme o estado.
  - Estados do botão (derivados de `useWaterNeighbor` + resposta): habilitado; `disabled` com opacidade 0.5 quando a mutation está pendente. Após erro, mostrar um chip curto por 3s: `ALREADY_WATERED` → "já regada por você"; `DAILY_LIMIT` → "3 regas hoje, volte amanhã"; `NO_WATER` → "sem água".
  - Sucesso: chip flutuante subindo com `+5 herbo` (ou `+10 herbo!` dourado quando `lucky`) e `+1 rep`.

- [ ] **Step 2:** Em `page.tsx`, passar o dono nas duas ocorrências:

```tsx
<GardenView userId={visitedUser.id} ownerId={visitedUser.id} />
```

- [ ] **Step 3: Verificar ao vivo** — logar como `claude-test`, visitar `/jardim/lele`:
  - O regador aparece nas plantas; clicar credita (conferir herbo/água na sidebar e no banco).
  - Clicar de novo na mesma planta → chip "já regada por você".
  - Visitar o próprio jardim → **nenhum** regador.
  - Deslogado → nenhum regador.

- [ ] **Step 4: Commit** `git add src/components/GardenView.tsx "src/app/jardim/[nickname]/page.tsx" && git commit -m "feat(vizinhanca): regador nas plantas do jardim visitado"`

---

## Task 7: Rastro — partículas de brilho na planta regada

**Files:**
- Modify: `src/app/globals.css` (keyframe, junto das outras animações do jardim)
- Modify: `src/components/GardenView.tsx`

**Interfaces — Consumes:** `useGardenWaterings` (Task 5).

- [ ] **Step 1:** Em `globals.css`, adicionar após o bloco `garden-float`:

```css
/* Rastro de rega de vizinho: mini partículas douradas subindo da planta (24h). */
@keyframes neighbor-sparkle {
  0%   { transform: translateY(2px) scale(0.4); opacity: 0; }
  30%  { opacity: 1; }
  100% { transform: translateY(-22px) scale(1); opacity: 0; }
}
.neighbor-sparkle {
  position: absolute;
  bottom: 30%;
  width: 5px; height: 5px;
  border-radius: 999px;
  background: radial-gradient(circle, #fff3b0 0%, #e8c547 70%);
  box-shadow: 0 0 5px 1px rgba(232, 197, 71, 0.7);
  animation: neighbor-sparkle 2.6s ease-in infinite;
  pointer-events: none;
}
@media (prefers-reduced-motion: reduce) { .neighbor-sparkle { animation: none; opacity: 0.5; } }
```

- [ ] **Step 2:** Em `GardenView.tsx`:
  - `const { data: waterings = [] } = useGardenWaterings(userId);`
  - `const wateredBy = useMemo(() => new Map(waterings.map((w) => [w.plantId, w.nickname])), [waterings]);`
  - Para cada pot com `pot.plant_id && wateredBy.has(pot.plant_id)`, renderizar sobre o pot 3 partículas (`pointer-events-none`, `z-index` acima da planta):

```tsx
{[
  { left: '32%', delay: '0s' },
  { left: '50%', delay: '0.9s' },
  { left: '66%', delay: '1.7s' },
].map((s, i) => (
  <span key={i} className="neighbor-sparkle" style={{ left: s.left, animationDelay: s.delay }} />
))}
```

  - Adicionar `title={`Regada por @${wateredBy.get(pot.plant_id) ?? 'alguém'}`}` no wrapper, para o dono descobrir quem passou lá.

- [ ] **Step 3: Verificar ao vivo** — após regar uma planta da `lele` (Task 6), entrar como `lele` no próprio jardim: a planta regada mostra as partículas douradas e o `title` traz o apelido. Plantas não regadas ficam sem brilho.

- [ ] **Step 4: Commit** `git add src/app/globals.css src/components/GardenView.tsx && git commit -m "feat(vizinhanca): brilho na planta regada por vizinho (rastro 24h)"`

---

## Task 8: Verificação end-to-end + limpeza

- [ ] **Step 1: Invariante do spec (o mais importante).** Snapshot completo da planta antes/depois de uma rega de vizinho:

```sql
select current_stage_waters, current_target, next_water_needed_at, hydration_status, last_watered_at
from plants where id='<pid>';
```
Os cinco campos devem ser **idênticos**. Qualquer diferença = bug que fere a regra do spec.

- [ ] **Step 2: Fluxo completo no browser** — regar 3 plantas de outro jardim, ver os chips de ganho, a 4ª bloqueada, e o brilho aparecendo no jardim do dono.
- [ ] **Step 3: Reset diário** — `update profiles set neighbor_waters_date = current_date - 1 where id='<meu>';` → `GET`/regar volta a permitir 3.
- [ ] **Step 4: Restaurar** as contas de teste (`water_balance`, `herbo`, `reputation`, contadores) e limpar as linhas de teste de `neighbor_waterings`.
- [ ] **Step 5: Build** `npm run build` → sem erro.
- [ ] **Step 6:** Apresentar o resultado ao usuário e **pedir autorização antes do push**.

---

## Self-Review

- **Cobertura do spec:** regras (T2/T3), sem tocar em `plants` (T3 + verificado em T4/T8), limite 3/dia com reset BRT (T3), 1 por planta/dia (T3), 5/10 herbo com 10% (T2/T3), reputação (T1/T3), rastro visual aprovado (T7), rate limit (T4), reputação exibida — *ver observação abaixo*.
- **Placeholders:** nenhum passo sem conteúdo; SQL, TS e CSS completos. T6 descreve a UI em prosa por depender do estilo existente do `GardenView`, mas com props, estados, textos e assets exatos.
- **Consistência de tipos:** `WaterNeighborResult` (T3) ↔ `WaterNeighborResponse` (T5) ↔ retorno da rota (T4) batem em todos os campos.
- **Lacuna consciente:** o spec (§7) previa exibir reputação na sidebar/perfil. Isso **não** virou tarefa aqui porque depende do componente de carteira, que ainda não inspecionei. Fica para um plano curto de UI depois que este estiver validado — o saldo já acumula desde a Task 1.
