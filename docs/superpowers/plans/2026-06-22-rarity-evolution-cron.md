# Raridades, Histórico de Evolução, Cron e Produto Dev — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar 2 novas raridades (épico/brotaria), efeitos visuais CSS por raridade, modal de histórico coverflow 3D, cron do scheduler e produto dev "avançar tempo".

**Architecture:** Raridade expande o tipo existente e a função `calculateRarity()`. `RarityEffect` é um componente wrapper puro-CSS que envolve a imagem da planta — sem Canvas nem Framer Motion. `PlantHistoryModal` usa `usePlantHistory` (React Query) + coverflow 3D via CSS transforms. Cron e produto dev são mudanças independentes de infraestrutura/store.

**Tech Stack:** Next.js 16.2.7, React 19, TypeScript strict, Tailwind CSS 4, @tanstack/react-query v5, date-fns (já instalado), Supabase JS client, CSS custom properties + keyframes.

## Global Constraints

- Tailwind CSS v4 — usar `@utility` ou classes arbitrárias; `group/{name}` para hover nomeado
- TypeScript strict — zero `any`, zero erros em `tsc --noEmit`
- Cores de raridade SEMPRE via `var(--rarity-*)` — nunca hex bruto no JSX/TSX
- `date-fns` já instalado — usar `format` para datas
- React Query v5 API — `useQuery`, `useMutation`, `isPending` (não `isLoading`)
- Nenhuma nova dependência npm além do que já existe no projeto
- Verificação: `tsc --noEmit` sem erros + `npm run lint` sem novos erros

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `src/types/index.ts` | Modificar | Adiciona `'epico' \| 'brotaria'` ao tipo `Rarity` |
| `src/services/dnaService.ts` | Modificar | Atualiza `calculateRarity()` com 6 raridades ponderadas |
| `src/app/globals.css` | Modificar | CSS vars `:root` + keyframes de raridade |
| `src/components/RarityEffect.tsx` | Criar | Wrapper de partículas + glow + efeitos especiais por raridade |
| `src/hooks/usePlantData.ts` | Modificar | Adiciona `dna: PlantDNA` em `PlantRow`; novo tipo `PlantVersionHistoryRow`; novo hook `usePlantHistory` |
| `src/components/PlantHistoryModal.tsx` | Criar | Modal coverflow 3D com histórico de evolução |
| `src/components/Garden.tsx` | Modificar | Integra `RarityEffect` + `PlantHistoryModal` no `PotSlot` |
| `src/app/api/scheduler/route.ts` | Modificar | Adiciona verificação `CRON_SECRET` |
| `vercel.json` | Criar | Configura cron `*/15 * * * *` |
| `.env.example` | Criar | Documenta `CRON_SECRET` |
| `src/config/economy.ts` | Modificar | Adiciona produto `skip_time` condicional em não-produção |
| `src/app/api/store/buy/route.ts` | Modificar | Handler `skip_time` + bypass `spend_coins` para custo 0 |
| `src/app/loja/page.tsx` | Modificar | Badge `DEV` no card `skip_time` |

---

## Task 1 — Expansão do tipo Rarity + probabilidades DNA

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/services/dnaService.ts`

**Interfaces:**
- Produz: `Rarity = 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario' | 'brotaria'`
- Produz: `calculateRarity(): Rarity` com pesos: comum 60, incomum 15, raro 10, epico 5, lendario 4, brotaria 1

- [ ] **Step 1: Atualizar o tipo `Rarity` em `src/types/index.ts`**

Localizar a linha:
```ts
export type Rarity = 'comum' | 'incomum' | 'raro' | 'lendario';
```
Substituir por:
```ts
export type Rarity = 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario' | 'brotaria';
```

- [ ] **Step 2: Atualizar `calculateRarity()` em `src/services/dnaService.ts`**

Localizar a função `calculateRarity` (linha ~102) e substituir completamente:
```ts
const RARITY_TABLE: [Rarity, number][] = [
  ['comum',    60],
  ['incomum',  15],
  ['raro',     10],
  ['epico',     5],
  ['lendario',  4],
  ['brotaria',  1],
];

function calculateRarity(): Rarity {
  const total = RARITY_TABLE.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [rarity, weight] of RARITY_TABLE) {
    roll -= weight;
    if (roll < 0) return rarity;
  }
  return 'comum';
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
git add src/types/index.ts src/services/dnaService.ts
git commit -m "feat: add epico and brotaria rarities with weighted probability table"
```

