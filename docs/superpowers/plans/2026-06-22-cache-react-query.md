# Cache & React Query Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar re-fetches desnecessários no jardim com React Query (cache client-side) e corrigir o cache HTTP das imagens geradas pela IA.

**Architecture:** TanStack Query v5 centraliza todo estado de servidor — pots, shovel status, plant data, plant versions e wallet. Cada entidade tem sua query key canônica; mutations chamam `invalidateQueries` cirurgicamente. Imagens do Supabase Storage ganham cache HTTP longo via `next/image` + `remotePatterns`.

**Tech Stack:** `@tanstack/react-query` v5, `next/image`, Supabase JS client (já instalado), TypeScript strict.

## Global Constraints

- Next.js 16.2.7 com App Router e React 19 — não usar `getServerSideProps`, `getStaticProps`, nem `useFormState` (deprecated)
- `@tanstack/react-query` **v5** (API diferente da v4: sem `isLoading`+`isFetching` separados; usa `isPending`)
- `tsc --noEmit` deve passar sem erros após cada task
- Não remover o `WalletProvider` context até o Task 6 (outras páginas dependem dele)
- `NEXT_PUBLIC_SUPABASE_URL` é a variável de ambiente com a URL do projeto (ex.: `https://cnsrpukgnsdxznhlyyvr.supabase.co`)
- Arquivo `.env.local` tem as vars; nunca commitar secrets

---

## Pré-requisito manual (fora do código)

**Supabase Storage Cache-Control** — fazer no dashboard antes ou depois das tasks:
1. Acessar `https://supabase.com/dashboard/project/cnsrpukgnsdxznhlyyvr/storage/buckets`
2. Clicar no bucket de imagens de plantas
3. Em "Bucket settings", garantir que o bucket é `public`
4. Nas políticas de cache do bucket, adicionar header: `Cache-Control: public, max-age=31536000, immutable`

> As imagens são imutáveis por design (cada evolução gera URL nova). Sem esse header, o browser faz request a cada render mesmo com `<Image>`.

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `next.config.ts` | Modificar | Adiciona `remotePatterns` para Supabase Storage |
| `src/lib/queryClient.ts` | Criar | Instância singleton do QueryClient com defaults |
| `src/providers/QueryProvider.tsx` | Criar | `QueryClientProvider` + DevTools (só dev) |
| `src/app/layout.tsx` | Modificar | Envolve app com `QueryProvider` |
| `src/hooks/useGardenData.ts` | Criar | Queries: pots e shovel status |
| `src/hooks/useGardenMutations.ts` | Criar | Mutations: dig, plant, water, delete |
| `src/hooks/usePlantData.ts` | Criar | Queries: plant row e latest plant version |
| `src/components/Garden.tsx` | Modificar | Troca `useState`+fetch manual por hooks RQ |
| `src/hooks/useWallet.tsx` | Modificar | Troca fetch manual por `useQuery` do RQ |

### Query key schema (canônico para toda a app)

```ts
// Sempre arrays; prefixo por domínio facilita invalidação em grupo
['garden', 'pots',   userId]   // lista de pots do jardim
['garden', 'shovel', userId]   // cooldown da pá
['plant',  plantId]            // dados da planta (stage, hydration)
['plant',  plantId, 'version'] // última imagem gerada
['wallet', userId]             // coins + seedCount
```

---

## Task 1 — Cache HTTP de imagens (`next/image` + `remotePatterns`)

**Files:**
- Modify: `next.config.ts`
- Modify: `src/components/Garden.tsx` (apenas o `<img>` no PotSlot)

**Interfaces:**
- Produz: `<Image>` do `next/image` substituindo `<img>` no PotSlot

- [ ] **Step 1: Adicionar `remotePatterns` ao `next.config.ts`**

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 2: Trocar `<img>` por `<Image>` no Garden.tsx**

Localizar o bloco `latestVersion?.image_url` dentro de `PotSlot` e substituir:

