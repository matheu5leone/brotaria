# Bug Fixes UI — 8 Correções Visuais e Funcionais

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir 8 problemas reportados: timer de escavação sem auto-transição, canteiros com tamanhos inconsistentes, contorno preto nas plantas, partículas na frente do PNG, coverflow bugado do histórico, círculo preto no hover, animação dos botões de ação e botão de recolher a sidebar cortado.

**Architecture:** As correções tocam 5 arquivos principais (`Garden.tsx`, `Sidebar.tsx`, `RarityEffect.tsx`, `PlantHistoryModal.tsx`, `globals.css`). Sem nova dependência. O timer usa invalidação de React Query quando atinge zero. A animação dos botões usa CSS keyframes + seletor `.group:hover`. O coverflow usa `transformStyle: 'preserve-3d'` no container compartilhado.

**Tech Stack:** Next.js 16.2.7, React 19, TypeScript strict, Tailwind v4, @tanstack/react-query v5, CSS keyframes.

## Global Constraints

- TypeScript strict — zero `any`, zero erros em `tsc --noEmit`
- Nenhuma nova dependência npm
- CSS tokens via `var(--color-*)` — nunca hex bruto em JSX (exceto os já aprovados #2a4a1e/#1a2f10/#8b4040)
- Verificação: `npx tsc --noEmit` zero erros

---

## Mapa de arquivos

| Arquivo | Bug(s) | Mudança |
|---------|--------|---------|
| `src/components/Garden.tsx` | #1 #2 #3 #6 #7 | Timer invalidation, canteiro tamanho, remove outline, remove círculo, animação botões |
| `src/components/Sidebar.tsx` | #8 | Remove overflow-hidden |
| `src/components/RarityEffect.tsx` | #4 | Partículas atrás do PNG |
| `src/components/PlantHistoryModal.tsx` | #3 #5 | Remove outline, fix coverflow 3D |
| `src/components/InventoryPanel.tsx` | #3 | Remove plant-outline |
| `src/app/globals.css` | #7 | Keyframes btn-emerge |

---

## Task 1 — Timer de escavação auto-transição + sidebar overflow

**Bugs:** #1 (timer não faz transição automática) e #8 (botão de recolher cortado)

**Files:**
- Modify: `src/components/Garden.tsx`
- Modify: `src/components/Sidebar.tsx`

**Interfaces:**
- `PotSlot` ganha prop opcional: `onDigComplete?: () => void`
- Quando `deadline - Date.now() <= 0` no countdown do PotSlot, chama `onDigComplete()`
- Garden passa `() => qc.invalidateQueries({ queryKey: ['garden', 'pots', user?.id] })`

- [ ] **Step 1: Adicionar `onDigComplete` prop ao `PotSlot` em `Garden.tsx`**

Localizar a assinatura da função `PotSlot` (onde estão `pot`, `state`, `onNeedSeed`, `wrappingMode`, `onWrap`) e adicionar `onDigComplete?`:

```tsx
function PotSlot({
  pot,
  state,
  onNeedSeed,
  wrappingMode = false,
  onWrap,
  onDigComplete,
}: {
  pot: Pot;
  state: PotState;
  onNeedSeed: (potId: string) => void;
  wrappingMode?: boolean;
  onWrap?: (plantId: string) => void;
  onDigComplete?: () => void;
}) {
```

- [ ] **Step 2: Chamar `onDigComplete` quando o timer zera**

Localizar o `useEffect` do countdown de escavação no PotSlot:
```tsx
  useEffect(() => {
    if (state !== 'digging' || !pot.digging_started_at) return;
    const deadline = new Date(pot.digging_started_at).getTime() + DIG_DURATION_MS;
    const update = () => setMsLeft(Math.max(0, deadline - Date.now()));
    update();
    const id = setInterval(update, 250);
    return () => clearInterval(id);
  }, [state, pot.digging_started_at]);
```

Substituir por:
```tsx
  useEffect(() => {
    if (state !== 'digging' || !pot.digging_started_at) return;
    const deadline = new Date(pot.digging_started_at).getTime() + DIG_DURATION_MS;
    let notified = false;
    const update = () => {
      const remaining = deadline - Date.now();
      setMsLeft(Math.max(0, remaining));
      if (remaining <= 0 && !notified) {
        notified = true;
        onDigComplete?.();
      }
    };
    update();
    const id = setInterval(update, 250);
    return () => clearInterval(id);
  }, [state, pot.digging_started_at, onDigComplete]);
```

- [ ] **Step 3: Passar `onDigComplete` do Garden para cada PotSlot**

No render do Garden, localizar onde os `<PotSlot>` são criados (dentro do `pots.map`) e adicionar a prop:
```tsx
            <PotSlot
              pot={pot}
              state={state}
              onNeedSeed={setCoinModalPotId}
              wrappingMode={wrappingMode}
              onWrap={async (plantId: string) => { ... }}
              onDigComplete={() => qc.invalidateQueries({ queryKey: ['garden', 'pots', user?.id] })}
            />
```

- [ ] **Step 4: Corrigir sidebar overflow — remover `overflow-hidden`**

Em `src/components/Sidebar.tsx`, localizar a classe `overflow-hidden` no `<aside>` e removê-la:

```tsx
    <aside
      className={`${
        isSidebarCollapsed ? 'w-20' : 'w-64'
      } border-r-[3px] flex flex-col sticky top-0 h-screen z-20 shadow-sm transition-all duration-300 ease-in-out relative`}
```

(Remove `overflow-hidden` — o layout de pergaminho não precisa dela)

- [ ] **Step 5: Verificar tipos**

```powershell
cd "C:\Users\mathe\Projetos\brotaria"
Remove-Item -Force tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 6: Commit**

```powershell
git add src/components/Garden.tsx src/components/Sidebar.tsx
git commit -m "fix: dig timer auto-transition on complete + sidebar toggle button unclipped"
```

---

## Task 2 — Canteiro oval tamanho uniforme + remover plant-outline

**Bugs:** #2 (spots com tamanhos diferentes) e #3 (contorno preto feio)

**Files:**
- Modify: `src/components/Garden.tsx`
- Modify: `src/components/PlantHistoryModal.tsx`
- Modify: `src/components/InventoryPanel.tsx`

**Problema #2:** O canteiro no estado `planted` tem `width: '78%', height: '32%'` e `bottom-0`, enquanto `ready` e `digging` têm `width: '82%', height: '58%'`. Isso cria inconsistência visual. A base do canteiro no estado `planted` deve ter as mesmas dimensões que os demais — `82% × 58%` — e ficar centralizada verticalmente na metade inferior.

- [ ] **Step 1: Igualar o canteiro oval do estado `planted` em `Garden.tsx`**

Localizar o div do canteiro base no estado `planted` (tem `width: '78%', height: '32%', bottom-0`):

```tsx
          {/* Canteiro oval de base (terra visível embaixo da planta) */}
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none"
            style={{
              width: '78%', height: '32%',
              ...
            }}
          />
```

Substituir por:
```tsx
          {/* Canteiro oval de base */}
          <div
            className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
            style={{
              bottom: '8%',
              width: '82%', height: '58%',
              borderRadius: '50px / 36px',
              background: 'radial-gradient(ellipse at 40% 40%, #2d1c10, #100806)',
              border: '2.5px solid var(--color-wood-mid)',
              boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.9), 0 2px 6px rgba(0,0,0,0.5)',
              zIndex: 0,
            }}
          />
