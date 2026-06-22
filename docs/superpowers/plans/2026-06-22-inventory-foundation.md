# Inventário — Plano A: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a tabela `inventory_items`, migrar seeds para ela, expor a API de inventário, adicionar o Kit de Embrulho na loja e renderizar o painel flutuante no jardim.

**Architecture:** `inventory_items` substitui a tabela `seeds` como fonte de verdade para itens do usuário (seeds + kits + plants). Helpers em `inventoryService.ts` centralizam a lógica de empilhamento e slots. O painel de inventário é um componente React absoluto dentro do Garden.

**Tech Stack:** Next.js 16.2.7, React 19, TypeScript strict, Supabase, @tanstack/react-query v5, lucide-react.

## Global Constraints

- TypeScript strict — zero `any`, zero erros em `tsc --noEmit`
- `inventory_items.slot_index` sempre entre 0 e 9 inclusive
- Seeds e wrapping_kits empilham até `quantity=10`; wrapped_plant e plant têm `quantity=1` fixo
- Nenhuma nova dependência npm
- A tabela `seeds` permanece no banco mas **não é mais escrita** pelo código (deprecated)
- `addStackableItem` e `findFreeSlot` exportadas de `inventoryService.ts` — reusadas em Plano B
- Verificação: `npx tsc --noEmit` zero erros

---

## Mapa de arquivos

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/20260622010000_inventory.sql` | Criar |
| `src/types/index.ts` | Modificar — `InventoryItem`, `InventoryItemType` |
| `src/services/inventoryService.ts` | Modificar — migrar para `inventory_items` |
| `src/hooks/useWallet.tsx` | Modificar — `seedCount` de `inventory_items` |
| `src/app/api/inventory/route.ts` | Criar — `GET /api/inventory` |
| `src/app/api/inventory/label/route.ts` | Criar — `PATCH /api/inventory/label` |
| `src/hooks/useInventory.ts` | Criar |
| `src/config/economy.ts` | Modificar — produto `wrapping_kit` |
| `src/app/api/store/buy/route.ts` | Modificar — handlers `seed` + `wrapping_kit` |
| `src/components/InventoryPanel.tsx` | Criar |
| `src/components/Garden.tsx` | Modificar — botão flutuante + `wrappingMode` state |

---

## Task 1 — DB migration + TypeScript types

**Files:**
- Create: `supabase/migrations/20260622010000_inventory.sql`
- Modify: `src/types/index.ts`

**Interfaces:**
- Produz: `InventoryItem`, `InventoryItemType` exportados de `@/types`

- [ ] **Step 1: Criar `supabase/migrations/20260622010000_inventory.sql`**

```sql
-- Tabela principal do inventário (substitui seeds para armazenar itens)
CREATE TABLE IF NOT EXISTS inventory_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  slot_index INTEGER NOT NULL CHECK (slot_index BETWEEN 0 AND 9),
  item_type  TEXT NOT NULL CHECK (item_type IN ('seed', 'wrapping_kit', 'wrapped_plant', 'plant')),
  plant_id   UUID REFERENCES plants(id) ON DELETE CASCADE,
  quantity   INTEGER NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 10),
  label      TEXT CHECK (char_length(label) <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, slot_index)
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_user ON inventory_items(user_id);

-- Migrar seeds existentes para inventory_items (1 slot por usuário, max 10)
INSERT INTO inventory_items (user_id, slot_index, item_type, quantity)
SELECT user_id, 0, 'seed', LEAST(COUNT(*)::INTEGER, 10)
FROM seeds
GROUP BY user_id
ON CONFLICT (user_id, slot_index) DO NOTHING;
```

> **Atenção:** aplicar manualmente em `https://supabase.com/dashboard/project/cnsrpukgnsdxznhlyyvr/sql`.

- [ ] **Step 2: Adicionar tipos em `src/types/index.ts`**

Após as exportações existentes, adicionar:
```ts
export type InventoryItemType = 'seed' | 'wrapping_kit' | 'wrapped_plant' | 'plant';

export interface InventoryItem {
  id: string;
  user_id: string;
  slot_index: number;
  item_type: InventoryItemType;
  plant_id: string | null;
  quantity: number;
  label: string | null;
  created_at: string;
}
```

- [ ] **Step 3: Verificar tipos**