```tsx
// ANTES — busca: `} : latestVersion?.image_url ? (`
// DEPOIS:
) : latestVersion?.image_url ? (
  <div className="relative w-full h-full">
    <Image
      src={latestVersion.image_url}
      alt={plant.current_stage.name}
      fill
      draggable={false}
      className="drop-shadow-lg object-contain animate-in fade-in zoom-in duration-500"
    />
  </div>
```

Adicionar import no topo de Garden.tsx:
```tsx
import Image from 'next/image';
```

- [ ] **Step 3: Verificar tipos**

```powershell
cd "C:\Users\mathe\Projetos\brotaria"
Remove-Item -Force tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npx tsc --noEmit
```

Esperado: nenhuma linha de erro.

- [ ] **Step 4: Testar visualmente**

```powershell
npm run dev
```

Abrir `http://localhost:3000`, navegar ao jardim. Planta com imagem deve aparecer. No DevTools → Network → filtrar por `supabase.co/storage` — o request deve retornar `200` na primeira vez e `304` / `(from cache)` nas seguintes.

- [ ] **Step 5: Commit**

```powershell
git add next.config.ts src/components/Garden.tsx
git commit -m "feat: cache plant images via next/image remotePatterns"
```

---

## Task 2 — Infraestrutura React Query (install, QueryClient, Provider, layout)

**Files:**
- Create: `src/lib/queryClient.ts`
- Create: `src/providers/QueryProvider.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produz: `QueryProvider` exportado de `@/providers/QueryProvider`
- Produz: `queryClient` singleton exportado de `@/lib/queryClient`

- [ ] **Step 1: Instalar dependências**

```powershell
cd "C:\Users\mathe\Projetos\brotaria"
npm install @tanstack/react-query
npm install --save-dev @tanstack/react-query-devtools
```

Verificar que `package.json` agora tem `@tanstack/react-query` em `dependencies`.

- [ ] **Step 2: Criar `src/lib/queryClient.ts`**

```ts
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Dados ficam "fresh" por 30s; após isso revalida em background
      staleTime: 30_000,
      // Mantém cache por 5 min sem subscribers (ex.: ao trocar de página)
      gcTime: 5 * 60_000,
      // Não re-fetcha ao focar a janela (evita flash durante alt+tab)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

- [ ] **Step 3: Criar `src/providers/QueryProvider.tsx`**

```tsx
// src/providers/QueryProvider.tsx
'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/queryClient';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
```

- [ ] **Step 4: Atualizar `src/app/layout.tsx`**

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth";
import { WalletProvider } from "@/hooks/useWallet";
import { QueryProvider } from "@/providers/QueryProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Brotaria - Seu Jardim Virtual",
  description: "Cultive plantas únicas geradas por IA",
  icons: {
    icon: "/imgs/brotaria.png",
    apple: "/imgs/brotaria.png",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <QueryProvider>
          <AuthProvider>
            <WalletProvider>
              {children}
            </WalletProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Verificar tipos**

```powershell
Remove-Item -Force tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 6: Commit**

```powershell
git add src/lib/queryClient.ts src/providers/QueryProvider.tsx src/app/layout.tsx package.json package-lock.json
git commit -m "feat: add React Query infrastructure (QueryClient, QueryProvider)"
```

---

## Task 3 — Garden queries (`useGardenData`)

**Files:**
- Create: `src/hooks/useGardenData.ts`

**Interfaces:**
- Consome: `supabase` de `@/lib/supabase`; `Pot` de `@/types`
- Produz:
  ```ts
  usePots(userId: string | undefined): UseQueryResult<Pot[]>
  useShovelStatus(userId: string | undefined): UseQueryResult<ShovelStatus>
  // ShovelStatus = { lastUsedAt: string | null; cooldownRemainingMs: number }
  ```

- [ ] **Step 1: Criar `src/hooks/useGardenData.ts`**

```ts
// src/hooks/useGardenData.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Pot } from '@/types';

const SHOVEL_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export type ShovelStatus = {
  lastUsedAt: string | null;
  cooldownRemainingMs: number;
};

async function fetchPots(userId: string): Promise<Pot[]> {
  const { data, error } = await supabase
    .from('pots')
    .select('*, plant_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function fetchShovelStatus(userId: string): Promise<ShovelStatus> {
  const { data, error } = await supabase
    .from('profiles')
    .select('shovel_last_used_at')
    .eq('id', userId)
    .single();
  if (error) throw error;
  const lastUsedAt = data?.shovel_last_used_at ?? null;
  const cooldownRemainingMs = lastUsedAt
    ? Math.max(0, SHOVEL_COOLDOWN_MS - (Date.now() - new Date(lastUsedAt).getTime()))
    : 0;
  return { lastUsedAt, cooldownRemainingMs };
}

export function usePots(userId: string | undefined) {
  return useQuery({
    queryKey: ['garden', 'pots', userId],
    queryFn: () => fetchPots(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useShovelStatus(userId: string | undefined) {
  return useQuery({
    queryKey: ['garden', 'shovel', userId],
    queryFn: () => fetchShovelStatus(userId!),
    enabled: !!userId,
    // Cooldown muda com o tempo; revalidar a cada 60s (quando há cooldown ativo)
    staleTime: 60_000,
    refetchInterval: (query) =>
      query.state.data?.cooldownRemainingMs
        ? Math.min(query.state.data.cooldownRemainingMs, 60_000)
        : false,
  });
}
```

- [ ] **Step 2: Verificar tipos**

```powershell
Remove-Item -Force tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 3: Commit**

```powershell
git add src/hooks/useGardenData.ts
git commit -m "feat: add garden query hooks (usePots, useShovelStatus)"
```

---

## Task 4 — Plant queries (`usePlantData`)

**Files:**
- Create: `src/hooks/usePlantData.ts`

**Interfaces:**
- Consome: `supabase` de `@/lib/supabase`
- Produz:
  ```ts
  usePlant(plantId: string | null): UseQueryResult<PlantRow | null>
  usePlantVersion(plantId: string | null): UseQueryResult<PlantVersionRow | null>
  // PlantRow e PlantVersionRow importados de Garden.tsx — mover para este arquivo
  ```

> **Nota sobre tipos:** `PlantRow` e `PlantVersionRow` estão atualmente definidos localmente em `Garden.tsx`. Mover para `usePlantData.ts` e re-exportar de lá.

- [ ] **Step 1: Criar `src/hooks/usePlantData.ts`**

```ts
// src/hooks/usePlantData.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type PlantRow = {
  id: string;
  hydration_status: string;
  current_stage_waters: number;
  current_stage: { id: string; name: string; waters_required: number };
};

export type PlantVersionRow = {
  id: string;
  image_url: string | null;
};

async function fetchPlant(plantId: string): Promise<PlantRow> {
  const { data, error } = await supabase
    .from('plants')
    .select('*, current_stage:plant_stages(*)')
    .eq('id', plantId)
    .single();
  if (error) throw error;
  return data as unknown as PlantRow;
}

async function fetchPlantVersion(plantId: string): Promise<PlantVersionRow | null> {
  const { data } = await supabase
    .from('plant_versions')
    .select('id, image_url')
    .eq('plant_id', plantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  return (data as PlantVersionRow | null) ?? null;
}

export function usePlant(plantId: string | null | undefined) {
  return useQuery({
    queryKey: ['plant', plantId],
    queryFn: () => fetchPlant(plantId!),
    enabled: !!plantId,
    staleTime: 30_000,
  });
}

export function usePlantVersion(plantId: string | null | undefined) {
  return useQuery({
    queryKey: ['plant', plantId, 'version'],
    queryFn: () => fetchPlantVersion(plantId!),
    enabled: !!plantId,
    // Versões são imutáveis (cada evolução gera ID novo); nunca revalida
    staleTime: Infinity,
    gcTime: 30 * 60_000,
  });
}
```

- [ ] **Step 2: Remover `PlantRow`/`PlantVersionRow` locais de `Garden.tsx`**

Localizar no `Garden.tsx`:
```ts
// Minimal types for Supabase join responses (not worth exporting to types/index.ts)
type PlantRow = { ... };
type PlantVersionRow = { ... };
```

Substituir por import:
```tsx
import { PlantRow, PlantVersionRow } from '@/hooks/usePlantData';
```

- [ ] **Step 3: Verificar tipos**

```powershell
Remove-Item -Force tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 4: Commit**

```powershell
git add src/hooks/usePlantData.ts src/components/Garden.tsx
git commit -m "feat: add plant query hooks (usePlant, usePlantVersion)"
```

---

## Task 5 — Garden mutations (`useGardenMutations`)

**Files:**
- Create: `src/hooks/useGardenMutations.ts`

**Interfaces:**
- Consome: `queryClient` de `@/lib/queryClient`; query keys `['garden', 'pots', userId]`, `['garden', 'shovel', userId]`, `['plant', plantId]`, `['plant', plantId, 'version']`, `['wallet', userId]`
- Produz:
  ```ts
  useDigMutation(userId: string): UseMutationResult<Pot, Error, {posX: number; posY: number}>
  usePlantMutation(userId: string): UseMutationResult<..., Error, {potId: string}>
  useWaterMutation(userId: string): UseMutationResult<..., Error, {plantId: string; potId: string}>
  useDeleteMutation(userId: string): UseMutationResult<..., Error, {plantId: string; potId: string}>
  ```

- [ ] **Step 1: Criar `src/hooks/useGardenMutations.ts`**

```ts
// src/hooks/useGardenMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

// ── helpers de fetch ──────────────────────────────────────────────────────

async function digHole(userId: string, posX: number, posY: number) {
  const res = await fetch('/api/shovel/dig', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, posX, posY }),
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error ?? 'Erro ao cavar'), { code: data.code });
  return data.pot;
}

async function plantSeed(userId: string, potId: string) {
  const res = await fetch('/api/plants/plant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, potId }),
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error ?? 'Erro ao plantar'), { code: data.code });
  return data.plant;
}

async function waterPlant(plantId: string) {
  const res = await fetch('/api/plants/water', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plantId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Erro ao regar');
  return data;
}

async function deletePlant(plantId: string, potId: string) {
  const res = await fetch('/api/plants/delete', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plantId, potId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Erro ao deletar');
  return data;
}

// ── hooks ─────────────────────────────────────────────────────────────────

export function useDigMutation(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ posX, posY }: { posX: number; posY: number }) =>
      digHole(userId, posX, posY),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['garden', 'pots', userId] });
      qc.invalidateQueries({ queryKey: ['garden', 'shovel', userId] });
    },
  });
}

