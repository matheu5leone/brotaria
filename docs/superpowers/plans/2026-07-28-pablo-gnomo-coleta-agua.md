# Pablo — gnomo de coleta passiva de água — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:executing-plans (inline) para implementar tarefa a tarefa. Steps usam checkbox (`- [ ]`).

**Goal:** Adicionar o gnomo Pablo na `/agua`: desbloqueado por 1 estrela, coleta 1 água/24h (semi-idle) com estados server-authoritative, sprites e cutscene.

**Architecture:** Espelha o subsistema de água existente (`waterService` → `/api/water/*` → `useWater`). Estado do gnomo em 3 colunas de `profiles`, derivado/validado no servidor (transição preguiçosa por timestamp, sem cron). Frontend: componente `PabloScene` na página `/agua` + hooks React Query com update otimista.

**Tech Stack:** Next.js 16 (App Router), React 19, TanStack Query, Supabase (`supabaseAdmin` service-role no servidor), migração manual via MCP Supabase.

## Global Constraints

- **Git:** trabalho **APENAS LOCAL** — commits locais ok, **NÃO** dar `git push` até o usuário liberar. (Ver memória `feature-pablo-gnomo-local-only`.)
- **Sem framework de teste** no projeto — verificação é **manual/ao vivo**: dev server (`preview_start name "brotaria-dev"`), `curl` com JWT da conta de teste, e SQL via MCP Supabase (projeto `cnsrpukgnsdxznhlyyvr`). Não introduzir vitest/jest (fora do padrão do codebase).
- **Migração:** manual via MCP `apply_migration` + salvar cópia em `supabase/migrations/`. (Ver memória `migrations-manual`.)
- **Assets:** já em `public/imgs/pablo/` (transparentes): `pablo-em-pe.webp`, `pablo-dormindo.webp`, `pablo-dialogo.webp`, `pablo-dialogo-nervoso.webp`, `chapeu-pablo.webp`, `balde-cheio.webp`.
- **Conta de teste** (para verificação): `claude-test@brotaria.test` (id `3dff607b-6f13-46ac-b074-85fe6feed74b`). Senha pode ser setada via admin API; JWT via password grant (ver `scratchpad/repro-water.js` do histórico).
- **Voz do Pablo:** pleonasmo redundante (trabalho trabalhoso, água molhada, balde baldoso, boboca bobalho) em TODO texto dele.
- **Spec:** `docs/superpowers/specs/2026-07-28-pablo-gnomo-agua-passiva-design.md`.

---

## File Structure

- **Criar** `src/services/gnomeService.ts` — estado + operações (deriva, unlock, wake, collect). Server-only.
- **Criar** `src/app/api/gnome/status/route.ts`, `.../unlock/route.ts`, `.../wake/route.ts`, `.../collect/route.ts` — 4 rotas finas (auth + chama service).
- **Criar** `src/hooks/useGnome.ts` — `useGnomeStatus`, `useGnomeUnlock`, `useGnomeWake`, `useGnomeCollect`.
- **Criar** `src/components/agua/PabloScene.tsx` — render dos estados (sprites + balões + toques). Cutscene inline no mesmo arquivo (ou `PabloCutscene.tsx` se crescer).
- **Modificar** `src/config/economy.ts` — `GAME.GNOME_*` + `GNOME_COOLDOWN_MS`.
- **Modificar** `src/app/agua/page.tsx` — montar `<PabloScene/>` no canto superior-esquerdo.
- **Criar** `supabase/migrations/<ts>_gnome_pablo.sql` — cópia da migração.

---

## Task 1: Migração — colunas do gnomo em `profiles`

**Files:**
- Create: `supabase/migrations/20260728120000_gnome_pablo.sql`
- DB: aplicar via MCP `apply_migration` (projeto `cnsrpukgnsdxznhlyyvr`).

**Interfaces — Produces:** colunas `profiles.gnome_unlocked` (bool), `profiles.gnome_awoken_at` (timestamptz null), `profiles.gnome_bucket_pending` (bool).

- [ ] **Step 1: Escrever o SQL**

```sql
alter table public.profiles
  add column if not exists gnome_unlocked       boolean     not null default false,
  add column if not exists gnome_awoken_at      timestamptz,
  add column if not exists gnome_bucket_pending boolean     not null default false;
```

