# Árvore de Habilidades (upgrades) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o modal de melhorias da coleta de água por uma árvore de habilidades genérica (poço = 1 categoria; jardim no futuro), com hexágonos, revelação progressiva e muitas animações.

**Architecture:** Motor dirigido por config (`UPGRADE_TREE` por categoria → trilhas → níveis). Componentes genéricos (`UpgradeHub` → `UpgradeTree` → `UpgradeTrack` → `UpgradeNode` + `UpgradeInfo`) que não mencionam "água". Backend genérico já existente (`user_upgrades`, RPC `buy_water_upgrade`) permanece intacto na Fase 1.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4 + `style` inline, React Query v5, Supabase. Sem framework de teste — verificação por `npx tsc --noEmit`, `npx eslint`, e navegador ao vivo (conta `claude-test@brotaria.test`).

## Global Constraints

- Escopo: **Fase 1 apenas** (categoria `well`: `water_capacity` + `water_bonus`, 3 níveis cada). Sem `water_cooldown`, sem categoria `garden`, sem pré-requisitos cruzados.
- **Sem mudança de schema/DB** e sem tocar a RPC. Backend continua genérico.
- `upgrade_id` das trilhas = chaves já gravadas: `water_capacity`, `water_bonus`.
- Toda animação atrás de `@media (prefers-reduced-motion: reduce)` (convenção do `globals.css`).
- Toda constante de custo/efeito/duração vive na config (`economy.ts`/`upgrades.ts`), nunca hardcoded em componente.
- Custo em herbo exibido com `HerboIcon` (não emoji 🍃).
- Commit + push ao `main` ao concluir a feature (preferência do usuário).
- Verificação ao vivo usa a conta de teste; herbo pode ser ajustado via SQL (MCP Supabase, projeto `cnsrpukgnsdxznhlyyvr`).

---

### Task 1: Config genérica de upgrades + efeitos multi-nível

**Files:**
- Create: `src/config/upgrades.ts`
- Modify: `src/config/economy.ts` (expandir níveis; `waterMaxFor` multi-nível)
- Test: `scratchpad/upgrades-assert.mjs` (throwaway)

**Interfaces:**
- Consumes: nada.
- Produces:
  - `UpgradeCategoryId = 'well' | 'garden'`
  - `interface UpgradeNodeLevel { cost_herbo: number; effect: Record<string, number>; label: string; effectLine: string }`
  - `interface UpgradeTrack { id: string; name: string; description: string; icon: string; levels: UpgradeNodeLevel[] }`
  - `interface UpgradeCategory { id: UpgradeCategoryId; name: string; rootIcon: string; tracks: UpgradeTrack[] }`
  - `const UPGRADE_TREE: Partial<Record<UpgradeCategoryId, UpgradeCategory>>` (só `well` na Fase 1)
  - `const REVEAL_LOOKAHEAD = 1`
  - `function trackMaxLevel(track: UpgradeTrack): number`
  - `waterMaxFor(level)` agora **soma** `capacity_bonus` de todos os níveis `1..level`.

- [ ] **Step 1: Expandir `WATER_UPGRADES` em `economy.ts` para 3 níveis cada**

Em `src/config/economy.ts`, substituir os blocos `water_capacity` e `water_bonus`:

```ts
water_capacity: {
  id: 'water_capacity',
  name: 'Capacidade',
  description: 'Aumenta a capacidade máxima do regador.',
  maxLevel: 3,
  levels: [
    { cost_herbo: 50,  capacity_bonus: 5 },  // nível 1: +5 (teto 5→10)
    { cost_herbo: 100, capacity_bonus: 5 },  // nível 2: +5 (teto 10→15)
    { cost_herbo: 200, capacity_bonus: 5 },  // nível 3: +5 (teto 15→20)
  ],
},
water_bonus: {
  id: 'water_bonus',
  name: 'Coleta Farta',
  description: 'Chance de coletar +1 água extra a cada coleta.',
  maxLevel: 3,
  levels: [
    { cost_herbo: 50,  bonus_chance: 0.20 }, // nível 1: 20%
    { cost_herbo: 100, bonus_chance: 0.40 }, // nível 2: 40%
    { cost_herbo: 200, bonus_chance: 0.60 }, // nível 3: 60%
  ],
},
```

- [ ] **Step 2: Tornar `waterMaxFor` acumulativo**

Em `src/config/economy.ts`, substituir a função:

```ts
/** Teto de água efetivo: soma capacity_bonus de todos os níveis comprados. */
export function waterMaxFor(capacityLevel: number): number {
  const levels = WATER_UPGRADES.water_capacity.levels;
  let bonus = 0;
  for (let i = 0; i < capacityLevel && i < levels.length; i++) {
    bonus += levels[i].capacity_bonus ?? 0;
  }
  return WATER_BASE_MAX + bonus;
}
```

(`waterBonusChanceFor` já indexa por nível — não muda, mas passa a cobrir o nível 3.)

- [ ] **Step 3: Criar `src/config/upgrades.ts` (estrutura genérica por categoria)**