export function usePlantMutation(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ potId }: { potId: string }) => plantSeed(userId, potId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['garden', 'pots', userId] });
      qc.invalidateQueries({ queryKey: ['wallet', userId] });
    },
  });
}

export function useWaterMutation(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ plantId }: { plantId: string; potId: string }) => waterPlant(plantId),
    onSuccess: (_data, { plantId }) => {
      qc.invalidateQueries({ queryKey: ['plant', plantId] });
      qc.invalidateQueries({ queryKey: ['plant', plantId, 'version'] });
    },
  });
}

export function useDeleteMutation(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ plantId, potId }: { plantId: string; potId: string }) =>
      deletePlant(plantId, potId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['garden', 'pots', userId] });
    },
  });
}
```

- [ ] **Step 2: Verificar tipos**

```powershell
Remove-Item -Force tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 3: Commit**

```powershell
git add src/hooks/useGardenMutations.ts
git commit -m "feat: add garden mutation hooks (dig, plant, water, delete)"
```

---

## Task 6 — Refatorar `Garden.tsx` para usar os hooks RQ

**Files:**
- Modify: `src/components/Garden.tsx`

**Interfaces:**
- Consome: todos os hooks das Tasks 3, 4, 5
- Remove: todos os `useState`+`useCallback` de fetch manual, `shovelLastUsed`, `shovelCooldownMs` state, `cooldown useEffect`, `pots` state, `loading` state