---

## Task 2 — CSS vars de raridade + keyframes

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- Produz: variáveis CSS `--rarity-{rarity}` disponíveis globalmente
- Produz: keyframes `particle-float`, `rarity-pulse-glow`, `lendario-spin`, `brotaria-border`
- Produz: classes `.rarity-glow-{rarity}` e `.rarity-border-brotaria`

- [ ] **Step 1: Adicionar variáveis CSS e keyframes em `src/app/globals.css`**

Inserir após o bloco `:root` existente (após a linha `--foreground: #171717;` e antes do `@theme`):

```css
/* ---------- Raridade — variáveis de cor ---------- */
:root {
  --rarity-comum:          rgba(255, 255, 255, 0.85);
  --rarity-incomum:        #06b6d4;
  --rarity-raro:           #1e3a8a;
  --rarity-epico:          #7c3aed;
  --rarity-lendario:       #f97316;
  --rarity-brotaria:       #4ade80;
  --rarity-brotaria-dark:  #166534;
  --rarity-brotaria-mid:   #16a34a;
  --rarity-brotaria-light: #86efac;
}

/* ---------- Raridade — keyframes ---------- */

@keyframes particle-float {
  0%   { transform: translate(0, 0) scale(1); opacity: 0.9; }
  100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
}

@keyframes rarity-pulse-glow {
  0%, 100% { filter: var(--glow-min); }
  50%       { filter: var(--glow-max); }
}

@keyframes lendario-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

@keyframes brotaria-border {
  0%   { outline-color: var(--rarity-brotaria-mid);   }
  25%  { outline-color: var(--rarity-brotaria);       }
  50%  { outline-color: var(--rarity-brotaria-dark);  }
  75%  { outline-color: var(--rarity-brotaria-light); }
  100% { outline-color: var(--rarity-brotaria-mid);   }
}

/* ---------- Raridade — classes de glow ---------- */

.rarity-glow-comum {
  --glow-min: drop-shadow(0 0 2px var(--rarity-comum));
  --glow-max: drop-shadow(0 0 6px var(--rarity-comum));
  animation: rarity-pulse-glow 2.5s ease-in-out infinite;
}
.rarity-glow-incomum {
  --glow-min: drop-shadow(0 0 4px var(--rarity-incomum));
  --glow-max: drop-shadow(0 0 10px var(--rarity-incomum));
  animation: rarity-pulse-glow 2s ease-in-out infinite;
}
.rarity-glow-raro {
  --glow-min: drop-shadow(0 0 5px var(--rarity-raro));
  --glow-max: drop-shadow(0 0 14px var(--rarity-raro));
  animation: rarity-pulse-glow 2s ease-in-out infinite;
}
.rarity-glow-epico {
  --glow-min: drop-shadow(0 0 6px var(--rarity-epico));
  --glow-max: drop-shadow(0 0 16px var(--rarity-epico));
  animation: rarity-pulse-glow 1.8s ease-in-out infinite;
}
.rarity-glow-lendario {
  --glow-min: drop-shadow(0 0 8px var(--rarity-lendario));
  --glow-max: drop-shadow(0 0 20px var(--rarity-lendario));
  animation: rarity-pulse-glow 1.5s ease-in-out infinite;
}
.rarity-border-brotaria {
  outline: 3px solid var(--rarity-brotaria-mid);
  border-radius: 8px;
  animation: brotaria-border 2s linear infinite;
  filter: drop-shadow(0 0 8px var(--rarity-brotaria-mid));
}

@media (prefers-reduced-motion: reduce) {
  .rarity-glow-comum, .rarity-glow-incomum, .rarity-glow-raro,
  .rarity-glow-epico, .rarity-glow-lendario, .rarity-border-brotaria {
    animation: none;
  }
}
```

- [ ] **Step 2: Verificar build**

```powershell
npx tsc --noEmit
```

Esperado: zero erros (globals.css não é tipado, mas o tsc não deve falhar).

- [ ] **Step 3: Commit**

```powershell
git add src/app/globals.css
git commit -m "feat: add rarity CSS variables and effect keyframes"
```

---

## Task 3 — Componente `RarityEffect`