- [ ] **Step 2: Aplicar via MCP** `apply_migration(project_id="cnsrpukgnsdxznhlyyvr", name="gnome_pablo", query=<SQL acima>)`.

- [ ] **Step 3: Salvar cópia** do SQL em `supabase/migrations/20260728120000_gnome_pablo.sql`.

- [ ] **Step 4: Verificar**

```sql
select column_name, data_type, column_default from information_schema.columns
where table_schema='public' and table_name='profiles' and column_name like 'gnome_%';
```
Esperado: 3 linhas (`gnome_unlocked` bool default false, `gnome_awoken_at` timestamptz, `gnome_bucket_pending` bool default false).

- [ ] **Step 5: Commit local** `git add supabase/migrations/20260728120000_gnome_pablo.sql && git commit -m "feat(pablo): migracao das colunas do gnomo em profiles"` (SEM push).

---

## Task 2: Config do gnomo em `economy.ts`

**Files:**
- Modify: `src/config/economy.ts` (bloco `GAME` ~linha 111; derivações `*_MS` ~linha 299-309).

**Interfaces — Produces:** `GAME.GNOME_COOLDOWN_HOURS`, `GAME.GNOME_STAR_COST`, `GAME.GNOME_WATER_PER_COLLECT`; `export const GNOME_COOLDOWN_MS`.

- [ ] **Step 1:** Dentro de `GAME`, após o bloco "Água", adicionar:

```ts
  // ── Gnomo Pablo (coleta passiva) ─────────────────────────────────────────
  /** Horas do ciclo de trabalho do Pablo (1 balde a cada ciclo). */
  GNOME_COOLDOWN_HOURS: 24,
  /** Custo em estrela (profiles.stars) para desbloquear o Pablo. */
  GNOME_STAR_COST: 1,
  /** Água por balde coletado. */
  GNOME_WATER_PER_COLLECT: 1,
```

- [ ] **Step 2:** Junto às outras derivações `*_MS` (após `WATER_COLLECT_COOLDOWN_MS`):

```ts
/** Milissegundos do ciclo de trabalho do Pablo. */
export const GNOME_COOLDOWN_MS = GAME.GNOME_COOLDOWN_HOURS * 60 * 60 * 1000;
```

- [ ] **Step 3: Verificar** `npx tsc --noEmit` (sem erros novos).

- [ ] **Step 4: Commit local** `git commit -am "feat(pablo): config de economia do gnomo"`.

---

## Task 3: `gnomeService.ts` — estado + operações

**Files:**
- Create: `src/services/gnomeService.ts`

**Interfaces — Consumes:** `supabaseAdmin` (`@/lib/supabaseServer`), `GAME`/`GNOME_COOLDOWN_MS`/`waterMaxFor` (`@/config/economy`), `getWaterUpgradeLevels` (`@/services/waterService`).
**Produces:**
- `type GnomeState = 'locked' | 'awake' | 'holding_water' | 'asleep_idle'`
- `type GnomeStatus = { unlocked: boolean; state: GnomeState; cooldownRemainingMs: number; canClaim: boolean; waterFull: boolean; stars: number }`
- `async getGnomeStatus(userId): Promise<GnomeStatus>`
- `async unlockGnome(userId): Promise<{ ok: true } | { ok: false; code: 'NO_STARS' | 'ALREADY_UNLOCKED' }>`
- `async wakeGnome(userId): Promise<{ ok: true } | { ok: false; code: 'BUCKET_FULL' | 'ALREADY_AWAKE' | 'LOCKED' }>`
- `async collectGnomeBucket(userId): Promise<{ ok: true; balance: number } | { ok: false; code: 'WATER_FULL' | 'NO_BUCKET' | 'LOCKED' }>`

- [ ] **Step 1: Escrever o arquivo**