> **Atenção:** o componente vai ficar significativamente menor. Manter o `DIG_DURATION_MS`, o `getPotState`, o cursor overlay e o shovel toolbar — só a camada de dados muda.

- [ ] **Step 1: Reescrever o componente `Garden` (parte de dados)**

Substituir toda a seção de estado + fetching manual (de `const [pots, setPots]` até `const shovelReady = ...`) por:

```tsx
export default function Garden() {
  const { user } = useAuth();

  // ── Dados via React Query ─────────────────────────────────────────────
  const { data: pots = [], isPending: potsLoading } = usePots(user?.id);
  const { data: shovelStatus } = useShovelStatus(user?.id);
  const shovelCooldownMs = shovelStatus?.cooldownRemainingMs ?? 0;
  const shovelReady = shovelCooldownMs === 0;

  // ── Mutations ────────────────────────────────────────────────────────
  const digMutation = useDigMutation(user?.id ?? '');
  const plantMutation = usePlantMutation(user?.id ?? '');

  // ── UI state (local — não pertence ao servidor) ───────────────────────
  const [shovelActive, setShovelActive] = useState(false);
  const [isShoveling, setIsShoveling] = useState(false);
  const [shovelError, setShovelError] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (potsLoading) {
    return (
      <div className="p-8 text-center text-stone-600 font-bold">
        Carregando seu jardim...
      </div>
    );
  }
  // ... resto do JSX igual ao atual
```