```

- [ ] **Step 2: Remover `plant-outline` em `Garden.tsx`**

Localizar o `<Image>` de planta no estado `planted`:
```tsx
className="plant-outline object-contain animate-in fade-in zoom-in duration-500"
```
Trocar por:
```tsx
className="object-contain animate-in fade-in zoom-in duration-500"
```

- [ ] **Step 3: Remover `plant-outline` em `PlantHistoryModal.tsx`**

Localizar o `<Image>` dentro de `HistoryCard`:
```tsx
className="plant-outline object-contain p-3"
```
Trocar por:
```tsx
className="object-contain p-3"
```

- [ ] **Step 4: Remover `plant-outline` em `InventoryPanel.tsx`**

Localizar o `<Image>` dentro de `PlantSlot`:
```tsx
className="plant-outline object-contain p-1"
```
Trocar por:
```tsx
className="object-contain p-1"
```

- [ ] **Step 5: Verificar tipos**

```powershell
Remove-Item -Force tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 6: Commit**

```powershell
git add src/components/Garden.tsx src/components/PlantHistoryModal.tsx src/components/InventoryPanel.tsx
git commit -m "fix: uniform oval canteiro size + remove plant-outline from all images"
```

---

## Task 3 — Partículas de raridade atrás do PNG

**Bug:** #4 — as partículas renderizam na frente do PNG porque estão após o elemento `{children}` no DOM.