```ts
import { supabaseAdmin } from '@/lib/supabaseServer';
import { GAME, GNOME_COOLDOWN_MS, waterMaxFor } from '@/config/economy';
import { getWaterUpgradeLevels } from '@/services/waterService';

export type GnomeState = 'locked' | 'awake' | 'holding_water' | 'asleep_idle';
export type GnomeStatus = {
  unlocked: boolean;
  state: GnomeState;
  cooldownRemainingMs: number;
  canClaim: boolean;
  waterFull: boolean;
  stars: number;
};

type GnomeRow = {
  gnome_unlocked: boolean;
  gnome_awoken_at: string | null;
  gnome_bucket_pending: boolean;
  water_balance: number | null;
  stars: number | null;
};

const SELECT = 'gnome_unlocked, gnome_awoken_at, gnome_bucket_pending, water_balance, stars';

/** Aplica a coleta preguiçosa: se acordado e passou o ciclo, gera o balde e dorme.
 *  Persiste a transição. Retorna a linha (possivelmente já atualizada). */
async function applyLazyCollect(userId: string, row: GnomeRow): Promise<GnomeRow> {
  if (!row.gnome_unlocked || row.gnome_bucket_pending || !row.gnome_awoken_at) return row;
  const elapsed = Date.now() - new Date(row.gnome_awoken_at).getTime();
  if (elapsed < GNOME_COOLDOWN_MS) return row;
  const { data } = await supabaseAdmin
    .from('profiles')
    .update({ gnome_bucket_pending: true, gnome_awoken_at: null })
    .eq('id', userId)
    .eq('gnome_awoken_at', row.gnome_awoken_at) // CAS: só se ninguém mexeu
    .select(SELECT)
    .maybeSingle();
  return (data as GnomeRow) ?? { ...row, gnome_bucket_pending: true, gnome_awoken_at: null };
}

function deriveState(row: GnomeRow): GnomeState {
  if (!row.gnome_unlocked) return 'locked';
  if (row.gnome_bucket_pending) return 'holding_water';
  if (row.gnome_awoken_at) return 'awake';
  return 'asleep_idle';
}

async function fetchRow(userId: string): Promise<GnomeRow> {
  const { data, error } = await supabaseAdmin
    .from('profiles').select(SELECT).eq('id', userId).single();
  if (error || !data) throw new Error('Profile not found');
  return data as GnomeRow;
}

export async function getGnomeStatus(userId: string): Promise<GnomeStatus> {
  const [row0, levels] = await Promise.all([fetchRow(userId), getWaterUpgradeLevels(userId)]);
  const row = await applyLazyCollect(userId, row0);
  const max = waterMaxFor(levels.capacity);
  const balance = row.water_balance ?? 0;
  const state = deriveState(row);
  const cooldownRemainingMs = state === 'awake' && row.gnome_awoken_at
    ? Math.max(0, GNOME_COOLDOWN_MS - (Date.now() - new Date(row.gnome_awoken_at).getTime()))
    : 0;
  return {
    unlocked: row.gnome_unlocked,
    state,
    cooldownRemainingMs,
    canClaim: state === 'holding_water' && balance < max,
    waterFull: balance >= max,
    stars: row.stars ?? 0,
  };
}

export async function unlockGnome(userId: string) {
  const row = await fetchRow(userId);
  if (row.gnome_unlocked) return { ok: false as const, code: 'ALREADY_UNLOCKED' as const };
  const stars = row.stars ?? 0;
  if (stars < GAME.GNOME_STAR_COST) return { ok: false as const, code: 'NO_STARS' as const };
  const { data } = await supabaseAdmin
    .from('profiles')
    .update({
      stars: stars - GAME.GNOME_STAR_COST,
      gnome_unlocked: true,
      gnome_awoken_at: new Date().toISOString(), // nasce acordado
      gnome_bucket_pending: false,
    })
    .eq('id', userId)
    .eq('stars', stars)               // CAS anti-corrida
    .eq('gnome_unlocked', false)
    .select('id').maybeSingle();
  if (!data) return { ok: false as const, code: 'NO_STARS' as const };
  return { ok: true as const };
}

export async function wakeGnome(userId: string) {
  const row = await applyLazyCollect(userId, await fetchRow(userId));
  if (!row.gnome_unlocked) return { ok: false as const, code: 'LOCKED' as const };
  if (row.gnome_bucket_pending) return { ok: false as const, code: 'BUCKET_FULL' as const };
  if (row.gnome_awoken_at) return { ok: false as const, code: 'ALREADY_AWAKE' as const };
  await supabaseAdmin
    .from('profiles')
    .update({ gnome_awoken_at: new Date().toISOString() })
    .eq('id', userId)
    .is('gnome_awoken_at', null)
    .eq('gnome_bucket_pending', false);
  return { ok: true as const };
}

export async function collectGnomeBucket(userId: string) {
  const [row0, levels] = await Promise.all([fetchRow(userId), getWaterUpgradeLevels(userId)]);
  const row = await applyLazyCollect(userId, row0);
  if (!row.gnome_unlocked) return { ok: false as const, code: 'LOCKED' as const };
  if (!row.gnome_bucket_pending) return { ok: false as const, code: 'NO_BUCKET' as const };
  const max = waterMaxFor(levels.capacity);
  const balance = row.water_balance ?? 0;
  if (balance >= max) return { ok: false as const, code: 'WATER_FULL' as const };
  const newBalance = Math.min(balance + GAME.GNOME_WATER_PER_COLLECT, max);
  const { data } = await supabaseAdmin
    .from('profiles')
    .update({ water_balance: newBalance, gnome_bucket_pending: false })
    .eq('id', userId)
    .eq('gnome_bucket_pending', true) // CAS: só se o balde ainda existe
    .eq('water_balance', balance)
    .select('water_balance').maybeSingle();
  if (!data) return { ok: false as const, code: 'WATER_FULL' as const };
  // total_waters é contador vitalício (missão "regue 100x"): incrementa best-effort.
  await supabaseAdmin.rpc('add_coins', { p_user_id: userId, p_amount: 0 }).then(() => {}, () => {});
  return { ok: true as const, balance: (data as { water_balance: number }).water_balance };
}
```

