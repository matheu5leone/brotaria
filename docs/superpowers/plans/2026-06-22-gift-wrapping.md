# Inventário — Plano B: Embrulho de Presente

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Pré-requisito:** Plano A deve estar completamente implementado e a migration `20260622010000_inventory.sql` aplicada no Supabase.

**Goal:** Implementar o fluxo completo de embrulhar e abrir presentes: API de embrulho/abertura, modo de seleção no jardim, display de wrapped_plant no inventário com label editável e animação de abertura com partículas.

**Architecture:** `POST /api/inventory/use-kit` move a planta do pot para o inventário. `POST /api/inventory/open-gift` muda `wrapped_plant → plant` no mesmo slot. A animação de abertura é orquestrada em CSS com keyframes + state machine local no `InventoryPanel`. `RarityEffect` é reutilizado para as partículas pós-abertura.

**Tech Stack:** Next.js 16.2.7, React 19, TypeScript strict, Supabase, @tanstack/react-query v5, CSS keyframes, lucide-react.

## Global Constraints

- TypeScript strict — zero `any`, zero erros em `tsc --noEmit`
- Animação de abertura: duração total ~1.8s, puramente em CSS keyframes + inline style
- `RarityEffect` existente em `@/components/RarityEffect` — reutilizar para partículas pós-reveal
- Nenhuma nova dependência npm
- API `use-kit`: valida que usuário tem kit E planta está num pot E há slot livre
- API `open-gift`: muda `wrapped_plant → plant` no MESMO slot (sem mover slot_index)
- Verificação: `npx tsc --noEmit` zero erros

---

## Mapa de arquivos

| Arquivo | Ação |
|---------|------|
| `src/app/api/inventory/use-kit/route.ts` | Criar — `POST /api/inventory/use-kit` |
| `src/app/api/inventory/open-gift/route.ts` | Criar — `POST /api/inventory/open-gift` |
| `src/app/globals.css` | Modificar — keyframes `gift-shake`, `gift-explode`, `gift-reveal` |
| `src/hooks/useInventory.ts` | Modificar — adicionar mutations |
| `src/components/InventoryPanel.tsx` | Modificar — slots `wrapped_plant`/`plant` + animação |
| `src/components/Garden.tsx` | Modificar — modo seleção de embrulho |

---

## Task 1 — API `POST /api/inventory/use-kit`

**Files:**
- Create: `src/app/api/inventory/use-kit/route.ts`

**Interfaces:**
- Consome: `findFreeSlot` de `@/services/inventoryService`
- Body: `{ userId: string; plantId: string }`
- Response: `{ success: true; item: InventoryItem }`