- [ ] **Step 2: Atualizar `handleGardenClick` para usar `digMutation`**

```tsx
const handleGardenClick = async (e: React.MouseEvent) => {
  if (!shovelActive || isShoveling || !user) return;
  const rect = containerRef.current?.getBoundingClientRect();
  if (!rect) return;

  const rawX = ((e.clientX - rect.left) / rect.width) * 100;
  const rawY = ((e.clientY - rect.top) / rect.height) * 100;
  const posX = Math.min(94, Math.max(6, rawX));
  const posY = Math.min(92, Math.max(8, rawY));

  setIsShoveling(true);
  setShovelError(null);
  setShovelActive(false);
  setCursorPos(null);

  try {
    await digMutation.mutateAsync({ posX, posY });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    setShovelError(e.code === 'COOLDOWN' ? 'A pá ainda está recarregando.' : (e.message ?? 'Erro ao cavar.'));
  } finally {
    setIsShoveling(false);
  }
};
```

- [ ] **Step 3: Atualizar `PotSlot` para usar `usePlant`, `usePlantVersion`, `useWaterMutation`, `useDeleteMutation`**

Substituir os `useState` + `useCallback` de fetch + `useEffect` por:

```tsx
function PotSlot({ pot, state, onNeedSeed }: {
  pot: Pot;
  state: PotState;
  onNeedSeed: (potId: string) => void;
}) {
  const { user } = useAuth();
  const { data: plant } = usePlant(pot.plant_id);
  const { data: latestVersion } = usePlantVersion(pot.plant_id);
  const plantMutation = usePlantMutation(user?.id ?? '');
  const waterMutation = useWaterMutation(user?.id ?? '');
  const deleteMutation = useDeleteMutation(user?.id ?? '');

  const [isEvolving, setIsEvolving] = useState(false);
  const [msLeft, setMsLeft] = useState(0);

  useEffect(() => {
    if (state !== 'digging' || !pot.digging_started_at) return;
    const deadline = new Date(pot.digging_started_at).getTime() + DIG_DURATION_MS;
    const update = () => setMsLeft(Math.max(0, deadline - Date.now()));
    update();
    const id = setInterval(update, 250);
    return () => clearInterval(id);
  }, [state, pot.digging_started_at]);
```

Para `handleWater`:
```tsx
const handleWater = async (e: React.MouseEvent) => {
  e.stopPropagation();
  if (!plant || waterMutation.isPending) return;
  const willEvolve =
    plant.current_stage_waters + 1 >= plant.current_stage.waters_required;
  if (willEvolve) setIsEvolving(true);
  try {
    await waterMutation.mutateAsync({ plantId: plant.id, potId: pot.id });
  } finally {
    setIsEvolving(false);
  }
};
```

Para `handlePlant`:
```tsx
const handlePlant = async (e: React.MouseEvent) => {
  e.stopPropagation();
  if (!user) return;
  try {
    await plantMutation.mutateAsync({ potId: pot.id });
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === 'NO_SEEDS') onNeedSeed(pot.id);
  }
};
```

Para `handleDelete`:
```tsx
const handleDelete = async (e: React.MouseEvent) => {
  e.stopPropagation();
  if (!plant || deleteMutation.isPending) return;
  if (!window.confirm('Tem certeza que deseja remover esta planta? Esta ação não pode ser desfeita e você perderá o DNA único dela.')) return;
  await deleteMutation.mutateAsync({ plantId: plant.id, potId: pot.id });
};
```

- [ ] **Step 4: Remover props/callbacks `onUpdate` e `onRemovePosition` do PotSlot**