```ts
import { WATER_UPGRADES, WATER_BASE_MAX } from '@/config/economy';

export type UpgradeCategoryId = 'well' | 'garden';

export interface UpgradeNodeLevel {
  cost_herbo: number;
  effect: Record<string, number>;
  label: string;      // "Capacidade I"
  effectLine: string; // "Teto 5 → 10"
}
export interface UpgradeTrack {
  id: string;         // = upgrade_id em user_upgrades
  name: string;
  description: string;
  icon: string;       // asset em /imgs
  levels: UpgradeNodeLevel[];
}
export interface UpgradeCategory {
  id: UpgradeCategoryId;
  name: string;
  rootIcon: string;
  tracks: UpgradeTrack[];
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

const capLevels: UpgradeNodeLevel[] = WATER_UPGRADES.water_capacity.levels.map((lv, i) => {
  const before = WATER_BASE_MAX + WATER_UPGRADES.water_capacity.levels
    .slice(0, i).reduce((s, l) => s + (l.capacity_bonus ?? 0), 0);
  const after = before + (lv.capacity_bonus ?? 0);
  return {
    cost_herbo: lv.cost_herbo,
    effect: { capacity_bonus: lv.capacity_bonus ?? 0 },
    label: `Capacidade ${ROMAN[i]}`,
    effectLine: `Teto ${before} → ${after}`,
  };
});

const bonusLevels: UpgradeNodeLevel[] = WATER_UPGRADES.water_bonus.levels.map((lv, i) => {
  const before = i > 0 ? Math.round((WATER_UPGRADES.water_bonus.levels[i - 1].bonus_chance ?? 0) * 100) : 0;
  const after = Math.round((lv.bonus_chance ?? 0) * 100);
  return {
    cost_herbo: lv.cost_herbo,
    effect: { bonus_chance: lv.bonus_chance ?? 0 },
    label: `Coleta Farta ${ROMAN[i]}`,
    effectLine: `Chance +1 água ${before}% → ${after}%`,
  };
});

export const UPGRADE_TREE: Partial<Record<UpgradeCategoryId, UpgradeCategory>> = {
  well: {
    id: 'well',
    name: 'Poço',
    rootIcon: '/imgs/watering-can.webp',
    tracks: [
      { id: 'water_capacity', name: 'Capacidade', description: WATER_UPGRADES.water_capacity.description, icon: '/imgs/watering-can.webp', levels: capLevels },
      { id: 'water_bonus',    name: 'Coleta Farta', description: WATER_UPGRADES.water_bonus.description, icon: '/imgs/watering-can.webp', levels: bonusLevels },
    ],
  },
};

export const REVEAL_LOOKAHEAD = 1;

export function trackMaxLevel(track: UpgradeTrack): number {
  return track.levels.length;
}
```

(Ícones dos ramos usam `watering-can.webp` como placeholder da Fase 1; trocar por assets dedicados é cosmético e pode vir depois.)

- [ ] **Step 4: Escrever o assert throwaway e rodar**

Criar `scratchpad/upgrades-assert.mjs` no scratchpad (fora do repo). Como usa imports do projeto/TS, validar via checagem manual de valores no próprio arquivo com um script que replica a lógica, OU simplesmente confiar no typecheck + verificação ao vivo. Verificação mínima obrigatória:

Run: `cd <repo> && npx tsc --noEmit`
Expected: sem erros.

Conferir manualmente: `waterMaxFor(0)=5`, `waterMaxFor(1)=10`, `waterMaxFor(2)=15`, `waterMaxFor(3)=20`; `bonusLevels[2].effectLine === 'Chance +1 água 40% → 60%'`.

- [ ] **Step 5: Lint + commit**

Run: `npx eslint src/config/economy.ts src/config/upgrades.ts`

```bash
git add src/config/economy.ts src/config/upgrades.ts
git commit -m "feat(upgrades): config generica por categoria + niveis 3x + waterMaxFor acumulativo"
```

---

### Task 2: Lógica pura de estado dos nós (fog of war)

**Files:**
- Create: `src/lib/upgradeTree.ts`

**Interfaces:**
- Consumes: `UpgradeTrack`, `REVEAL_LOOKAHEAD`, `trackMaxLevel` (Task 1).
- Produces:
  - `type NodeStatus = 'owned' | 'next' | 'fog'`
  - `interface NodeView { index: number; level: number; status: NodeStatus; affordable: boolean; nodeLevel: UpgradeNodeLevel | null }`
  - `function trackView(track: UpgradeTrack, ownedLevel: number, herbo: number): { nodes: NodeView[]; hasFog: boolean; complete: boolean }`

- [ ] **Step 1: Implementar `trackView`**