**Files:**
- Create: `src/components/RarityEffect.tsx`

**Interfaces:**
- Consome: `Rarity` de `@/types`; classes CSS de Task 2
- Produz:
  ```ts
  export function RarityEffect(props: {
    rarity: Rarity;
    alwaysVisible?: boolean; // default false
    children: React.ReactNode;
  }): JSX.Element
  ```

- [ ] **Step 1: Criar `src/components/RarityEffect.tsx`**

```tsx
'use client';

import { useMemo, useState } from 'react';
import { Rarity } from '@/types';

const PARTICLE_COUNTS: Record<Rarity, number> = {
  comum: 4,
  incomum: 5,
  raro: 5,
  epico: 6,
  lendario: 7,
  brotaria: 6,
};

function buildParticles(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 360;
    const dist = 30 + (i % 2 === 0 ? 0 : 12);
    const tx = `${Math.round(Math.cos((angle * Math.PI) / 180) * dist)}px`;
    const ty = `${Math.round(Math.sin((angle * Math.PI) / 180) * dist)}px`;
    return {
      '--tx': tx,
      '--ty': ty,
      animationDelay: `${(i * 0.24).toFixed(2)}s`,
      animationDuration: `${(1.1 + (i % 3) * 0.22).toFixed(2)}s`,
    } as React.CSSProperties;
  });
}

export function RarityEffect({
  rarity,
  alwaysVisible = false,
  children,
}: {
  rarity: Rarity;
  alwaysVisible?: boolean;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  const active = alwaysVisible || hovered;
  const particles = useMemo(() => buildParticles(PARTICLE_COUNTS[rarity]), [rarity]);

  const glowClass =
    rarity === 'brotaria'
      ? active ? 'rarity-border-brotaria' : ''
      : active ? `rarity-glow-${rarity}` : '';

  return (
    <div
      className="relative w-full h-full"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Lendario: conic-gradient giratório atrás da imagem */}
      {rarity === 'lendario' && (
        <div
          className="absolute inset-0 -z-10 rounded-full"
          style={{
            opacity: active ? 0.6 : 0,
            transition: 'opacity 0.3s ease',
            background: `conic-gradient(var(--rarity-lendario), transparent 60%, var(--rarity-lendario))`,
            animation: active ? 'lendario-spin 3s linear infinite' : 'none',
          }}
        />
      )}

      {/* Imagem com classe de glow */}
      <div className={`w-full h-full transition-all duration-300 ${glowClass}`}>
        {children}
      </div>

      {/* Partículas */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ opacity: active ? 1 : 0, transition: 'opacity 0.3s ease' }}
      >
        {particles.map((style, i) => (
          <span
            key={i}
            className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full"
            style={{
              ...style,
              backgroundColor: `var(--rarity-${rarity})`,
              animation: active
                ? `particle-float ${style.animationDuration} ${style.animationDelay} ease-out infinite`
                : 'none',
            }}
          />
        ))}
      </div>
    </div>
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
git add src/components/RarityEffect.tsx
git commit -m "feat: add RarityEffect component with CSS particle effects"
```

---

## Task 4 — Atualizar tipos de planta + hook `usePlantHistory`

**Files:**
- Modify: `src/hooks/usePlantData.ts`

**Interfaces:**
- Modifica: `PlantRow` ganha campo `dna: PlantDNA`
- Produz novo tipo:
  ```ts
  export type PlantVersionHistoryRow = {
    id: string;
    image_url: string | null;
    created_at: string;
    dna_snapshot: PlantDNA;
    stage: { name: string; code: string } | null;
  }
  ```
- Produz novo hook:
  ```ts
  export function usePlantHistory(plantId: string | null | undefined): UseQueryResult<PlantVersionHistoryRow[]>
  // queryKey: ['plant', plantId, 'history']
  // staleTime: Infinity, gcTime: 30 * 60_000
  ```

- [ ] **Step 1: Atualizar `src/hooks/usePlantData.ts` completamente**

```ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PlantDNA } from '@/types';

export type PlantRow = {
  id: string;
  hydration_status: string;
  current_stage_waters: number;
  current_stage: { id: string; name: string; waters_required: number };
  dna: PlantDNA;
};

export type PlantVersionRow = {
  id: string;
  image_url: string | null;
};

export type PlantVersionHistoryRow = {
  id: string;
  image_url: string | null;
  created_at: string;
  dna_snapshot: PlantDNA;
  stage: { name: string; code: string } | null;
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
  const { data, error } = await supabase
    .from('plant_versions')
    .select('id, image_url')
    .eq('plant_id', plantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return (data as PlantVersionRow | null) ?? null;
}

async function fetchPlantHistory(plantId: string): Promise<PlantVersionHistoryRow[]> {
  const { data, error } = await supabase
    .from('plant_versions')
    .select('id, image_url, created_at, dna_snapshot, stage:plant_stages(name, code)')
    .eq('plant_id', plantId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as PlantVersionHistoryRow[];
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
    staleTime: Infinity,
    gcTime: 30 * 60_000,
  });
}

export function usePlantHistory(plantId: string | null | undefined) {
  return useQuery({
    queryKey: ['plant', plantId, 'history'],
    queryFn: () => fetchPlantHistory(plantId!),
    enabled: !!plantId,
    staleTime: Infinity,
    gcTime: 30 * 60_000,
  });
}
```

- [ ] **Step 2: Verificar tipos**

```powershell
Remove-Item -Force tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npx tsc --noEmit
```

Esperado: zero erros. O campo `dna` agora está disponível nos consumidores de `PlantRow`.

- [ ] **Step 3: Commit**

```powershell
git add src/hooks/usePlantData.ts
git commit -m "feat: add dna field to PlantRow and usePlantHistory hook"
```

---

## Task 5 — Componente `PlantHistoryModal`

**Files:**
- Create: `src/components/PlantHistoryModal.tsx`

**Interfaces:**
- Consome: `usePlantHistory` de `@/hooks/usePlantData`; `RarityEffect` de `@/components/RarityEffect`; `PlantRow`, `PlantVersionHistoryRow` de `@/hooks/usePlantData`; `Pot` de `@/types`; `format` de `date-fns`
- Produz:
  ```ts
  export function PlantHistoryModal(props: {
    plant: PlantRow;
    open: boolean;
    onClose: () => void;
  }): JSX.Element | null
  ```

- [ ] **Step 1: Criar `src/components/PlantHistoryModal.tsx`**