**File:**
- Modify: `src/components/RarityEffect.tsx`

**Solução:** Mover o div de partículas para ANTES dos children no DOM e dar `zIndex: 0` às partículas e `position: relative; zIndex: 1` ao wrapper dos children.

- [ ] **Step 1: Reescrever `src/components/RarityEffect.tsx`**

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
      {/* Lendario: conic-gradient giratório — sempre atrás (z-index negativo) */}
      {rarity === 'lendario' && (
        <div
          className="absolute inset-0 rounded-full"
          style={{
            zIndex: 0,
            opacity: active ? 0.6 : 0,
            transition: 'opacity 0.3s ease',
            background: `conic-gradient(var(--rarity-lendario), transparent 60%, var(--rarity-lendario))`,
            animation: active ? 'lendario-spin 3s linear infinite' : 'none',
          }}
        />
      )}

      {/* Partículas — atrás do PNG (zIndex: 0, antes do children no DOM) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ opacity: active ? 1 : 0, transition: 'opacity 0.3s ease', zIndex: 0 }}
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

      {/* Imagem da planta — na frente das partículas (zIndex: 1) */}
      <div
        className={`w-full h-full transition-all duration-300 ${glowClass}`}
        style={{ position: 'relative', zIndex: 1 }}
      >
        {children}
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
git commit -m "fix: render rarity particles behind plant PNG via z-index ordering"
```

---

## Task 4 — PlantHistoryModal coverflow 3D correto

**Bug:** #5 — cards com comportamento incorreto; perspectiva não compartilhada; layout quebrado.

**File:**
- Modify: `src/components/PlantHistoryModal.tsx`

**Problema:** `cardStyle()` inclui `perspective(1000px)` no `transform` de cada card individualmente, o que cria perspectivas planas por card em vez de um contexto 3D compartilhado. O fix é remover `perspective()` do transform e usar apenas `translateZ`/`rotateY`/`scale`, mantendo `perspective: '1000px'` no container pai com `transformStyle: 'preserve-3d'`.

- [ ] **Step 1: Reescrever `src/components/PlantHistoryModal.tsx`**

```tsx
'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X, Coins } from 'lucide-react';
import { PlantRow, PlantVersionHistoryRow, usePlantHistory } from '@/hooks/usePlantData';
import { RarityEffect } from '@/components/RarityEffect';
import { Rarity } from '@/types';
import { calcPlantScore } from '@/lib/scoring';

// Perspectiva compartilhada: SEM perspective() no transform de cada card
function cardTransform(delta: number): React.CSSProperties {
  const abs = Math.abs(delta);
  if (abs > 2) return { display: 'none' };

  const configs = [
    { z: 0,    ry: 0,   scale: 1.0,  opacity: 1.0 },
    { z: -140, ry: 28,  scale: 0.82, opacity: 0.65 },
    { z: -220, ry: 42,  scale: 0.66, opacity: 0.35 },
  ];
  const c = configs[abs];
  const rotateY = delta > 0 ? c.ry : -c.ry;

  return {
    // Sem perspective() aqui — fica no container pai
    transform: `translateZ(${c.z}px) rotateY(${rotateY}deg) scale(${c.scale})`,
    opacity: c.opacity,
    transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.4s ease',
    zIndex: 3 - abs,
    position: 'absolute',
    flexShrink: 0,
  };
}