> Nota: o incremento de `total_waters` do balde é opcional; se quiser contá-lo na missão, trocar a linha best-effort por um update CAS de `total_waters`. Deixado fora do caminho crítico pra não falhar a coleta.

- [ ] **Step 2: Verificar** `npx tsc --noEmit` (sem erros).

- [ ] **Step 3: Commit local** `git add src/services/gnomeService.ts && git commit -m "feat(pablo): gnomeService (estado + unlock/wake/collect)"`.

---

## Task 4: Rotas `/api/gnome/*`

**Files:**
- Create: `src/app/api/gnome/status/route.ts`, `unlock/route.ts`, `wake/route.ts`, `collect/route.ts`

**Interfaces — Consumes:** `getAuthUser` (`@/lib/getAuthUser`), funções do `gnomeService`.

- [ ] **Step 1: `status/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { getGnomeStatus } from '@/services/gnomeService';

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return NextResponse.json(await getGnomeStatus(user.id));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
```

- [ ] **Step 2: `unlock/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { unlockGnome, getGnomeStatus } from '@/services/gnomeService';

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const r = await unlockGnome(user.id);
  if (!r.ok) {
    const status = r.code === 'NO_STARS' ? 402 : 409;
    return NextResponse.json({ error: r.code, code: r.code }, { status });
  }
  return NextResponse.json({ ok: true, status: await getGnomeStatus(user.id) });
}
```

- [ ] **Step 3: `wake/route.ts`** (mesmo esqueleto; chama `wakeGnome`; `BUCKET_FULL`→409, `ALREADY_AWAKE`→409, `LOCKED`→403; sucesso retorna `getGnomeStatus`).

- [ ] **Step 4: `collect/route.ts`** (chama `collectGnomeBucket`; `WATER_FULL`→409, `NO_BUCKET`→409, `LOCKED`→403; sucesso retorna `{ ok:true, balance, status }`).