```tsx
'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { X } from 'lucide-react';
import { PlantRow, PlantVersionHistoryRow, usePlantHistory } from '@/hooks/usePlantData';
import { RarityEffect } from '@/components/RarityEffect';
import { Rarity } from '@/types';

// Transforma delta de posição em transform 3D
function cardStyle(delta: number): React.CSSProperties {
  const abs = Math.abs(delta);
  if (abs > 2) return { display: 'none' };

  const configs = [
    { z: 0,    ry: 0,  scale: 1.0,  opacity: 1.0 },
    { z: -120, ry: 25, scale: 0.85, opacity: 0.7 },
    { z: -200, ry: 40, scale: 0.7,  opacity: 0.4 },
  ];
  const c = configs[abs];
  const rotateY = delta > 0 ? c.ry : -c.ry;

  return {
    transform: `perspective(1000px) translateZ(${c.z}px) rotateY(${rotateY}deg) scale(${c.scale})`,
    opacity: c.opacity,
    transition: 'transform 0.35s ease, opacity 0.35s ease',
    zIndex: 3 - abs,
    flexShrink: 0,
  };
}

function RarityLabel({ rarity }: { rarity: Rarity }) {
  const labels: Record<Rarity, string> = {
    comum: 'Comum',
    incomum: 'Incomum',
    raro: 'Raro',
    epico: 'Épico',
    lendario: 'Lendário',
    brotaria: 'Brotaria',
  };
  return (
    <span
      className="font-black uppercase text-sm tracking-widest"
      style={{ color: `var(--rarity-${rarity})` }}
    >
      {labels[rarity]}
    </span>
  );
}

function HistoryCard({
  version,
  delta,
}: {
  version: PlantVersionHistoryRow;
  delta: number;
}) {
  const rarity = version.dna_snapshot?.rarity ?? 'comum';
  return (
    <div
      className="relative w-48 h-48 bg-stone-900/90 rounded-2xl overflow-hidden"
      style={cardStyle(delta)}
    >
      {version.image_url ? (
        <RarityEffect rarity={rarity as Rarity} alwaysVisible={delta === 0}>
          <div className="relative w-full h-full">
            <Image
              src={version.image_url}
              alt={version.stage?.name ?? 'Fase'}
              fill
              className="object-contain p-3"
            />
          </div>
        </RarityEffect>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-stone-700/40 animate-pulse" />
        </div>
      )}
      {/* Chip do estágio na base do card */}
      {version.stage && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center">
          <span className="text-[10px] font-bold text-white/80 bg-black/50 px-2 py-0.5 rounded-full">
            {version.stage.name}
          </span>
        </div>
      )}
    </div>
  );
}

export function PlantHistoryModal({
  plant,
  open,
  onClose,
}: {
  plant: PlantRow;
  open: boolean;
  onClose: () => void;
}) {
  const { data: versions = [], isPending } = usePlantHistory(open ? plant.id : null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      setActiveIndex((prev) => {
        const next = prev + (e.deltaY > 0 ? 1 : -1);
        return Math.max(0, Math.min(versions.length - 1, next));
      });
    },
    [versions.length],
  );

  // Resetar ao abrir
  if (!open) return null;

  const active = versions[activeIndex];
  const activeRarity: Rarity = (active?.dna_snapshot?.rarity as Rarity) ?? 'comum';
  const biome = active?.dna_snapshot?.biome ?? plant.dna.biome;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md"
      onClick={onClose}
    >
      {/* Container — stopPropagation para não fechar ao clicar dentro */}
      <div
        className="relative w-full max-w-2xl flex flex-col items-center gap-6 px-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fechar */}
        <button
          onClick={onClose}
          className="absolute top-0 right-4 text-white/70 hover:text-white transition-colors"
          aria-label="Fechar"
        >
          <X className="w-6 h-6" />
        </button>

        {/* ── Cards (coverflow 3D) ── */}
        <div
          className="relative flex items-center justify-center w-full h-56"
          style={{ perspective: '1000px' }}
          onWheel={handleWheel}
        >
          {isPending ? (
            <div className="text-white/50 text-sm">Carregando histórico...</div>
          ) : versions.length === 0 ? (
            <div className="text-white/50 text-sm">Esta planta ainda não evoluiu.</div>
          ) : (
            <div className="relative flex items-center justify-center w-full h-full">
              {versions.map((version, i) => (
                <div
                  key={version.id}
                  className="absolute"
                  style={cardStyle(i - activeIndex)}
                >
                  <HistoryCard version={version} delta={i - activeIndex} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Indicadores de paginação */}
        {versions.length > 1 && (
          <div className="flex gap-1.5">
            {versions.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === activeIndex ? 'scale-125' : 'opacity-40'
                }`}
                style={{ backgroundColor: i === activeIndex ? `var(--rarity-${activeRarity})` : 'white' }}
              />
            ))}
          </div>
        )}

        {/* ── Infos da versão em foco ── */}
        {active && (
          <div className="flex flex-col items-center gap-1 text-center">
            <div className="flex items-center gap-2">
              {/* Bolinha da raridade */}
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: `var(--rarity-${activeRarity})` }}
              />
              <span className="text-white font-bold text-base">
                {active.stage?.name ?? '—'}
              </span>
              <RarityLabel rarity={activeRarity} />
            </div>
            <p className="text-white/50 text-xs">
              {format(new Date(active.created_at), "dd 'de' MMMM 'de' yyyy")} · {biome}
            </p>
          </div>
        )}
      </div>
    </div>
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
git add src/components/PlantHistoryModal.tsx
git commit -m "feat: add PlantHistoryModal with 3D coverflow and rarity info"
```

---

## Task 6 — Integrar `RarityEffect` e `PlantHistoryModal` no `Garden.tsx`

**Files:**
- Modify: `src/components/Garden.tsx`

**Interfaces:**
- Consome: `RarityEffect` de `@/components/RarityEffect`; `PlantHistoryModal` de `@/components/PlantHistoryModal`
- `PlantRow.dna.rarity` disponível após Task 4

Mudanças no `PotSlot` (estado `planted`):

1. Adicionar `historyOpen` state
2. Envolver o bloco `latestVersion?.image_url` com `<RarityEffect>`
3. Tornar o div que envolve a imagem clicável para abrir o modal
4. Renderizar `<PlantHistoryModal>` no final do `PotSlot`

- [ ] **Step 1: Adicionar imports ao topo de `Garden.tsx`**

Após os imports existentes, adicionar:
```tsx
import { RarityEffect } from '@/components/RarityEffect';
import { PlantHistoryModal } from '@/components/PlantHistoryModal';
```

- [ ] **Step 2: Adicionar estado `historyOpen` no `PotSlot`**

Dentro do `PotSlot`, após a declaração de `isEvolving` e `msLeft`, adicionar:
```tsx
const [historyOpen, setHistoryOpen] = useState(false);
```

- [ ] **Step 3: Atualizar o bloco de render do estado `planted` no `PotSlot`**

Localizar o bloco que começa com `latestVersion?.image_url ? (` e substituir o `<div className="relative w-full h-full">` que envolve o `<Image>`:

```tsx
) : latestVersion?.image_url ? (
  <div
    className="relative w-full h-full cursor-pointer"
    onClick={() => setHistoryOpen(true)}
    title="Ver histórico de evolução"
  >
    <RarityEffect rarity={plant.dna.rarity} alwaysVisible={false}>
      <Image
        src={latestVersion.image_url}
        alt={plant.current_stage.name}
        fill
        draggable={false}
        className="drop-shadow-lg object-contain animate-in fade-in zoom-in duration-500"
      />
    </RarityEffect>
  </div>
```

- [ ] **Step 4: Adicionar `PlantHistoryModal` ao final do `PotSlot`**

Antes do `</div>` de fechamento do return do estado `planted` (após o bloco de ações e depois do `</>` que fecha o `{plant ? (`), adicionar:

```tsx
{plant && (
  <PlantHistoryModal
    plant={plant}
    open={historyOpen}
    onClose={() => setHistoryOpen(false)}
  />
)}
```

- [ ] **Step 5: Verificar tipos**

```powershell
Remove-Item -Force tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 6: Smoke test visual**

```powershell
npm run dev
```

- Abrir jardim, passar mouse sobre planta com imagem → glow + partículas devem aparecer
- Clicar na imagem → modal abre com fundo desfocado
- Scroll do mouse no modal → troca o card em destaque
- Clicar fora do modal → fecha

- [ ] **Step 7: Commit**

```powershell
git add src/components/Garden.tsx
git commit -m "feat: integrate RarityEffect and PlantHistoryModal into Garden"
```

---

## Task 7 — Vercel Cron + proteção do scheduler

**Files:**
- Create: `vercel.json`
- Modify: `src/app/api/scheduler/route.ts`
- Create: `.env.example`

**Interfaces:**
- Produz: cron chamando `GET /api/scheduler` a cada 15 min
- Produz: rota protegida por `Authorization: Bearer $CRON_SECRET`

- [ ] **Step 1: Criar `vercel.json`**

```json
{
  "crons": [
    {
      "path": "/api/scheduler",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

- [ ] **Step 2: Atualizar `src/app/api/scheduler/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { processGrowth } from '@/services/growthService';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    await processGrowth();
    return NextResponse.json({ success: true, message: 'Scheduler processed successfully' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[Scheduler API] Error:', error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 3: Criar `.env.example`**

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI
OPENROUTER_API_KEY=your-openrouter-key
AI_MODE=MOCK

# Background removal
BACKGROUND_REMOVER=false

# Vercel Cron — gerado automaticamente pela Vercel em produção.
# Em dev local, deixe em branco para desabilitar a verificação.
CRON_SECRET=
```

- [ ] **Step 4: Verificar tipos**

```powershell
Remove-Item -Force tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 5: Commit**

```powershell
git add vercel.json src/app/api/scheduler/route.ts .env.example
git commit -m "feat: add Vercel cron every 15min and protect scheduler with CRON_SECRET"
```

---

## Task 8 — Produto "Avançar Tempo" (dev only)

**Files:**
- Modify: `src/config/economy.ts`
- Modify: `src/app/api/store/buy/route.ts`
- Modify: `src/app/loja/page.tsx`

**Interfaces:**
- Produz: produto `skip_time` com `cost_coins: 0` visível apenas em `NODE_ENV !== 'production'`
- O handler chama `processGrowth()` diretamente, bypassa `spend_coins`

- [ ] **Step 1: Atualizar `src/config/economy.ts`**

Substituir a const `STORE_PRODUCTS`:
```ts
const SEED_PRODUCT: StoreProduct = {
  id: 'seed',
  name: 'Semente',
  description: 'Uma semente para plantar uma planta única no seu jardim.',
  cost_coins: SEED_COST_COINS,
};

const SKIP_TIME_PRODUCT: StoreProduct = {
  id: 'skip_time',
  name: '⏩ Avançar Tempo',
  description: '[DEV] Marca todas as plantas como aguardando rega agora.',
  cost_coins: 0,
};

export const STORE_PRODUCTS: StoreProduct[] = [
  SEED_PRODUCT,
  ...(process.env.NODE_ENV !== 'production' ? [SKIP_TIME_PRODUCT] : []),
];
```

- [ ] **Step 2: Atualizar `src/app/api/store/buy/route.ts`**

Adicionar import no topo:
```ts
import { processGrowth } from '@/services/growthService';
```

Antes do bloco `// 1) Débito atômico`, adicionar handler para produtos grátis:
```ts
// Produtos de custo zero não passam por débito (evita chamada desnecessária ao RPC).
if (product.cost_coins === 0) {
  if (product.id === 'skip_time') {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
    }
    await processGrowth();
    return NextResponse.json({ success: true, product: 'skip_time' });
  }
  // Produto grátis desconhecido — não deveria chegar aqui
  return NextResponse.json({ error: 'Invalid free product' }, { status: 400 });
}
```

O bloco `// 1) Débito atômico` existente permanece inalterado abaixo.

- [ ] **Step 3: Atualizar `src/app/loja/page.tsx` — badge DEV**

No map de `STORE_PRODUCTS`, localizar o `<div key={product.id} className="bg-white rounded-3xl ...">` e adicionar o badge condicional logo dentro do primeiro `<div>` filho (`from-green-50`):

```tsx
<div className="bg-gradient-to-br from-green-50 to-green-100 p-8 flex items-center justify-center relative">
  {product.id === 'skip_time' && (
    <span className="absolute top-2 left-2 text-[10px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded">
      DEV
    </span>
  )}
  <div className="bg-white rounded-2xl p-5 shadow-inner">
    <Sprout className="w-12 h-12 text-green-600" />
  </div>
</div>
```

Também atualizar o display do preço: quando `cost_coins === 0`, mostrar "Grátis" em vez de `0`:

```tsx
<span className="flex items-center gap-1.5 font-black text-amber-600">
  {product.cost_coins === 0 ? (
    <span className="text-green-600">Grátis</span>
  ) : (
    <>
      <Coins className="w-5 h-5" />
      {product.cost_coins}
    </>
  )}
</span>
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

Abrir `/loja` → card "Avançar Tempo" deve aparecer com badge `DEV` e preço "Grátis". Clicar "Comprar" → deve chamar o scheduler e mostrar sucesso. Verificar no banco que plantas `hydrated` foram marcadas como `waiting_water`.

- [ ] **Step 6: Commit**

```powershell
git add src/config/economy.ts src/app/api/store/buy/route.ts src/app/loja/page.tsx
git commit -m "feat: add skip_time dev product (0 coins, calls processGrowth)"
```

---

## Self-review

### Spec coverage
- [x] Task 1 — Expansão de raridades (tipos + probabilidades)
- [x] Task 2 — CSS vars `:root` + keyframes
- [x] Task 3 — `RarityEffect` component
- [x] Task 4 — `PlantRow.dna`, `PlantVersionHistoryRow`, `usePlantHistory`
- [x] Task 5 — `PlantHistoryModal` (coverflow 3D, cards top, infos bottom, bolinha + nome em cor da raridade)
- [x] Task 6 — Integração no `Garden.tsx`
- [x] Task 7 — Vercel cron `*/15 * * * *` + proteção `CRON_SECRET`
- [x] Task 8 — Produto dev `skip_time`, badge DEV, preço "Grátis"

### Verificações adicionais
- `format` de `date-fns` usado no PlantHistoryModal — `date-fns` já está em `dependencies`
- `--rarity-{rarity}` CSS vars usadas via template literal: `var(--rarity-${rarity})` — TypeScript trata como string, sem type safety extra necessária
- `PlantVersionHistoryRow.dna_snapshot` castado via `as unknown as` — necessário pois Supabase retorna `Json` para colunas JSONB
- `vercel.json` crons só funcionam em produção no Vercel; em desenvolvimento local o scheduler pode ser chamado manualmente via o produto da loja