```powershell
cd "C:\Users\mathe\Projetos\brotaria"
Remove-Item -Force tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 4: Commit**

```powershell
git add supabase/migrations/20260622010000_inventory.sql src/types/index.ts
git commit -m "feat: add inventory_items table and InventoryItem types"
```

---

## Task 2 — Migrar lógica de seeds: `inventoryService.ts` + `useWallet.tsx`

**Files:**
- Modify: `src/services/inventoryService.ts`
- Modify: `src/hooks/useWallet.tsx`

**Interfaces:**
- Produz (exportadas para uso em store/buy e Plano B):
  ```ts
  export async function addStackableItem(userId: string, itemType: 'seed' | 'wrapping_kit'): Promise<void>
  export async function findFreeSlot(userId: string): Promise<number | null>
  ```

- [ ] **Step 1: Reescrever `src/services/inventoryService.ts`**

```ts
import { supabaseAdmin } from '@/lib/supabaseServer';
import { generateRandomDNA } from './dnaService';

// ── Helpers de slot ────────────────────────────────────────────────────────

/** Retorna o primeiro slot com espaço para empilhar (quantity < 10), ou null. */
async function findStackableSlot(userId: string, itemType: 'seed' | 'wrapping_kit') {
  const { data } = await supabaseAdmin
    .from('inventory_items')
    .select('id, quantity')
    .eq('user_id', userId)
    .eq('item_type', itemType)
    .lt('quantity', 10)
    .order('slot_index', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

/** Retorna o próximo índice de slot vazio (0-9), ou null se inventário cheio. */
export async function findFreeSlot(userId: string): Promise<number | null> {
  const { data } = await supabaseAdmin
    .from('inventory_items')
    .select('slot_index')
    .eq('user_id', userId);
  const used = new Set((data ?? []).map((r) => r.slot_index as number));
  for (let i = 0; i < 10; i++) {
    if (!used.has(i)) return i;
  }
  return null;
}

/** Adiciona 1 unidade de um item empilhável ao inventário do usuário. */
export async function addStackableItem(
  userId: string,
  itemType: 'seed' | 'wrapping_kit',
): Promise<void> {
  const stackable = await findStackableSlot(userId, itemType);
  if (stackable) {
    const { error } = await supabaseAdmin
      .from('inventory_items')
      .update({ quantity: stackable.quantity + 1 })
      .eq('id', stackable.id);
    if (error) throw error;
    return;
  }
  const slot = await findFreeSlot(userId);
  if (slot === null) {
    throw Object.assign(new Error('Inventário cheio'), { code: 'INVENTORY_FULL' });
  }
  const { error } = await supabaseAdmin.from('inventory_items').insert({
    user_id: userId,
    slot_index: slot,
    item_type: itemType,
    quantity: 1,
  });
  if (error) throw error;
}

// ── Inicialização ──────────────────────────────────────────────────────────

export async function initializeUser(userId: string, email: string) {
  console.log(`[Inventory] Checking/Initializing user ${userId}`);

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({ id: userId, email: email })
    .select()
    .single();

  if (profileError) {
    console.error('[Inventory] Profile Error:', profileError);
    throw new Error(`Profile initialization failed: ${profileError.message}`);
  }

  // Verifica se usuário já foi inicializado (tem itens no inventário)
  const { count: invCount } = await supabaseAdmin
    .from('inventory_items')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (invCount && invCount > 0) {
    console.log(`[Inventory] User ${userId} already initialized.`);
    return { success: true, message: 'Already initialized' };
  }

  console.log(`[Inventory] Granting free seed to ${userId}`);
  await addStackableItem(userId, 'seed');

  return { success: true, message: 'Free seed granted' };
}

// ── Plantar ────────────────────────────────────────────────────────────────

export async function plantSeed(userId: string, potId: string) {
  console.log(`[Inventory] User ${userId} planting seed in pot ${potId}`);

  // 1. Verifica se tem semente no inventário
  const { data: seedSlot, error: seedFetchError } = await supabaseAdmin
    .from('inventory_items')
    .select('id, quantity')
    .eq('user_id', userId)
    .eq('item_type', 'seed')
    .gt('quantity', 0)
    .limit(1)
    .maybeSingle();

  if (seedFetchError || !seedSlot) {
    const err = new Error('No seeds available') as Error & { code?: string };
    err.code = 'NO_SEEDS';
    throw err;
  }

  // 2. Verifica se o pot está vazio
  const { data: pot, error: potFetchError } = await supabaseAdmin
    .from('pots')
    .select('id, plant_id')
    .eq('id', potId)
    .eq('user_id', userId)
    .single();

  if (potFetchError || !pot) throw new Error('Pot not found');
  if (pot.plant_id) throw new Error('Pot is already occupied');

  // 3. Gera DNA
  const dna = generateRandomDNA();

  // 4. Busca estágio inicial
  const { data: stage } = await supabaseAdmin
    .from('plant_stages')
    .select('id')
    .eq('code', 'enterrada')
    .single();

  if (!stage) throw new Error('Initial stage not found');

  // 5. Cria planta
  const { data: plant, error: plantError } = await supabaseAdmin
    .from('plants')
    .insert({
      user_id: userId,
      pot_id: potId,
      dna: dna,
      current_stage_id: stage.id,
      hydration_status: 'hydrated',
      next_water_needed_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (plantError) throw plantError;

  // 6. Atualiza pot e remove semente do inventário
  await supabaseAdmin.from('pots').update({ plant_id: plant.id }).eq('id', potId);

  if (seedSlot.quantity > 1) {
    await supabaseAdmin
      .from('inventory_items')
      .update({ quantity: seedSlot.quantity - 1 })
      .eq('id', seedSlot.id);
  } else {
    await supabaseAdmin.from('inventory_items').delete().eq('id', seedSlot.id);
  }

  return plant;
}
```

- [ ] **Step 2: Atualizar `seedCount` em `src/hooks/useWallet.tsx`**

Localizar a função `loadWallet` e substituir a query de seeds:

```ts
// ANTES:
// supabase.from('seeds').select('*', { count: 'exact', head: true }).eq('user_id', userId)

// DEPOIS — soma quantity de todos os slots de seed:
async function loadWallet(userId: string): Promise<{ coins: number; seedCount: number }> {
  const [{ data: profile, error: profileErr }, { data: seedSlots, error: slotsErr }] =
    await Promise.all([
      supabase.from('profiles').select('coins').eq('id', userId).single(),
      supabase
        .from('inventory_items')
        .select('quantity')
        .eq('user_id', userId)
        .eq('item_type', 'seed'),
    ]);
  if (profileErr) throw profileErr;
  if (slotsErr) throw slotsErr;
  const seedCount = (seedSlots ?? []).reduce((sum, s) => sum + s.quantity, 0);
  return { coins: profile?.coins ?? 0, seedCount };
}
```

- [ ] **Step 3: Verificar tipos**

```powershell
Remove-Item -Force tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 4: Commit**

```powershell
git add src/services/inventoryService.ts src/hooks/useWallet.tsx
git commit -m "feat: migrate seed logic from seeds table to inventory_items"
```

---

## Task 3 — API routes: `GET /api/inventory` + `PATCH /api/inventory/label`

**Files:**
- Create: `src/app/api/inventory/route.ts`
- Create: `src/app/api/inventory/label/route.ts`

**Interfaces:**
- `GET /api/inventory?userId=X` → `InventoryItem[]`
- `PATCH /api/inventory/label` body `{ userId, itemId, label }` → `{ success: true }`

- [ ] **Step 1: Criar `src/app/api/inventory/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }
    const { data, error } = await supabaseAdmin
      .from('inventory_items')
      .select('*')
      .eq('user_id', userId)
      .order('slot_index', { ascending: true });
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch inventory';
    console.error('[Inventory API] Error:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 2: Criar `src/app/api/inventory/label/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function PATCH(request: Request) {
  try {
    const { userId, itemId, label } = await request.json();
    if (!userId || !itemId) {
      return NextResponse.json({ error: 'Missing userId or itemId' }, { status: 400 });
    }
    const trimmed = typeof label === 'string' ? label.trim().slice(0, 100) : null;
    const { error } = await supabaseAdmin
      .from('inventory_items')
      .update({ label: trimmed || null })
      .eq('id', itemId)
      .eq('user_id', userId)
      .eq('item_type', 'wrapped_plant');
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to update label';
    console.error('[Inventory Label API] Error:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verificar tipos**

```powershell
Remove-Item -Force tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 4: Commit**

```powershell
git add src/app/api/inventory/route.ts src/app/api/inventory/label/route.ts
git commit -m "feat: add GET /api/inventory and PATCH /api/inventory/label"
```

---

## Task 4 — Hook `useInventory`

**Files:**
- Create: `src/hooks/useInventory.ts`

**Interfaces:**
- Produz:
  ```ts
  export function useInventory(userId: string | undefined): UseQueryResult<InventoryItem[]>
  // queryKey: ['inventory', userId], staleTime: 30_000
  ```

- [ ] **Step 1: Criar `src/hooks/useInventory.ts`**

```ts
import { useQuery } from '@tanstack/react-query';
import { InventoryItem } from '@/types';

async function fetchInventory(userId: string): Promise<InventoryItem[]> {
  const res = await fetch(`/api/inventory?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error('Failed to fetch inventory');
  return res.json();
}

export function useInventory(userId: string | undefined) {
  return useQuery({
    queryKey: ['inventory', userId],
    queryFn: () => fetchInventory(userId!),
    enabled: !!userId,
    staleTime: 30_000,
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
git add src/hooks/useInventory.ts
git commit -m "feat: add useInventory React Query hook"
```

---

## Task 5 — Loja: produto `wrapping_kit` + store buy handler

**Files:**
- Modify: `src/config/economy.ts`
- Modify: `src/app/api/store/buy/route.ts`

**Interfaces:**
- Consome: `addStackableItem` de `@/services/inventoryService`

- [ ] **Step 1: Adicionar produto em `src/config/economy.ts`**

Localizar o array `STORE_PRODUCTS` e adicionar após o produto `seed`:
```ts
{
  id: 'wrapping_kit',
  name: '🎁 Kit de Embrulho',
  description: 'Embrulha uma planta como presente misterioso. Ela fica no inventário sem revelar o que tem dentro.',
  cost_coins: 20,
},
```

- [ ] **Step 2: Atualizar `src/app/api/store/buy/route.ts`**

Adicionar import no topo:
```ts
import { addStackableItem } from '@/services/inventoryService';
```

Substituir o handler `product.id === 'seed'` e adicionar `wrapping_kit`:
```ts
    // 2) Entrega o produto.
    if (product.id === 'seed' || product.id === 'wrapping_kit') {
      try {
        await addStackableItem(userId, product.id as 'seed' | 'wrapping_kit');
      } catch (deliveryError: unknown) {
        // Refund em caso de falha na entrega
        await supabaseAdmin.rpc('add_coins', { p_user_id: userId, p_amount: product.cost_coins });
        throw deliveryError;
      }
    }
```

(Remove o bloco antigo `if (product.id === 'seed') { from('seeds').insert... }`)

- [ ] **Step 3: Verificar tipos**

```powershell
Remove-Item -Force tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 4: Commit**

```powershell
git add src/config/economy.ts src/app/api/store/buy/route.ts
git commit -m "feat: add wrapping_kit product and migrate seed delivery to inventory_items"
```

---

## Task 6 — Componente `InventoryPanel`

**Files:**
- Create: `src/components/InventoryPanel.tsx`

**Interfaces:**
- Consome: `useInventory` de `@/hooks/useInventory`; `InventoryItem` de `@/types`
- Produz:
  ```ts
  export function InventoryPanel(props: {
    userId: string | undefined;
    onWrapMode: () => void;
  }): JSX.Element
  ```

- [ ] **Step 1: Criar `src/components/InventoryPanel.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { Package, Sprout, Gift, X } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import { InventoryItem } from '@/types';

function SlotContent({ item }: { item: InventoryItem | undefined }) {
  if (!item) {
    return (
      <div className="w-full h-full border-2 border-dashed border-stone-600/30 rounded-xl" />
    );
  }
  if (item.item_type === 'seed') {
    return (
      <div className="flex flex-col items-center justify-center gap-0.5 w-full h-full bg-green-900/30 border border-green-700/30 rounded-xl cursor-default">
        <Sprout className="w-5 h-5 text-green-400" />
        <span className="text-green-300 text-[9px] font-bold">×{item.quantity}</span>
      </div>
    );
  }
  if (item.item_type === 'wrapping_kit') {
    return (
      <div className="flex flex-col items-center justify-center gap-0.5 w-full h-full bg-rose-900/30 border border-rose-700/30 rounded-xl cursor-default">
        <Gift className="w-5 h-5 text-rose-400" />
        <span className="text-rose-300 text-[9px] font-bold">×{item.quantity}</span>
      </div>
    );
  }
  // wrapped_plant and plant handled in Plano B
  return (
    <div className="w-full h-full bg-stone-700/30 border border-stone-600/30 rounded-xl" />
  );
}

export function InventoryPanel({
  userId,
  onWrapMode,
}: {
  userId: string | undefined;
  onWrapMode: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: items = [] } = useInventory(userId);

  const slots = Array.from({ length: 10 }, (_, i) =>
    items.find((item) => item.slot_index === i),
  );

  const hasKits = items.some((i) => i.item_type === 'wrapping_kit');
  const totalItems = items.length;

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`absolute bottom-4 left-4 z-20 flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold shadow-lg transition-all text-sm active:scale-95 ${
          open
            ? 'bg-stone-600 text-white'
            : 'bg-stone-800 text-white hover:bg-stone-700'
        }`}
      >
        <Package className="w-4 h-4" />
        <span>Mochila</span>
        {totalItems > 0 && (
          <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            {totalItems}
          </span>
        )}
      </button>

      {/* Painel */}
      {open && (
        <div
          className="absolute bottom-16 left-4 z-30 w-72 bg-stone-900/95 backdrop-blur-sm border border-stone-700/50 rounded-2xl p-4 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="font-black text-white text-sm">🎒 Mochila</span>
            <button
              onClick={() => setOpen(false)}
              className="text-stone-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Grade 5×2 */}
          <div className="grid grid-cols-5 gap-2">
            {slots.map((item, i) => (
              <div key={i} className="aspect-square">
                <SlotContent item={item} />
              </div>
            ))}
          </div>

          {/* Botão embrulhar */}
          {hasKits && (
            <button
              onClick={() => {
                setOpen(false);
                onWrapMode();
              }}
              className="mt-3 w-full py-2 bg-rose-700 hover:bg-rose-600 text-white text-sm font-bold rounded-xl transition-all active:scale-95"
            >
              🎁 Embrulhar planta
            </button>
          )}

          {items.length === 0 && (
            <p className="text-stone-500 text-xs text-center mt-2">
              Inventário vazio
            </p>
          )}
        </div>
      )}
    </>
  );
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
git add src/components/InventoryPanel.tsx
git commit -m "feat: add InventoryPanel floating component with 10 slots"
```

---

## Task 7 — Integrar `InventoryPanel` no `Garden.tsx`

**Files:**
- Modify: `src/components/Garden.tsx`

Mudanças:
1. Importar `InventoryPanel`
2. Adicionar `wrappingMode` state no `Garden` (usado no Plano B)
3. Renderizar `<InventoryPanel>` dentro do container do jardim

- [ ] **Step 1: Adicionar import em `Garden.tsx`**

```tsx
import { InventoryPanel } from '@/components/InventoryPanel';
```

- [ ] **Step 2: Adicionar `wrappingMode` state no componente `Garden`**

Após as declarações de state existentes:
```tsx
const [wrappingMode, setWrappingMode] = useState(false);
```

- [ ] **Step 3: Renderizar `InventoryPanel` no return do Garden**

Dentro do `<div ref={containerRef} ...>`, adicionar imediatamente antes de `<CoinPurchaseModal`:
```tsx
      <InventoryPanel
        userId={user?.id}
        onWrapMode={() => setWrappingMode(true)}
      />
```

- [ ] **Step 4: Verificar tipos**

```powershell
Remove-Item -Force tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 5: Smoke test**

```powershell
npm run dev
```

- Jardim: botão "Mochila" aparece no canto inferior esquerdo
- Clicar → painel abre com 10 slots (sementes visíveis se houver)
- Comprar semente na loja → contador no botão atualiza
- Comprar kit de embrulho (20 moedas) → aparece no inventário como 🎁

- [ ] **Step 6: Commit**

```powershell
git add src/components/Garden.tsx
git commit -m "feat: integrate InventoryPanel into Garden with wrapping mode state"
```

---

## Self-review

### Spec coverage
- [x] Task 1 — `inventory_items` table + `InventoryItem` type
- [x] Task 2 — seeds migradas; `addStackableItem`, `findFreeSlot` exportadas
- [x] Task 3 — `GET /api/inventory` + `PATCH /api/inventory/label`
- [x] Task 4 — `useInventory` hook
- [x] Task 5 — `wrapping_kit` product + buy route handler
- [x] Task 6 — `InventoryPanel` (seeds + kits + empty slots)
- [x] Task 7 — Garden integration + `wrappingMode` state

### Verificações adicionais
- `addStackableItem` em `inventoryService.ts` usa `maybeSingle()` (sem erro em zero rows). ✓
- `plantSeed` usa a tabela `inventory_items` para buscar e remover seed — `seeds` table não é mais tocada pelo código. ✓
- `useWallet.tsx` soma `quantity` de todos os slots `seed` — funciona se usuário tiver múltiplos slots. ✓
- `InventoryPanel` usa `e.stopPropagation()` para não interferir com shovel click no jardim. ✓
- `wrappingMode` está declarado no `Garden` mas não utilizado ainda — usado no Plano B. ✓