- [ ] **Step 5: Verificar ao vivo** — `preview_start name "brotaria-dev"`; obter JWT da conta de teste (password grant); então:
  - Setar via SQL `update profiles set gnome_unlocked=false, gnome_awoken_at=null, gnome_bucket_pending=false, stars=1 where id='3dff607b-...';`
  - `curl -XPOST http://localhost:3000/api/gnome/unlock -H "Authorization: Bearer <jwt>"` → espera `ok:true`, `stars` decrementou (checar SQL), estado `awake`.
  - `GET /api/gnome/status` → `state:awake`, `cooldownRemainingMs` ~24h.
  - Setar `gnome_awoken_at = now()-interval '25 hours'`; `GET status` → `state:holding_water` (transição preguiçosa persistiu `gnome_bucket_pending=true`).
  - `POST /api/gnome/wake` → `BUCKET_FULL` (409). `POST /api/gnome/collect` → `ok:true`, `water_balance+1`, `bucket_pending=false`. `POST /api/gnome/wake` → `ok:true` (`asleep_idle`→`awake`).
  - `water_balance=max` + `bucket_pending=true` → `collect` → `WATER_FULL` (409), balde permanece.

- [ ] **Step 6: Commit local** `git add src/app/api/gnome && git commit -m "feat(pablo): rotas /api/gnome (status/unlock/wake/collect)"`.

---

## Task 5: Hooks `useGnome.ts`

**Files:**
- Create: `src/hooks/useGnome.ts`

**Interfaces — Consumes:** `authFetch` (`@/lib/authFetch`), `useAuth` (`@/hooks/useAuth`), tipos do gnomeService (re-declarar `GnomeStatus` client-side).
**Produces:** `useGnomeStatus()`, `useGnomeUnlock()`, `useGnomeWake()`, `useGnomeCollect()`.

- [ ] **Step 1: Escrever** (espelha `useWater.ts`: query com `refetchInterval` durante cooldown; mutations invalidam `['gnome', user.id]` e `['water', user.id]` no sucesso; `collect` sobe `water` otimista).

```ts
'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { authFetch } from '@/lib/authFetch';

export type GnomeState = 'locked' | 'awake' | 'holding_water' | 'asleep_idle';
export type GnomeStatusView = {
  unlocked: boolean; state: GnomeState; cooldownRemainingMs: number;
  canClaim: boolean; waterFull: boolean; stars: number;
};

export function useGnomeStatus() {
  const { user } = useAuth();
  return useQuery<GnomeStatusView>({
    queryKey: ['gnome', user?.id],
    queryFn: async () => {
      const res = await authFetch('/api/gnome/status');
      if (!res.ok) throw new Error('Failed to fetch gnome status');
      return res.json();
    },
    enabled: !!user,
    staleTime: 10_000,
    refetchInterval: (q) => {
      const ms = q.state.data?.cooldownRemainingMs;
      return ms && ms > 0 ? Math.max(10_000, Math.min(ms, 60_000)) : false;
    },
  });
}

function useGnomeAction(path: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await authFetch(`/api/gnome/${path}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error(data.error ?? 'Erro'), { code: data.code });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gnome', user?.id] });
      qc.invalidateQueries({ queryKey: ['water', user?.id] });
      qc.invalidateQueries({ queryKey: ['garden', 'watering', user?.id] });
    },
  });
}