```ts
import { UpgradeTrack, UpgradeNodeLevel, REVEAL_LOOKAHEAD, trackMaxLevel } from '@/config/upgrades';

export type NodeStatus = 'owned' | 'next' | 'fog';
export interface NodeView {
  index: number;      // 0-based na trilha
  level: number;      // 1-based (index+1)
  status: NodeStatus;
  affordable: boolean;
  nodeLevel: UpgradeNodeLevel | null; // null quando 'fog'
}

/**
 * Deriva os nós visíveis de uma trilha dado o nível comprado e o herbo.
 * - 1..ownedLevel: 'owned'
 * - ownedLevel+1 .. ownedLevel+REVEAL_LOOKAHEAD: 'next' (info visível)
 * - além disso: 'fog' (agregado numa tampa; nós individuais não são revelados)
 */
export function trackView(track: UpgradeTrack, ownedLevel: number, herbo: number) {
  const max = trackMaxLevel(track);
  const nodes: NodeView[] = [];
  const revealUpTo = ownedLevel + REVEAL_LOOKAHEAD; // último nível revelado
  for (let lvl = 1; lvl <= max; lvl++) {
    const idx = lvl - 1;
    if (lvl <= ownedLevel) {
      nodes.push({ index: idx, level: lvl, status: 'owned', affordable: false, nodeLevel: track.levels[idx] });
    } else if (lvl <= revealUpTo) {
      const cost = track.levels[idx].cost_herbo;
      nodes.push({ index: idx, level: lvl, status: 'next', affordable: herbo >= cost, nodeLevel: track.levels[idx] });
    } else {
      nodes.push({ index: idx, level: lvl, status: 'fog', affordable: false, nodeLevel: null });
    }
  }
  const complete = ownedLevel >= max;
  const hasFog = nodes.some((n) => n.status === 'fog');
  return { nodes, hasFog, complete };
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/lib/upgradeTree.ts`
Expected: sem erros.

Conferir a lógica mentalmente: `trackView(cap, 1, 60)` → nó1 owned, nó2 next+affordable, nó3 fog; `hasFog=true`, `complete=false`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/upgradeTree.ts
git commit -m "feat(upgrades): trackView — estado dos nos com fog of war (lookahead 1)"
```

---

### Task 3: `UpgradeInfo` (conteúdo compartilhado hover/sheet)

**Files:**
- Create: `src/components/upgrades/UpgradeInfo.tsx`

**Interfaces:**
- Consumes: `NodeView` (Task 2), `HerboIcon`.
- Produces: `function UpgradeInfo({ trackName, node, onBuy, pending, canBuy }: { trackName: string; node: NodeView; onBuy: () => void; pending: boolean; canBuy: boolean }): JSX.Element`

- [ ] **Step 1: Implementar o componente**

```tsx
'use client';
import { HerboIcon } from '@/components/HerboIcon';
import type { NodeView } from '@/lib/upgradeTree';