- [ ] **Step 1: Criar `src/app/api/inventory/use-kit/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { findFreeSlot } from '@/services/inventoryService';

export async function POST(request: Request) {
  try {
    const { userId, plantId } = await request.json();

    if (!userId || !plantId) {
      return NextResponse.json({ error: 'Missing userId or plantId' }, { status: 400 });
    }

    // 1. Verifica que o usuário tem kit de embrulho
    const { data: kitSlot, error: kitError } = await supabaseAdmin
      .from('inventory_items')
      .select('id, quantity')
      .eq('user_id', userId)
      .eq('item_type', 'wrapping_kit')
      .gt('quantity', 0)
      .order('slot_index', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (kitError) throw kitError;
    if (!kitSlot) {
      return NextResponse.json({ error: 'Sem kit de embrulho', code: 'NO_KIT' }, { status: 400 });
    }

    // 2. Verifica que a planta pertence ao usuário e está num pot
    const { data: plant, error: plantError } = await supabaseAdmin
      .from('plants')
      .select('id, pot_id, user_id')
      .eq('id', plantId)
      .eq('user_id', userId)
      .single();

    if (plantError || !plant) {
      return NextResponse.json({ error: 'Planta não encontrada' }, { status: 404 });
    }
    if (!plant.pot_id) {
      return NextResponse.json({ error: 'Planta não está num vaso', code: 'PLANT_NOT_IN_POT' }, { status: 400 });
    }

    // 3. Verifica slot livre no inventário
    const freeSlot = await findFreeSlot(userId);
    if (freeSlot === null) {
      return NextResponse.json({ error: 'Inventário cheio', code: 'INVENTORY_FULL' }, { status: 400 });
    }

    // 4. Transação atômica: remove planta do pot → cria wrapped_plant → decrementa kit
    const potId = plant.pot_id;

    const { error: potError } = await supabaseAdmin
      .from('pots')
      .update({ plant_id: null })
      .eq('id', potId);
    if (potError) throw potError;

    const { data: newItem, error: insertError } = await supabaseAdmin
      .from('inventory_items')
      .insert({
        user_id: userId,
        slot_index: freeSlot,
        item_type: 'wrapped_plant',
        plant_id: plantId,
        quantity: 1,
      })
      .select()
      .single();
    if (insertError) throw insertError;

    if (kitSlot.quantity > 1) {
      await supabaseAdmin
        .from('inventory_items')
        .update({ quantity: kitSlot.quantity - 1 })
        .eq('id', kitSlot.id);
    } else {
      await supabaseAdmin.from('inventory_items').delete().eq('id', kitSlot.id);
    }

    return NextResponse.json({ success: true, item: newItem });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to wrap plant';
    console.error('[Use Kit API] Error:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verificar tipos**

```powershell
cd "C:\Users\mathe\Projetos\brotaria"
Remove-Item -Force tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 3: Commit**

```powershell
git add src/app/api/inventory/use-kit/route.ts
git commit -m "feat: add POST /api/inventory/use-kit to wrap a plant"
```

---

## Task 2 — API `POST /api/inventory/open-gift`

**Files:**
- Create: `src/app/api/inventory/open-gift/route.ts`

**Interfaces:**
- Body: `{ userId: string; itemId: string }`
- Response: `{ success: true; dna: PlantDNA; stageOrder: number }`

- [ ] **Step 1: Criar `src/app/api/inventory/open-gift/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { PlantDNA } from '@/types';

export async function POST(request: Request) {
  try {
    const { userId, itemId } = await request.json();

    if (!userId || !itemId) {
      return NextResponse.json({ error: 'Missing userId or itemId' }, { status: 400 });
    }

    // 1. Busca o item wrapped_plant
    const { data: item, error: itemError } = await supabaseAdmin
      .from('inventory_items')
      .select('id, plant_id, slot_index')
      .eq('id', itemId)
      .eq('user_id', userId)
      .eq('item_type', 'wrapped_plant')
      .single();

    if (itemError || !item || !item.plant_id) {
      return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 });
    }

    // 2. Busca DNA e estágio atual da planta (para a animação de raridade)
    const { data: plant, error: plantError } = await supabaseAdmin
      .from('plants')
      .select('dna, current_stage:plant_stages(order_index)')
      .eq('id', item.plant_id)
      .single();

    if (plantError || !plant) {
      return NextResponse.json({ error: 'Planta não encontrada' }, { status: 404 });
    }

    // 3. Muda wrapped_plant → plant no mesmo slot, limpa a label
    const { error: updateError } = await supabaseAdmin
      .from('inventory_items')
      .update({ item_type: 'plant', label: null })
      .eq('id', itemId);

    if (updateError) throw updateError;

    type StageRow = { order_index: number };
    const stageOrder = (plant.current_stage as unknown as StageRow | null)?.order_index ?? 1;

    return NextResponse.json({
      success: true,
      dna: plant.dna as unknown as PlantDNA,
      stageOrder,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to open gift';
    console.error('[Open Gift API] Error:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
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
git add src/app/api/inventory/open-gift/route.ts
git commit -m "feat: add POST /api/inventory/open-gift to unwrap plant"
```

---