function RarityLabel({ rarity }: { rarity: Rarity }) {
  const labels: Record<Rarity, string> = {
    comum: 'Comum', incomum: 'Incomum', raro: 'Raro',
    epico: 'Épico', lendario: 'Lendário', brotaria: 'Brotaria',
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

function HistoryCard({ version, delta }: { version: PlantVersionHistoryRow; delta: number }) {
  const rarity = (version.dna_snapshot?.rarity ?? 'comum') as Rarity;
  return (
    <div
      className="relative bg-stone-900/90 rounded-2xl overflow-hidden"
      style={{ ...cardTransform(delta), width: 192, height: 192 }}
    >
      {version.image_url ? (
        <RarityEffect rarity={rarity} alwaysVisible={delta === 0}>
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

  if (!open) return null;

  const active = versions[activeIndex];
  const activeRarity: Rarity = (active?.dna_snapshot?.rarity as Rarity) ?? 'comum';
  const biome = active?.dna_snapshot?.biome ?? plant.dna.biome;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl flex flex-col items-center gap-6 px-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fechar */}
        <button
          onClick={onClose}
          className="absolute top-0 right-4 text-white/70 hover:text-white transition-colors z-10"
          aria-label="Fechar"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Cards — coverflow 3D com perspectiva compartilhada no container */}
        <div
          className="relative flex items-center justify-center w-full"
          style={{
            height: 220,
            perspective: '900px',
            perspectiveOrigin: '50% 50%',
          }}
          onWheel={handleWheel}
        >
          {isPending ? (
            <div className="text-white/50 text-sm">Carregando histórico...</div>
          ) : versions.length === 0 ? (
            <div className="text-white/50 text-sm">Esta planta ainda não evoluiu.</div>
          ) : (
            // Container preserve-3d para compartilhar a perspectiva do pai
            <div
              className="relative w-48 h-48"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {versions.map((version, i) => (
                <HistoryCard
                  key={version.id}
                  version={version}
                  delta={i - activeIndex}
                />
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

        {/* Infos da versão em foco */}
        {active && (
          <div className="flex flex-col items-center gap-1 text-center">
            <div className="flex items-center gap-2">
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
              {format(new Date(active.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} · {biome}
            </p>
            {active.dna_snapshot && active.stage && (
              <div className="flex items-center gap-1.5 text-amber-400 font-black text-sm mt-1">
                <Coins className="w-3.5 h-3.5" />
                {calcPlantScore(active.dna_snapshot, active.stage.order_index).toLocaleString('pt-BR')} moedas
              </div>
            )}
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
git commit -m "fix: coverflow 3D shared perspective + darker backdrop in PlantHistoryModal"
```

---

## Task 5 — Remover círculo hover + animação dos botões de ação

**Bugs:** #6 (círculo preto no hover) e #7 (botões de ação devem emergir do centro da planta).

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/Garden.tsx`

**Design da animação (#7):**
- Hover ativa → botões aparecem abaixo da planta
- Cada botão anima de `translateY(-36px) scale(0.3) opacity(0)` → posição final com spring suave
- Os dois botões têm `animation-delay` escalonado (0s e 0.06s)
- A classe `.action-btn-animated` dispara a animação via seletor `.group:hover`

- [ ] **Step 1: Adicionar keyframe em `src/app/globals.css`**

Após o bloco `/* ---------- Plantas — contorno preto universal ---------- */`, adicionar:

```css
/* ---------- Jardim — animação de botões de ação ---------- */

@keyframes btn-emerge {
  0%   { transform: translateY(-36px) scale(0.3); opacity: 0; }
  65%  { transform: translateY(3px)   scale(1.05); opacity: 1; }
  100% { transform: translateY(0)     scale(1);    opacity: 1; }
}

/* Ativados pelo grupo hover do PotSlot */
.group:hover .action-btn-animated {
  animation: btn-emerge 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.group:hover .action-btn-animated:nth-child(2) {
  animation-delay: 0.06s;
}

@media (prefers-reduced-motion: reduce) {
  .action-btn-animated { animation: none !important; }
}
```

- [ ] **Step 2: Reescrever o overlay de ações no estado `planted` em `Garden.tsx`**

Localizar o bloco do overlay de ações (tem `bg-black/20 rounded-full p-2 opacity-0 group-hover:opacity-100`):

```tsx
          <div className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity bg-black/20 rounded-full p-2 ${
            wrappingMode ? 'hidden' : 'opacity-0 group-hover:opacity-100'
          }`}>
            <p className="text-[10px] font-bold text-white uppercase tracking-tighter mb-1 bg-stone-900/50 px-2 rounded-full">
              {plant.current_stage.name}
            </p>
            <div className="flex gap-2">
              <button ... water />
              <button ... delete />
            </div>
            <div className="mt-2 flex gap-1">
              {progress dots}
            </div>
          </div>
```

Substituir completamente pelo novo overlay sem círculo preto e com animação:

```tsx
          {/* Overlay de ações — sem círculo, botões animam a partir do centro */}
          {!wrappingMode && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Nome do estágio — aparece no topo com fade */}
              <div className="absolute top-2 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <p
                  className="text-[10px] font-bold text-white uppercase tracking-tighter px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(15,32,12,0.75)' }}
                >
                  {plant.current_stage.name}
                </p>
              </div>

              {/* Botões de ação — emergem do centro da planta para baixo */}
              <div className="absolute bottom-3 left-0 right-0 flex flex-col items-center gap-1.5 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto">
                <div className="flex gap-2">
                  <button
                    disabled={waterMutation.isPending || plant.hydration_status === 'waiting_water'}
                    onClick={handleWater}
                    className={`action-btn-animated p-2 rounded-full shadow-xl transition-colors ${
                      plant.hydration_status === 'waiting_water'
                        ? 'bg-amber-500'
                        : 'bg-blue-500 hover:bg-blue-400 active:scale-95'
                    } text-white`}
                  >
                    <Droplets
                      className={`w-5 h-5 ${waterMutation.isPending && !isEvolving ? 'animate-spin' : ''}`}
                    />
                  </button>
                  <button
                    disabled={deleteMutation.isPending}
                    onClick={handleDelete}
                    className="action-btn-animated p-2 rounded-full shadow-xl transition-colors bg-red-500 hover:bg-red-400 active:scale-95 text-white"
                    title="Remover planta"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                {/* Pontos de progresso de rega */}
                <div className="flex gap-1">
                  {Array.from({ length: plant.current_stage.waters_required }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full ${
                        i < plant.current_stage_waters ? 'bg-blue-400' : 'bg-white/30'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
```

- [ ] **Step 3: Verificar tipos**

```powershell
Remove-Item -Force tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 4: Smoke test visual**

```powershell
npm run dev
```

Roteiro de teste:
1. **Bug #1**: Usar a pá → aguardar 60s → slot deve mudar para "+" automaticamente sem recarregar
2. **Bug #2**: Todos os canteiros (cheios e vazios) devem ter o mesmo tamanho oval
3. **Bug #3**: Plantas sem contorno preto de drop-shadow
4. **Bug #4**: Partículas de raridade visíveis **atrás** do PNG da planta
5. **Bug #5**: Clicar na planta → histórico com coverflow 3D funcional + perspectiva compartilhada
6. **Bug #6**: Passar mouse na planta → sem círculo preto ao redor
7. **Bug #7**: Passar mouse na planta → botões emergem de baixo com animação spring
8. **Bug #8**: Botão de recolher sidebar visível e clicável

- [ ] **Step 5: Commit**

```powershell
git add src/app/globals.css src/components/Garden.tsx
git commit -m "fix: remove hover circle + action buttons emerge animation from plant center"
```

---

## Self-review

### Spec coverage
- [x] #1 — Task 1: `onDigComplete` callback + invalidateQueries quando msLeft=0
- [x] #2 — Task 2: canteiro planted = 82%×58% (igual a ready/digging)
- [x] #3 — Task 2: `plant-outline` removido de Garden, Modal e InventoryPanel
- [x] #4 — Task 3: partículas com `zIndex: 0`, children com `zIndex: 1`
- [x] #5 — Task 4: `cardTransform` sem `perspective()` + container com `perspective: '900px'` + `transformStyle: 'preserve-3d'`
- [x] #6 — Task 5: overlay sem `bg-black/20 rounded-full`
- [x] #7 — Task 5: keyframe `btn-emerge` + classe `.action-btn-animated` com seletor `.group:hover`
- [x] #8 — Task 1: `overflow-hidden` removido da sidebar

### Verificações adicionais
- Task 5: `.action-btn-animated:nth-child(2)` assume que o primeiro botão é o de regar e o segundo é o de deletar — isso é verdade no JSX acima. ✓
- Task 4: `cardTransform` usa `position: 'absolute'` inline (necessário pois o container `preserve-3d` não é flex). ✓
- Task 1: `notified` flag no closure do `setInterval` previne chamadas múltiplas de `onDigComplete`. ✓
- Task 2: `bottom: '8%'` posiciona o canteiro um pouco acima do fundo para dar perspectiva natural. ✓