export function UpgradeInfo({
  trackName, node, onBuy, pending, canBuy,
}: { trackName: string; node: NodeView; onBuy: () => void; pending: boolean; canBuy: boolean }) {
  const lv = node.nodeLevel;
  if (!lv) return null;
  return (
    <div className="flex flex-col gap-2" style={{ minWidth: 180 }}>
      <div>
        <p className="text-sm font-black" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}>{lv.label}</p>
        <p className="text-[11px]" style={{ color: 'var(--color-text-mid)', fontFamily: 'var(--font-caption)' }}>{trackName}</p>
      </div>
      <p className="text-xs font-bold" style={{ color: '#1a6ba0', fontFamily: 'var(--font-display)' }}>{lv.effectLine}</p>
      <button
        onClick={onBuy}
        disabled={!canBuy || pending}
        className="mt-1 w-full rounded-xl py-2 text-sm font-black transition-all active:scale-95 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1"
        style={{
          fontFamily: 'var(--font-display)',
          background: canBuy ? 'linear-gradient(135deg, #2a5a1e, #1e4014)' : 'rgba(92,58,30,0.2)',
          color: canBuy ? '#d9f0c8' : 'var(--color-text-muted)',
          border: `1.5px solid ${canBuy ? 'rgba(74,222,128,0.35)' : 'rgba(92,58,30,0.3)'}`,
          opacity: pending ? 0.6 : 1,
        }}
      >
        {canBuy ? <>Comprar · <HerboIcon size={14} /> {lv.cost_herbo}</> : <><HerboIcon size={14} /> {lv.cost_herbo} — herbo insuficiente</>}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint + commit**

Run: `npx tsc --noEmit && npx eslint src/components/upgrades/UpgradeInfo.tsx`

```bash
git add src/components/upgrades/UpgradeInfo.tsx
git commit -m "feat(upgrades): UpgradeInfo — conteudo de info (titulo/efeito/comprar)"
```

---

### Task 4: `UpgradeNode` (hexágono + estados + hover/tap)

**Files:**
- Create: `src/components/upgrades/UpgradeNode.tsx`
- Modify: `src/app/globals.css` (classes `.upg-node-*`, glow, shake, pop)

**Interfaces:**
- Consumes: `NodeView` (Task 2), `UpgradeInfo` (Task 3), `HexButton`/`hex-button.webp`.
- Produces: `function UpgradeNode({ node, trackName, isMobile, onBuy, pending, onRequestInfo, justBought }: {...}): JSX.Element` — ver props abaixo.

Props:
```ts
{
  node: NodeView;
  trackName: string;
  isMobile: boolean;         // controla hover (desktop) vs tap→onRequestInfo (mobile)
  onBuy: () => void;
  pending: boolean;
  onRequestInfo: (node: NodeView) => void; // mobile: abre sheet no pai
  justBought: boolean;       // dispara animação de pop
}
```

- [ ] **Step 1: Keyframes em `globals.css`**

Adicionar ao fim de `src/app/globals.css`:

```css
/* ── Árvore de upgrades ──────────────────────────────────────────────────── */
@keyframes upg-glow {
  0%,100% { box-shadow: 0 0 6px 1px rgba(74,222,128,0.45); }
  50%     { box-shadow: 0 0 16px 4px rgba(74,222,128,0.85); }
}
.upg-glow { animation: upg-glow 1.8s ease-in-out infinite; border-radius: 14px; }
@keyframes upg-pop { 0%{transform:scale(1);} 35%{transform:scale(1.28);} 60%{transform:scale(0.94);} 100%{transform:scale(1);} }
.upg-pop { animation: upg-pop 0.5s cubic-bezier(0.3,1.4,0.5,1); }
@keyframes upg-shake { 0%,100%{transform:translateX(0);} 20%{transform:translateX(-5px);} 40%{transform:translateX(5px);} 60%{transform:translateX(-3px);} 80%{transform:translateX(3px);} }
.upg-shake { animation: upg-shake 0.4s ease-in-out; }
@keyframes upg-grow-in { 0%{opacity:0;transform:scale(0.4);} 100%{opacity:1;transform:scale(1);} }
.upg-grow-in { animation: upg-grow-in 0.4s cubic-bezier(0.2,0.7,0.3,1) both; }
@media (prefers-reduced-motion: reduce) {
  .upg-glow, .upg-pop, .upg-shake, .upg-grow-in { animation: none; }
}
```

- [ ] **Step 2: Implementar `UpgradeNode`**

Regras visuais por `node.status`:
- `owned`: hexágono preenchido (dourado/verde) + check (`lucide-react` `Check`), sem filtro.
- `next` + `affordable`: hexágono normal + classe `upg-glow`; clicável.
- `next` + `!affordable`: hexágono com `filter: brightness(0.5)`; clicável (mostra info; ao tentar comprar sem saldo → `upg-shake` + custo pisca).
- `fog`: não renderiza um HexButton; renderiza uma "tampa" com `?` (ver Task 5, mas o nó fog individual não aparece — a trilha agrega). `UpgradeNode` retorna `null` para `status==='fog'`.

```tsx
'use client';
import { useState } from 'react';
import Image from 'next/image';
import { Check } from 'lucide-react';
import type { NodeView } from '@/lib/upgradeTree';
import { UpgradeInfo } from '@/components/upgrades/UpgradeInfo';

const HEX = 64;

export function UpgradeNode({
  node, trackName, isMobile, onBuy, pending, onRequestInfo, justBought,
}: {
  node: NodeView; trackName: string; isMobile: boolean;
  onBuy: () => void; pending: boolean; onRequestInfo: (n: NodeView) => void; justBought: boolean;
}) {
  const [hover, setHover] = useState(false);
  const [shake, setShake] = useState(false);
  if (node.status === 'fog' || !node.nodeLevel) return null;

  const owned = node.status === 'owned';
  const next = node.status === 'next';
  const canBuy = next && node.affordable;

  const handleClick = () => {
    if (owned) return;
    if (isMobile) { onRequestInfo(node); return; }
    if (!canBuy) { setShake(true); setTimeout(() => setShake(false), 400); }
  };

  const handleBuy = () => {
    if (!canBuy) { setShake(true); setTimeout(() => setShake(false), 400); return; }
    onBuy();
  };

  return (
    <div className="relative" style={{ width: HEX, height: HEX }}
      onMouseEnter={() => !isMobile && setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        onClick={handleClick}
        aria-label={node.nodeLevel.label}
        className={`relative block w-full h-full transition-transform active:scale-95 ${canBuy ? 'upg-glow' : ''} ${shake ? 'upg-shake' : ''} ${justBought ? 'upg-pop' : ''}`}
        style={{ filter: next && !node.affordable ? 'brightness(0.5)' : undefined }}
      >
        <Image src="/imgs/hex-button.webp" alt="" fill className="object-contain" draggable={false} />
        {owned && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Check className="w-6 h-6" style={{ color: '#d9f0c8' }} strokeWidth={3} />
          </span>
        )}
        {!owned && (
          <span className="absolute inset-0 flex items-center justify-center text-sm font-black"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-light)' }}>
            {node.level}
          </span>
        )}
      </button>

      {/* Desktop hover popover */}
      {!isMobile && hover && !owned && (
        <div className="absolute z-50 left-1/2 -translate-x-1/2 mt-1 rounded-2xl p-3"
          style={{ top: '100%', background: 'var(--color-parch-light)', border: '1.5px solid var(--color-wood-light)', boxShadow: '0 12px 32px rgba(0,0,0,0.35)' }}>
          <UpgradeInfo trackName={trackName} node={node} onBuy={handleBuy} pending={pending} canBuy={canBuy} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck + lint + commit**

Run: `npx tsc --noEmit && npx eslint src/components/upgrades/UpgradeNode.tsx`

```bash
git add src/components/upgrades/UpgradeNode.tsx src/app/globals.css
git commit -m "feat(upgrades): UpgradeNode — hexagono com estados (owned/next/glow/dark) + hover"
```

---

### Task 5: `UpgradeTrack` (lane: cabeçalho + nós + conectores + tampa fog)

**Files:**
- Create: `src/components/upgrades/UpgradeTrack.tsx`
- Modify: `src/app/globals.css` (`.upg-connector`, fill de água)

**Interfaces:**
- Consumes: `UpgradeTrack` (config), `trackView`/`NodeView` (Task 2), `UpgradeNode` (Task 4).
- Produces: `function UpgradeTrackLane({ track, ownedLevel, herbo, isMobile, onBuy, pendingId, onRequestInfo, justBoughtLevel }: {...}): JSX.Element`

Props:
```ts
{
  track: UpgradeTrack;
  ownedLevel: number;
  herbo: number;
  isMobile: boolean;
  onBuy: (trackId: string) => void;
  pendingId: string | null;       // trackId em compra
  onRequestInfo: (trackId: string, node: NodeView) => void;
  justBoughtLevel: number | null; // nível recém-comprado nesta trilha (anima pop)
}
```

- [ ] **Step 1: Conector em `globals.css`**

```css
.upg-connector { position: relative; background: rgba(92,58,30,0.18); border-radius: 999px; overflow: hidden; }
.upg-connector-fill { position: absolute; inset: 0; background: linear-gradient(180deg, #60a5fa, #2563eb); transform-origin: top; }
@keyframes upg-fill { from { transform: scaleY(0); } to { transform: scaleY(1); } }
.upg-connector-fill.filled { animation: upg-fill 0.5s ease-out both; }
@media (prefers-reduced-motion: reduce) { .upg-connector-fill.filled { animation: none; } }
```

- [ ] **Step 2: Implementar a lane**

Layout: cabeçalho (ícone + nome + `nível/max` + coroa se completo) e uma sequência de `UpgradeNode` intercalada por conectores. Conector entre nível `i` e `i+1` fica "filled" (água) se `i < ownedLevel`. Após o último nó revelado, se `hasFog`, renderizar a **tampa** (`?`) não-interativa. Direção vertical no mobile e no desktop (a árvore em leque do desktop é composta pelo `UpgradeTree` posicionando as lanes; a lane em si é uma coluna vertical).

```tsx
'use client';
import Image from 'next/image';
import { Crown } from 'lucide-react';
import type { UpgradeTrack } from '@/config/upgrades';
import { trackView, type NodeView } from '@/lib/upgradeTree';
import { UpgradeNode } from '@/components/upgrades/UpgradeNode';

export function UpgradeTrackLane({
  track, ownedLevel, herbo, isMobile, onBuy, pendingId, onRequestInfo, justBoughtLevel,
}: {
  track: UpgradeTrack; ownedLevel: number; herbo: number; isMobile: boolean;
  onBuy: (trackId: string) => void; pendingId: string | null;
  onRequestInfo: (trackId: string, node: NodeView) => void; justBoughtLevel: number | null;
}) {
  const { nodes, hasFog, complete } = trackView(track, ownedLevel, herbo);
  const visible = nodes.filter((n) => n.status !== 'fog');

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-1.5 mb-1">
        <Image src={track.icon} alt="" width={18} height={18} className="object-contain" />
        <span className="text-xs font-black" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}>{track.name}</span>
        <span className="text-[10px] font-bold" style={{ color: 'var(--color-text-muted)' }}>{ownedLevel}/{track.levels.length}</span>
        {complete && <Crown className="w-4 h-4" style={{ color: 'var(--color-gold)' }} />}
      </div>

      {visible.map((node, i) => (
        <div key={node.level} className="flex flex-col items-center">
          {i > 0 && (
            <div className="upg-connector" style={{ width: 6, height: 18 }}>
              <div className={`upg-connector-fill ${node.level - 1 <= ownedLevel ? 'filled' : ''}`}
                style={{ transform: node.level - 1 <= ownedLevel ? 'scaleY(1)' : 'scaleY(0)' }} />
            </div>
          )}
          <UpgradeNode
            node={node}
            trackName={track.name}
            isMobile={isMobile}
            onBuy={() => onBuy(track.id)}
            pending={pendingId === track.id}
            onRequestInfo={(n) => onRequestInfo(track.id, n)}
            justBought={justBoughtLevel === node.level}
          />
        </div>
      ))}

      {hasFog && (
        <div className="flex flex-col items-center">
          <div className="upg-connector" style={{ width: 6, height: 18 }} />
          <div className="flex items-center justify-center rounded-xl"
            style={{ width: 44, height: 44, background: 'rgba(92,58,30,0.12)', border: '1.5px dashed rgba(92,58,30,0.3)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-display)', fontWeight: 900 }}>
            ?
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck + lint + commit**

Run: `npx tsc --noEmit && npx eslint src/components/upgrades/UpgradeTrack.tsx`

```bash
git add src/components/upgrades/UpgradeTrack.tsx src/app/globals.css
git commit -m "feat(upgrades): UpgradeTrackLane — trilha vertical com conectores de agua + tampa fog"
```

---

### Task 6: `UpgradeTree` (layout desktop leque / mobile empilhado + root poço)

**Files:**
- Create: `src/components/upgrades/UpgradeTree.tsx`

**Interfaces:**
- Consumes: `UpgradeCategory` (config), `UpgradeTrackLane` (Task 5).
- Produces: `function UpgradeTree({ category, levels, herbo, isMobile, onBuy, pendingId, onRequestInfo, justBought }: {...}): JSX.Element`

Props:
```ts
{
  category: UpgradeCategory;
  levels: Record<string, number>;  // { water_capacity: n, water_bonus: n }
  herbo: number;
  isMobile: boolean;
  onBuy: (trackId: string) => void;
  pendingId: string | null;
  onRequestInfo: (trackId: string, node: NodeView) => void;
  justBought: { trackId: string; level: number } | null;
}
```

- [ ] **Step 1: Implementar**

Root: o poço (`category.rootIcon`) no topo. Desktop: lanes lado a lado (flex row, `gap`) sob o poço (leque). Mobile: lanes empilhadas (flex col). Cada lane recebe `justBoughtLevel = justBought?.trackId === track.id ? justBought.level : null`.

```tsx
'use client';
import Image from 'next/image';
import type { UpgradeCategory } from '@/config/upgrades';
import type { NodeView } from '@/lib/upgradeTree';
import { UpgradeTrackLane } from '@/components/upgrades/UpgradeTrack';

export function UpgradeTree({
  category, levels, herbo, isMobile, onBuy, pendingId, onRequestInfo, justBought,
}: {
  category: UpgradeCategory; levels: Record<string, number>; herbo: number; isMobile: boolean;
  onBuy: (trackId: string) => void; pendingId: string | null;
  onRequestInfo: (trackId: string, node: NodeView) => void;
  justBought: { trackId: string; level: number } | null;
}) {
  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div className="upg-grow-in flex flex-col items-center">
        <div className="rounded-full p-2" style={{ background: 'rgba(96,165,250,0.12)', border: '2px solid rgba(96,165,250,0.4)' }}>
          <Image src={category.rootIcon} alt={category.name} width={56} height={56} className="object-contain" />
        </div>
        <span className="text-xs font-black mt-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}>{category.name}</span>
      </div>

      <div className={isMobile ? 'flex flex-col gap-5 w-full items-center' : 'flex flex-row gap-8 items-start justify-center'}>
        {category.tracks.map((track) => (
          <UpgradeTrackLane
            key={track.id}
            track={track}
            ownedLevel={levels[track.id] ?? 0}
            herbo={herbo}
            isMobile={isMobile}
            onBuy={onBuy}
            pendingId={pendingId}
            onRequestInfo={onRequestInfo}
            justBoughtLevel={justBought?.trackId === track.id ? justBought.level : null}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint + commit**

Run: `npx tsc --noEmit && npx eslint src/components/upgrades/UpgradeTree.tsx`

```bash
git add src/components/upgrades/UpgradeTree.tsx
git commit -m "feat(upgrades): UpgradeTree — root poco + lanes (leque desktop / empilhado mobile)"
```

---

### Task 7: `UpgradeHub` (casca + abas + saldo + sheet mobile + wiring)

**Files:**
- Create: `src/components/upgrades/UpgradeHub.tsx`
- Modify: `src/components/WaterUpgradesModal.tsx` (vira casca → `UpgradeHub categoryId="well"`)
- Modify: `src/hooks/useWaterUpgrades.ts` (expor `levels` já existe via `capacityLevel`/`bonusLevel`; adaptar)

**Interfaces:**
- Consumes: `UPGRADE_TREE` (Task 1), `UpgradeTree` (Task 6), `UpgradeInfo` (Task 3), `useWaterUpgrades`/`useBuyWaterUpgrade`, `useWallet`, `HerboIcon`.
- Produces: `function UpgradeHub({ categoryId, onClose }: { categoryId: UpgradeCategoryId; onClose: () => void }): JSX.Element`

- [ ] **Step 1: Detecção de mobile (hook simples)**

Se não existir util de breakpoint, usar `window.matchMedia('(max-width: 639px)')` num `useState`+`useEffect`. Confirmar no código se já há um `useIsMobile`/`useMediaQuery`:

Run: `grep -rn "matchMedia\|useIsMobile\|useMediaQuery" src/`

Se não houver, criar inline no `UpgradeHub`:

```tsx
const [isMobile, setIsMobile] = useState(false);
useEffect(() => {
  const mq = window.matchMedia('(max-width: 639px)');
  const on = () => setIsMobile(mq.matches);
  on(); mq.addEventListener('change', on);
  return () => mq.removeEventListener('change', on);
}, []);
```

- [ ] **Step 2: Implementar `UpgradeHub`**

Responsabilidades: overlay + card; banner de saldo (herbo, com `HerboIcon`); abas por categoria (só se `Object.keys(UPGRADE_TREE).length > 1` — hoje: nenhuma barra); render de `UpgradeTree`; estado `justBought` (setado no `onSuccess` da compra, limpo por timeout ~600ms); sheet de info no mobile (estado `infoNode`), fechando ao comprar. `levels` derivado da view (`{ water_capacity: capacityLevel, water_bonus: bonusLevel }`).

```tsx
'use client';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { UPGRADE_TREE, type UpgradeCategoryId } from '@/config/upgrades';
import { UpgradeTree } from '@/components/upgrades/UpgradeTree';
import { UpgradeInfo } from '@/components/upgrades/UpgradeInfo';
import { useWaterUpgrades, useBuyWaterUpgrade } from '@/hooks/useWaterUpgrades';
import { useWallet } from '@/hooks/useWallet';
import { HerboIcon } from '@/components/HerboIcon';
import type { NodeView } from '@/lib/upgradeTree';

export function UpgradeHub({ categoryId, onClose }: { categoryId: UpgradeCategoryId; onClose: () => void }) {
  const category = UPGRADE_TREE[categoryId];
  const { data } = useWaterUpgrades();
  const { herbo: walletHerbo } = useWallet();
  const buy = useBuyWaterUpgrade();

  const herbo = data?.herbo ?? walletHerbo ?? 0;
  const levels = { water_capacity: data?.capacityLevel ?? 0, water_bonus: data?.bonusLevel ?? 0 };

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const on = () => setIsMobile(mq.matches);
    on(); mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const [justBought, setJustBought] = useState<{ trackId: string; level: number } | null>(null);
  const [infoNode, setInfoNode] = useState<{ trackId: string; node: NodeView } | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (!category) return null;

  const doBuy = (trackId: string) => {
    setPendingId(trackId);
    const targetLevel = (levels[trackId as keyof typeof levels] ?? 0) + 1;
    buy.mutate(trackId, {
      onSuccess: () => {
        setJustBought({ trackId, level: targetLevel });
        setTimeout(() => setJustBought(null), 600);
        setInfoNode(null);
      },
      onSettled: () => setPendingId(null),
    });
  };

  const multi = Object.keys(UPGRADE_TREE).length > 1;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ background: 'rgba(5,8,3,0.55)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="relative w-full rounded-3xl p-5 pt-6 flex flex-col items-center gap-4"
        style={{ maxWidth: isMobile ? 380 : 780, maxHeight: '88vh', overflowY: 'auto',
          background: 'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)',
          border: '1.5px solid var(--color-wood-light)', boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }}
        onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Fechar" className="absolute top-3 right-3 p-1.5 rounded-full active:scale-90 hover:bg-black/10" style={{ color: 'var(--color-text-muted)' }}>
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-black" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}>Melhorias</h2>

        <div className="w-full rounded-2xl px-4 py-3 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #1e4014, #2a5a1e)', border: '1.5px solid rgba(74,222,128,0.35)' }}>
          <span className="text-xs font-bold uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)', color: 'rgba(217,240,200,0.75)' }}>Seu saldo</span>
          <span key={herbo} className="count-pop text-xl font-black inline-flex items-center gap-1.5" style={{ fontFamily: 'var(--font-display)', color: '#d9f0c8' }}>
            <HerboIcon size={20} /> {herbo}
          </span>
        </div>

        {multi && (
          <div className="flex gap-2">
            {Object.values(UPGRADE_TREE).map((c) => c && (
              <span key={c.id} className="px-3 py-1 rounded-full text-xs font-black"
                style={{ fontFamily: 'var(--font-display)',
                  background: c.id === categoryId ? 'var(--color-gold)' : 'rgba(92,58,30,0.12)',
                  color: c.id === categoryId ? '#fff' : 'var(--color-text-muted)' }}>{c.name}</span>
            ))}
          </div>
        )}

        <UpgradeTree
          category={category}
          levels={levels}
          herbo={herbo}
          isMobile={isMobile}
          onBuy={doBuy}
          pendingId={pendingId}
          onRequestInfo={(trackId, node) => setInfoNode({ trackId, node })}
          justBought={justBought}
        />

        {buy.isError && (
          <p className="text-xs font-bold text-center" style={{ color: '#b91c1c', fontFamily: 'var(--font-display)' }}>
            {(buy.error as Error)?.message ?? 'Não foi possível comprar.'}
          </p>
        )}

        {/* Sheet de info (mobile) */}
        {isMobile && infoNode && (
          <div className="fixed inset-0 z-[10001] flex items-end" style={{ background: 'rgba(5,8,3,0.5)' }} onClick={() => setInfoNode(null)}>
            <div className="w-full rounded-t-3xl p-5 pt-6"
              style={{ background: 'var(--color-parch-light)', border: '1.5px solid var(--color-wood-light)' }}
              onClick={(e) => e.stopPropagation()}>
              <UpgradeInfo
                trackName={category.tracks.find((t) => t.id === infoNode.trackId)?.name ?? ''}
                node={infoNode.node}
                onBuy={() => doBuy(infoNode.trackId)}
                pending={pendingId === infoNode.trackId}
                canBuy={infoNode.node.affordable}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `WaterUpgradesModal` vira casca**

Substituir todo o conteúdo de `src/components/WaterUpgradesModal.tsx` por:

```tsx
'use client';
import { UpgradeHub } from '@/components/upgrades/UpgradeHub';

export function WaterUpgradesModal({ onClose }: { onClose: () => void }) {
  return <UpgradeHub categoryId="well" onClose={onClose} />;
}
```

(Remover `HerboBanner`/`UpgradeCard` antigos e imports órfãos.)

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/components/upgrades/UpgradeHub.tsx src/components/WaterUpgradesModal.tsx`
Expected: sem erros. Corrigir imports não usados em `WaterUpgradesModal`.

- [ ] **Step 5: Commit**

```bash
git add src/components/upgrades/UpgradeHub.tsx src/components/WaterUpgradesModal.tsx
git commit -m "feat(upgrades): UpgradeHub (abas/saldo/sheet mobile) + WaterUpgradesModal vira casca"
```

---

### Task 8: Verificação ao vivo (desktop + mobile) e polish

**Files:**
- Modify: conforme bugs achados (componentes acima, `globals.css`).

**Interfaces:** nenhuma nova.

- [ ] **Step 1: Subir o dev server e logar**

Preferir `preview_start` (name `dev`). Se a porta 3000 estiver ocupada por outra sessão, o `autoPort` já resolve. Logar com `claude-test@brotaria.test` / senha salva em memória. Garantir herbo suficiente via SQL (MCP Supabase, `cnsrpukgnsdxznhlyyvr`): `update profiles set herbo = 500 where id = '3dff607b-6f13-46ac-b074-85fe6feed74b';` e zerar upgrades para testar do começo: `delete from user_upgrades where user_id = '3dff607b-6f13-46ac-b074-85fe6feed74b';`

- [ ] **Step 2: Desktop — abrir /agua → Melhorias**

Verificar: root poço no topo; 2 lanes lado a lado; cada lane mostra nível 1 (next) + tampa `?` (fog); hover no hexágono abre popover com efeito/custo; nó com saldo tem glow verde; sem saldo → filtro escuro. Comprar → pop + conector enche + próximo nível revela + saldo desce.

Evidência: `computer` screenshot. Se screenshot travar (como em sessões anteriores), inspecionar via `read_page`/`javascript_tool` (contar `.upg-glow`, `.upg-connector-fill.filled`, presença da tampa `?`).

- [ ] **Step 3: Mobile — `resize_window` preset mobile (375×812)**

Verificar: lanes empilhadas verticalmente; tap no hexágono abre bottom sheet com info + comprar; comprar fecha o sheet e anima. Sem overflow horizontal.

- [ ] **Step 4: Reduced motion**

`resize_window` não cobre isso; validar via DevTools/emulation OU conferir no código que todas as classes `.upg-*` estão no bloco `prefers-reduced-motion: reduce`.

- [ ] **Step 5: Corrigir o que aparecer e re-verificar** (loop até ok)

- [ ] **Step 6: Screenshot final de prova (desktop + mobile) e commit de ajustes**

```bash
git add -A
git commit -m "fix(upgrades): ajustes de layout/anima da arvore apos verificacao ao vivo"
```

---

### Task 9: Fechamento

- [ ] **Step 1: Typecheck + lint final do conjunto**

Run: `npx tsc --noEmit && npx eslint src/`
Expected: sem erros.

- [ ] **Step 2: Push**

```bash
git push origin main
```

- [ ] **Step 3: Resumo ao usuário** — o que foi feito, defaults assumidos, e que a Fase 2 (Eficiência Natural + categoria garden) ficou preparada mas não implementada.

---

## Self-Review (feito)

- **Cobertura do spec:** hex-only + info hover/tap (Tasks 3,4,7) ✓; fog of war lookahead 1 (Tasks 1,2,5) ✓; glow verde/filtro escuro (Task 4) ✓; arquitetura genérica multi-categoria + abas (Tasks 1,7) ✓; desktop+mobile (Tasks 6,7) ✓; animações (Tasks 4,5,6) ✓; níveis 3x + waterMaxFor acumulativo (Task 1) ✓; backend intacto ✓.
- **Placeholders:** nenhum "TBD"; código presente em cada step de código.
- **Consistência de tipos:** `NodeView`, `trackView`, `UpgradeTrackLane`, `UpgradeTree`, `UpgradeHub` com props batendo entre tasks; `levels: Record<string, number>` consistente; `justBought {trackId, level}` idem.
- **Lacuna conhecida (aceita):** o `onRequestInfo` de fog nunca dispara (nó fog retorna null) — ok. `useWaterUpgrades` mantém nomes `capacityLevel/bonusLevel` (não generalizado para `garden` nesta fase, conforme spec).