Com React Query, PotSlot invalida suas próprias queries via mutations — não precisa mais receber `onUpdate` do pai.

Remover do `PotSlot` props: `onUpdate`.
Remover do `Garden` a prop `onUpdate={handleUpdate}` e a função `handleUpdate`.

> Atenção: `CoinPurchaseModal` recebe `onComplete` — manter. Trocar por: após `onComplete`, chamar `queryClient.invalidateQueries({ queryKey: ['garden', 'pots', user.id] })`.

- [ ] **Step 5: Verificar tipos**

```powershell
Remove-Item -Force tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 6: Smoke test manual**

```powershell
npm run dev
```

Roteiro de teste:
1. Abrir jardim → plantas carregam
2. Trocar para `/loja` e voltar → jardim **não** re-fetcha (network tab silencioso por 30s)
3. Regar planta → imagem atualiza; network tab mostra 1 request de `plant` + 1 de `plant-version`
4. Usar pá → botão mostra "Cavando...", aparece buraco com countdown
5. Clicar `+` no buraco → planta a semente (ou abre modal de compra se sem semente)
6. Deletar planta → vaso volta ao estado de buraco pronto

- [ ] **Step 7: Commit**

```powershell
git add src/components/Garden.tsx
git commit -m "refactor: Garden.tsx data layer migrated to React Query"
```

---

## Task 7 — Migrar `WalletProvider` para React Query

**Files:**
- Modify: `src/hooks/useWallet.tsx`

**Interfaces:**
- Mantém interface pública: `useWallet()` retorna `{ coins, seedCount, refresh, setCoins }` — nenhum consumidor muda
- `refresh()` vira `queryClient.invalidateQueries({ queryKey: ['wallet', userId] })`

- [ ] **Step 1: Atualizar `src/hooks/useWallet.tsx`**

```tsx
// src/hooks/useWallet.tsx
'use client';

import React, { createContext, useContext, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface WalletContextType {
  coins: number;
  seedCount: number;
  refresh: () => Promise<void>;
  setCoins: (coins: number) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

async function loadWallet(userId: string) {
  const [{ data: profile }, { count }] = await Promise.all([
    supabase.from('profiles').select('coins').eq('id', userId).single(),
    supabase.from('seeds').select('*', { count: 'exact', head: true }).eq('user_id', userId),
  ]);
  return { coins: profile?.coins ?? 0, seedCount: count ?? 0 };
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: () => loadWallet(user!.id),
    enabled: !!user,
    staleTime: 30_000,
  });

  const refresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ['wallet', user?.id] });
  }, [qc, user?.id]);

  // Permite override otimista do saldo sem aguardar re-fetch
  const setCoins = useCallback((coins: number) => {
    qc.setQueryData(['wallet', user?.id], (old: { coins: number; seedCount: number } | undefined) =>
      old ? { ...old, coins } : { coins, seedCount: 0 }
    );
  }, [qc, user?.id]);

  return (
    <WalletContext.Provider value={{
      coins: data?.coins ?? 0,
      seedCount: data?.seedCount ?? 0,
      refresh,
      setCoins,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (ctx === undefined) throw new Error('useWallet must be used within a WalletProvider');
  return ctx;
}
```

- [ ] **Step 2: Verificar tipos**

```powershell
Remove-Item -Force tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 3: Testar sidebar**

```powershell
npm run dev
```

- Sidebar deve mostrar saldo de moedas e sementes corretamente
- Comprar semente na Loja → contador atualiza sem reload

- [ ] **Step 4: Commit**

```powershell
git add src/hooks/useWallet.tsx
git commit -m "refactor: WalletProvider migrated to React Query"
```

---

## Checklist de self-review

- [x] Task 1 cobre Tier 1 (next/image + remotePatterns)
- [x] Task 2-6 cobrem Tier 2 (React Query)
- [x] Query keys consistentes em todos os hooks e mutations
- [x] `staleTime: Infinity` para plant versions (imutáveis)
- [x] `refetchInterval` dinâmico para shovel status (para quando cooldown = 0)
- [x] Wallet migrada (Task 7) — remove último fetch manual do app
- [x] Nenhum `TBD` ou placeholder
- [x] Todos os `mutateAsync` têm tipos inferidos corretamente pelas assinaturas das funções helper