## Task 3 — CSS keyframes de animação de abertura

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Adicionar keyframes em `globals.css` após os keyframes de raridade**

```css
/* ---------- Inventário — animação de abertura de presente ---------- */

@keyframes gift-shake {
  0%   { transform: rotate(0deg); }
  15%  { transform: rotate(-8deg); }
  30%  { transform: rotate(8deg); }
  45%  { transform: rotate(-12deg); }
  60%  { transform: rotate(12deg); }
  75%  { transform: rotate(-8deg); }
  90%  { transform: rotate(8deg); }
  100% { transform: rotate(0deg); }
}

@keyframes gift-explode {
  0%   { transform: scale(1);   opacity: 1; }
  60%  { transform: scale(1.5); opacity: 0.6; }
  100% { transform: scale(0);   opacity: 0; }
}

@keyframes gift-flash {
  0%, 100% { background: transparent; }
  50%       { background: rgba(255, 255, 255, 0.35); }
}

@keyframes gift-reveal {
  0%   { transform: scale(0.3) rotate(-5deg); opacity: 0; }
  60%  { transform: scale(1.1) rotate(2deg);  opacity: 1; }
  100% { transform: scale(1)   rotate(0deg);  opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .gift-shaking, .gift-exploding, .gift-revealing {
    animation: none !important;
  }
}
```

- [ ] **Step 2: Verificar build**

```powershell
Remove-Item -Force tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 3: Commit**

```powershell
git add src/app/globals.css
git commit -m "feat: add gift opening animation keyframes"
```

---

## Task 4 — Mutations em `useInventory.ts`

**Files:**
- Modify: `src/hooks/useInventory.ts`

**Interfaces:**
- Produz:
  ```ts
  export function useWrapPlant(userId: string): UseMutationResult<..., Error, {plantId: string}>
  export function useOpenGift(userId: string): UseMutationResult<{dna: PlantDNA; stageOrder: number}, Error, {itemId: string}>
  export function usePatchLabel(userId: string): UseMutationResult<..., Error, {itemId: string; label: string}>
  ```

- [ ] **Step 1: Atualizar `src/hooks/useInventory.ts`**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { InventoryItem, PlantDNA } from '@/types';

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

export function useWrapPlant(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ plantId }: { plantId: string }) => {
      const res = await fetch('/api/inventory/use-kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, plantId }),
      });
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error(data.error ?? 'Erro ao embrulhar'), { code: data.code });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', userId] });
      qc.invalidateQueries({ queryKey: ['garden', 'pots', userId] });
    },
  });
}

export function useOpenGift(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId }: { itemId: string }): Promise<{ dna: PlantDNA; stageOrder: number }> => {
      const res = await fetch('/api/inventory/open-gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, itemId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro ao abrir presente');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', userId] });
    },
  });
}

export function usePatchLabel(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, label }: { itemId: string; label: string }) => {
      const res = await fetch('/api/inventory/label', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, itemId, label }),
      });
      if (!res.ok) throw new Error('Erro ao salvar etiqueta');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', userId] });
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
git add src/hooks/useInventory.ts
git commit -m "feat: add useWrapPlant, useOpenGift, usePatchLabel mutations"
```

---

## Task 5 — `InventoryPanel`: slots `wrapped_plant`/`plant` + animação de abertura

**Files:**
- Modify: `src/components/InventoryPanel.tsx`

Esta é a task mais complexa. O painel ganha:
1. Slot `wrapped_plant`: caixa com laço + ícone "ⓘ" com tooltip/edição de label + clique para abrir
2. Slot `plant`: miniatura da imagem + badge de raridade
3. Estado de animação: `shaking → exploding → revealing`

- [ ] **Step 1: Reescrever `src/components/InventoryPanel.tsx`**