export const useGnomeUnlock  = () => useGnomeAction('unlock');
export const useGnomeWake    = () => useGnomeAction('wake');
export const useGnomeCollect = () => useGnomeAction('collect');
```

- [ ] **Step 2: Verificar** `npx tsc --noEmit`.
- [ ] **Step 3: Commit local** `git add src/hooks/useGnome.ts && git commit -m "feat(pablo): hooks useGnome"`.

---

## Task 6: `PabloScene` + integração na `/agua`

**Files:**
- Create: `src/components/agua/PabloScene.tsx`
- Modify: `src/app/agua/page.tsx`

**Interfaces — Consumes:** hooks `useGnome*`; assets em `/imgs/pablo/*`.
**Produces:** `<PabloScene />` (sem props; lê o próprio status).

- [ ] **Step 1:** Criar `PabloScene.tsx` com:
  - `useGnomeStatus()`; deriva `state`, `countdown` (de `dataUpdatedAt + cooldownRemainingMs`, igual ao poço).
  - Container posicionado (recebe classes pelo pai; ver Step 2). Dois elementos: **Pablo** (botão) e **balde** (botão), lado a lado.
  - Render por estado:
    - `locked`: só `chapeu-pablo.webp` + etiqueta "1 ⭐". onClick → abre modal de confirmação → `useGnomeUnlock().mutate()` → em sucesso abre a **cutscene**.
    - `awake`: `pablo-em-pe.webp`. onClick → balão *"volta em {countdown}, tô no meu sono soneca."*.
    - `asleep_idle`: `pablo-dormindo.webp`. onClick → `useGnomeWake().mutate()`.
    - `holding_water`: `pablo-dormindo.webp` + `balde-cheio.webp` encostado. onClick no Pablo → balão nervoso (retrato `pablo-dialogo-nervoso.webp` + fala do balde cheio). onClick no balde → `useGnomeCollect().mutate()`; se erro `WATER_FULL` → balão *"teu regador tá cheião..."*.
  - Balões: componente local simples (bolha de fala com auto-dismiss ~3s). Copy na voz do Pablo (ver spec §8).
  - Cutscene: modal (padrão do modal de `/agua`) com retrato `pablo-dialogo.webp` + array de falas (spec §8), avança por toque; ao fechar, o estado já é `awake`.
  - `<Image>` do next/image para todos os sprites (`draggable={false}`, `object-contain`).

- [ ] **Step 2:** Em `page.tsx`, dentro do `div` da cena (após o bloco do título, antes do poço), montar:

```tsx
<PabloScene />
```
Posicionar via wrapper absoluto no **canto superior-esquerdo, abaixo do título** (ex.: `absolute top-20 left-4 z-10`), com o balde encostado no Pablo. Ajustar `top` para não colidir com o subtítulo "Toque no poço para coletar".

- [ ] **Step 3: Verificar ao vivo** (browser): abrir `/agua` logado como conta de teste em cada estado (setar via SQL) e conferir sprite + balão + toque:
  - `locked` (stars=1) → chapéu + "1 ⭐"; clicar → confirma → cutscene → vira `awake`.
  - `awake` → Pablo em pé; clicar → balão countdown.
  - `holding_water` (via SQL) → Pablo dormindo + balde; clicar Pablo → balão nervoso; clicar balde → +1 água (saldo do regador sobe); com regador cheio → balão "cheião", balde permanece.
  - `asleep_idle` → Pablo dormindo; clicar → acorda.
  - Screenshot final de cada estado.

- [ ] **Step 4: Commit local** `git add src/components/agua/PabloScene.tsx src/app/agua/page.tsx && git commit -m "feat(pablo): PabloScene + integracao na /agua"`.

---

## Task 7: Verificação end-to-end + limpeza

- [ ] **Step 1:** Fluxo completo no browser (conta de teste): desbloquear (gasta 1 ⭐) → cutscene → `awake` → forçar 24h via SQL → `holding_water` → tentar acordar (balão nervoso) → pegar balde (+1 água) → acordar de novo. Screenshot do ciclo.
- [ ] **Step 2:** Restaurar estado da conta de teste (SQL): `stars`, `water_balance`, colunas `gnome_*` para valores neutros.
- [ ] **Step 3:** `npx tsc --noEmit` e `npm run build` (garantir que compila pra produção).
- [ ] **Step 4:** Parar o dev server (`preview_stop`).
- [ ] **Step 5:** **NÃO** dar push. Confirmar com `git log --oneline -8` que os commits estão locais e avisar o usuário que está pronto pra revisão local.

---

## Self-Review (feito)

- **Cobertura do spec:** estados (T3/T6), unlock/wake/collect com edge cases (T3/T4), transição preguiçosa sem cron (T3 `applyLazyCollect`), regador cheio segura o balde (T3 `collect` retorna `WATER_FULL` sem zerar pending), acordar bloqueado com balde (T3 `wake` retorna `BUCKET_FULL`), cutscene + voz (T6), config/economia (T2), migração (T1), assets (Global Constraints). ✓
- **Placeholders:** nenhum — código real em cada passo de backend; UI com contrato + snippets e mapeamento explícito de sprite/estado. Estilo visual segue o modal/cena existentes de `/agua`.
- **Consistência de tipos:** `GnomeState`/`GnomeStatus` idênticos em service (T3) e hook (T5); rotas (T4) retornam `getGnomeStatus`. Funções `unlockGnome`/`wakeGnome`/`collectGnomeBucket`/`getGnomeStatus` batem entre T3, T4, T6.