```tsx
'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Package, Sprout, Gift, X, Info, Coins } from 'lucide-react';
import { useInventory, useOpenGift, usePatchLabel } from '@/hooks/useInventory';
import { usePlantVersion } from '@/hooks/usePlantData';
import { RarityEffect } from '@/components/RarityEffect';
import { calcPlantScore } from '@/lib/scoring';
import { InventoryItem, Rarity, PlantDNA } from '@/types';

// ── Tipos de animação ────────────────────────────────────────────────────────

type OpenPhase = 'idle' | 'shaking' | 'exploding' | 'revealing';

// ── Slot: Planta embrulhada ───────────────────────────────────────────────────

function WrappedPlantSlot({
  item,
  onOpen,
  onLabelSave,
}: {
  item: InventoryItem;
  onOpen: () => void;
  onLabelSave: (label: string) => void;
}) {
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelValue, setLabelValue] = useState(item.label ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleLabelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingLabel(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleLabelSave = () => {
    setEditingLabel(false);
    onLabelSave(labelValue);
  };

  return (
    <div
      className="relative flex flex-col items-center justify-center gap-0.5 w-full h-full bg-rose-950/40 border border-rose-700/40 rounded-xl cursor-pointer hover:bg-rose-900/40 transition-colors group"
      onClick={onOpen}
    >
      <span className="text-2xl select-none">🎁</span>
      <span className="text-rose-300 text-[8px] font-bold">Abrir</span>

      {/* Ícone de info com label */}
      <button
        className="absolute top-0.5 right-0.5 text-rose-400/60 hover:text-rose-300 transition-colors"
        onClick={handleLabelClick}
        title={item.label || 'Sem etiqueta — clique para editar'}
      >
        <Info className="w-3 h-3" />
      </button>

      {/* Editor de label inline */}
      {editingLabel && (
        <div
          className="absolute inset-0 bg-stone-900/95 rounded-xl flex flex-col items-center justify-center p-1 gap-1 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            ref={inputRef}
            className="w-full text-[9px] bg-stone-700 text-white rounded px-1 py-0.5 outline-none text-center"
            value={labelValue}
            maxLength={100}
            onChange={(e) => setLabelValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleLabelSave(); if (e.key === 'Escape') setEditingLabel(false); }}
            onBlur={handleLabelSave}
            placeholder="Etiqueta..."
          />
        </div>
      )}
    </div>
  );
}

// ── Slot: Planta revelada ─────────────────────────────────────────────────────

function PlantSlot({ item }: { item: InventoryItem }) {
  const { data: version } = usePlantVersion(item.plant_id);
  const rarity = (item as unknown as { _rarity?: Rarity })._rarity ?? 'comum';

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full bg-stone-800/40 border border-stone-600/30 rounded-xl overflow-hidden">
      {version?.image_url ? (
        <div className="relative w-full h-full">
          <Image src={version.image_url} alt="Planta" fill className="object-contain p-1" />
        </div>
      ) : (
        <div className="w-6 h-6 rounded-full bg-stone-600/40 animate-pulse" />
      )}
    </div>
  );
}

// ── Slot animado (abertura) ───────────────────────────────────────────────────

function AnimatingSlot({ phase, rarity }: { phase: OpenPhase; rarity: Rarity }) {
  if (phase === 'shaking' || phase === 'exploding') {
    return (
      <div
        className="relative flex items-center justify-center w-full h-full bg-rose-950/40 border border-rose-700/40 rounded-xl overflow-hidden"
        style={{
          animation: phase === 'shaking'
            ? 'gift-shake 0.8s ease-in-out'
            : 'gift-explode 0.6s ease-out forwards',
        }}
      >
        {phase === 'exploding' && (
          <div className="absolute inset-0 rounded-xl" style={{ animation: 'gift-flash 0.3s ease-in-out' }} />
        )}
        <span className="text-2xl">🎁</span>
      </div>
    );
  }
  if (phase === 'revealing') {
    return (
      <div
        className="relative flex items-center justify-center w-full h-full bg-stone-800/40 border rounded-xl overflow-hidden"
        style={{
          borderColor: `var(--rarity-${rarity})`,
          animation: 'gift-reveal 0.6s ease-out forwards',
        }}
      >
        <RarityEffect rarity={rarity} alwaysVisible>
          <div className="relative w-full h-full flex items-center justify-center">
            <span className="text-2xl">🌱</span>
          </div>
        </RarityEffect>
      </div>
    );
  }
  return null;
}

// ── SlotContent principal ─────────────────────────────────────────────────────

function SlotContent({
  item,
  animPhase,
  animRarity,
  onOpenGift,
  onLabelSave,
}: {
  item: InventoryItem | undefined;
  animPhase: OpenPhase;
  animRarity: Rarity;
  onOpenGift: () => void;
  onLabelSave: (label: string) => void;
}) {
  if (animPhase !== 'idle') return <AnimatingSlot phase={animPhase} rarity={animRarity} />;

  if (!item) return <div className="w-full h-full border-2 border-dashed border-stone-600/30 rounded-xl" />;

  if (item.item_type === 'seed') {
    return (
      <div className="flex flex-col items-center justify-center gap-0.5 w-full h-full bg-green-900/30 border border-green-700/30 rounded-xl">
        <Sprout className="w-5 h-5 text-green-400" />
        <span className="text-green-300 text-[9px] font-bold">×{item.quantity}</span>
      </div>
    );
  }
  if (item.item_type === 'wrapping_kit') {
    return (
      <div className="flex flex-col items-center justify-center gap-0.5 w-full h-full bg-rose-900/30 border border-rose-700/30 rounded-xl">
        <Gift className="w-5 h-5 text-rose-400" />
        <span className="text-rose-300 text-[9px] font-bold">×{item.quantity}</span>
      </div>
    );
  }
  if (item.item_type === 'wrapped_plant') {
    return <WrappedPlantSlot item={item} onOpen={onOpenGift} onLabelSave={onLabelSave} />;
  }
  if (item.item_type === 'plant') {
    return <PlantSlot item={item} />;
  }
  return null;
}

// ── Painel principal ──────────────────────────────────────────────────────────

export function InventoryPanel({
  userId,
  onWrapMode,
}: {
  userId: string | undefined;
  onWrapMode: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [animatingSlot, setAnimatingSlot] = useState<number | null>(null);
  const [animPhase, setAnimPhase] = useState<OpenPhase>('idle');
  const [animRarity, setAnimRarity] = useState<Rarity>('comum');

  const { data: items = [] } = useInventory(userId);
  const openGiftMutation = useOpenGift(userId ?? '');
  const patchLabelMutation = usePatchLabel(userId ?? '');

  const slots = Array.from({ length: 10 }, (_, i) => items.find((it) => it.slot_index === i));
  const hasKits = items.some((i) => i.item_type === 'wrapping_kit');
  const totalItems = items.length;

  const handleOpenGift = async (item: InventoryItem) => {
    if (!confirm('Abrir o presente? A surpresa será revelada!')) return;

    // Chama API imediatamente (DB update rápido)
    let rarity: Rarity = 'comum';
    try {
      const result = await openGiftMutation.mutateAsync({ itemId: item.id });
      const dna = result.dna as PlantDNA | undefined;
      rarity = (dna?.rarity as Rarity) ?? 'comum';
    } catch {
      return; // API falhou, não animar
    }

    setAnimRarity(rarity);
    setAnimatingSlot(item.slot_index);

    // Sequência de animação: shaking → exploding → revealing → idle
    setAnimPhase('shaking');
    setTimeout(() => setAnimPhase('exploding'), 800);
    setTimeout(() => setAnimPhase('revealing'), 1400);
    setTimeout(() => {
      setAnimPhase('idle');
      setAnimatingSlot(null);
    }, 2000);
  };

  const handleLabelSave = (item: InventoryItem, label: string) => {
    patchLabelMutation.mutate({ itemId: item.id, label });
  };

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`absolute bottom-4 left-4 z-20 flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold shadow-lg transition-all text-sm active:scale-95 ${
          open ? 'bg-stone-600 text-white' : 'bg-stone-800 text-white hover:bg-stone-700'
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
            <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Grade 5×2 */}
          <div className="grid grid-cols-5 gap-2">
            {slots.map((item, i) => (
              <div key={i} className="aspect-square">
                <SlotContent
                  item={item}
                  animPhase={animatingSlot === i ? animPhase : 'idle'}
                  animRarity={animRarity}
                  onOpenGift={() => item && handleOpenGift(item)}
                  onLabelSave={(label) => item && handleLabelSave(item, label)}
                />
              </div>
            ))}
          </div>

          {/* Botão embrulhar */}
          {hasKits && (
            <button
              onClick={() => { setOpen(false); onWrapMode(); }}
              className="mt-3 w-full py-2 bg-rose-700 hover:bg-rose-600 text-white text-sm font-bold rounded-xl transition-all active:scale-95"
            >
              🎁 Embrulhar planta
            </button>
          )}

          {items.length === 0 && (
            <p className="text-stone-500 text-xs text-center mt-2">Inventário vazio</p>
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
git commit -m "feat: add wrapped_plant/plant slots and gift opening animation to InventoryPanel"
```

---

## Task 6 — `Garden.tsx`: modo seleção de embrulho

**Files:**
- Modify: `src/components/Garden.tsx`

Quando `wrappingMode=true`:
- Toolbar mostra botão "Cancelar" (bottom-left, substitui o botão Mochila momentaneamente)
- PotSlot recebe prop `wrappingMode`
- PotSlots com `state === 'planted'` mostram overlay "🎁 Embrulhar" ao hover

- [ ] **Step 1: Adicionar imports em `Garden.tsx`**

```tsx
import { useWrapPlant } from '@/hooks/useInventory';
```

- [ ] **Step 2: Adicionar mutation e handler no componente `Garden`**

Após as declarações de state existentes:
```tsx
const wrapPlantMutation = useWrapPlant(user?.id ?? '');
const [wrapError, setWrapError] = useState<string | null>(null);
```

- [ ] **Step 3: Passar `wrappingMode` e `onWrap` para `PotSlot`**

No render do jardim, localizar onde `<PotSlot>` é renderizado e adicionar props:

```tsx
<PotSlot
  pot={pot}
  state={state}
  onNeedSeed={setCoinModalPotId}
  wrappingMode={wrappingMode}
  onWrap={async (plantId: string) => {
    if (!confirm('Embrulhar esta planta? 1 kit de embrulho será consumido.')) return;
    try {
      await wrapPlantMutation.mutateAsync({ plantId });
      setWrappingMode(false);
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      setWrapError(e.message ?? 'Erro ao embrulhar');
      setWrappingMode(false);
    }
  }}
/>
```

- [ ] **Step 4: Adicionar overlay "Cancelar" e erro quando `wrappingMode=true`**

No return do Garden, dentro da `<div ref={containerRef}>`, adicionar após o shovel toolbar:

```tsx
      {/* Toolbar de seleção de embrulho */}
      {wrappingMode && (
        <div
          className="absolute bottom-4 left-4 z-20 flex flex-col items-start gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-xs bg-rose-900/80 text-rose-200 px-3 py-1.5 rounded-lg backdrop-blur-sm">
            Clique numa planta para embrulhar
          </div>
          <button
            onClick={() => { setWrappingMode(false); setWrapError(null); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold shadow-lg bg-stone-800 text-white hover:bg-stone-700 active:scale-95 transition-all text-sm"
          >
            <X className="w-4 h-4" />
            Cancelar
          </button>
          {wrapError && (
            <div className="text-xs bg-red-700 text-white px-3 py-1.5 rounded-lg">
              {wrapError}
            </div>
          )}
        </div>
      )}
```

- [ ] **Step 5: Atualizar assinatura de `PotSlot` para aceitar `wrappingMode` e `onWrap`**

Localizar a definição de `PotSlot` e adicionar as duas novas props:
```tsx
function PotSlot({
  pot,
  state,
  onNeedSeed,
  wrappingMode = false,
  onWrap,
}: {
  pot: Pot;
  state: PotState;
  onNeedSeed: (potId: string) => void;
  wrappingMode?: boolean;
  onWrap?: (plantId: string) => void;
}) {
```

No render do estado `planted`, quando há planta, adicionar overlay de seleção condicionado a `wrappingMode`:

```tsx
{/* Overlay de seleção de embrulho */}
{wrappingMode && plant && (
  <div
    className="absolute inset-0 flex items-center justify-center bg-rose-900/50 rounded-full cursor-pointer ring-2 ring-rose-400 transition-all hover:bg-rose-800/60"
    onClick={(e) => { e.stopPropagation(); onWrap?.(plant.id); }}
  >
    <span className="text-2xl">🎁</span>
  </div>
)}
```

(Inserir este bloco dentro do `{plant ? (<>...</>) }`, no mesmo nível do overlay de ações existente)

- [ ] **Step 6: Suprimir action overlay quando `wrappingMode`**

No overlay de ações existente (regar/deletar), adicionar condição para esconder quando `wrappingMode`:

```tsx
<div
  className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity bg-black/20 rounded-full p-2 ${
    wrappingMode ? 'hidden' : 'opacity-0 group-hover:opacity-100'
  }`}
>
```

- [ ] **Step 7: Verificar tipos**

```powershell
Remove-Item -Force tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 8: Smoke test completo**

```powershell
npm run dev
```

Roteiro de teste:
1. Comprar Kit de Embrulho na Loja → aparece no inventário como 🎁
2. Clicar "Embrulhar planta" → jardim entra em modo seleção (instrução + botão Cancelar)
3. Hover em planta plantada → overlay 🎁 aparece
4. Clicar → confirm → planta some do jardim → aparece no inventário como 🎁
5. Hover no ⓘ do slot → tooltip com label vazia
6. Clicar ⓘ → campo de input aparece → digitar etiqueta → Enter → salvo
7. Clicar no slot 🎁 → confirm → animação: balança → explode → revela 🌱
8. Slot fica como plant no inventário

- [ ] **Step 9: Commit**

```powershell
git add src/components/Garden.tsx
git commit -m "feat: add wrapping selection mode to Garden with wrap overlay on plants"
```

---

## Self-review

### Spec coverage
- [x] Task 1 — `POST /api/inventory/use-kit` (valida kit + planta em pot + slot livre)
- [x] Task 2 — `POST /api/inventory/open-gift` (muda `wrapped_plant→plant`, retorna DNA)
- [x] Task 3 — keyframes `gift-shake`, `gift-explode`, `gift-flash`, `gift-reveal`
- [x] Task 4 — `useWrapPlant`, `useOpenGift`, `usePatchLabel` mutations
- [x] Task 5 — slots `wrapped_plant` (label editável, ⓘ) + `plant` + animação completa
- [x] Task 6 — modo seleção no Garden, overlay 🎁 em plantas, botão Cancelar

### Verificações adicionais
- `open-gift` muda o slot in-place (não cria novo slot) — `slot_index` permanece o mesmo. ✓
- Animação chama a API ANTES de iniciar para ter a raridade correta nas partículas. Se a API falha, a animação não inicia. ✓
- `wrappingMode` suprimi o overlay de ações (regar/deletar) via `hidden` class — não interfere com o overlay de seleção. ✓
- `usePlantVersion` em `PlantSlot` reutiliza cache existente (staleTime: Infinity) — sem chamadas extras. ✓
- Escape e Cancelar ambos resetam `wrappingMode=false`. (Nota: Escape via botão no toolbar; para key event, pode ser adicionado como melhoria futura.)
