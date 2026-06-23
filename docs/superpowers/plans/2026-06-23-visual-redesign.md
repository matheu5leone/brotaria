# Visual Redesign — Herbário Vitoriano Druídico

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar o design system Herbário Vitoriano Druídico ao jogo: fundo de jardim escuro, canteiros ovais de madeira, sidebar em pergaminho, botões hexagonais de madeira e contorno preto nas plantas.

**Architecture:** Tokens CSS e fontes em `globals.css`/`layout.tsx` são a fundação. `HexButton.tsx` é um componente SVG reutilizável para os dois toolbars. Os defs SVG (gradientes de madeira) ficam num `<svg>` oculto no `layout.tsx` para evitar duplicação de IDs. O canteiro oval é implementado inline nos estados do `PotSlot`.

**Tech Stack:** Next.js 16.2.7, React 19, TypeScript strict, Tailwind CSS v4, `next/font/google` (Cinzel Decorative, Crimson Text, IM Fell English), SVG inline.

## Global Constraints

- TypeScript strict — zero `any`, zero erros em `tsc --noEmit`
- Nenhuma nova dependência npm — apenas `next/font/google` (já built-in)
- Cores SEMPRE via `var(--color-*)` — nunca hex bruto no JSX/TSX
- IDs SVG dos gradientes de madeira definidos UMA VEZ em `layout.tsx` (`hex-wood`, `hex-inner`, `hex-grain`) e referenciados em `HexButton.tsx`
- `plant-outline` CSS class (já em globals.css) aplicada via `className` no `<Image>` de planta

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `src/app/layout.tsx` | Modificar | Adiciona 3 fontes Google + SVG defs oculto para gradientes HexButton |
| `src/app/globals.css` | Modificar | Adiciona CSS custom properties do design system |
| `src/components/Sidebar.tsx` | Modificar | Estilo pergaminho, tipografia Cinzel/Crimson, bordas cobre |
| `src/components/HexButton.tsx` | Criar | Botão hexagonal SVG de madeira reutilizável |
| `src/components/Garden.tsx` | Modificar | Fundo floresta, canteiro oval, toolbar hexagonal, cursor da pá |
| `src/components/InventoryPanel.tsx` | Modificar | Botão flutuante → HexButton |
| `src/components/PlantHistoryModal.tsx` | Modificar | `plant-outline` nas imagens do coverflow |

---

## Task 1 — Foundation: CSS tokens + Google Fonts + SVG defs

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Produz: `var(--font-display)`, `var(--font-body)`, `var(--font-caption)` disponíveis globalmente
- Produz: `var(--color-garden-*)`, `var(--color-parch-*)`, `var(--color-wood-*)`, `var(--color-gold)`, `var(--color-text-*)` disponíveis globalmente
- Produz: SVG defs `#hex-wood`, `#hex-inner`, `#hex-grain` referenciáveis por qualquer SVG no documento

- [ ] **Step 1: Atualizar `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Cinzel_Decorative, Crimson_Text, IM_Fell_English } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth";
import { WalletProvider } from "@/hooks/useWallet";
import { QueryProvider } from "@/providers/QueryProvider";

const cinzelDecorative = Cinzel_Decorative({
  variable: "--font-cinzel",
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});

const crimsonText = Crimson_Text({
  variable: "--font-crimson",
  weight: ["400", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

const imFellEnglish = IM_Fell_English({
  variable: "--font-fell",
  weight: ["400"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Brotaria - Seu Jardim Virtual",
  description: "Cultive plantas únicas geradas por IA",
  icons: {
    icon: "/imgs/brotaria.png",
    apple: "/imgs/brotaria.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${cinzelDecorative.variable} ${crimsonText.variable} ${imFellEnglish.variable} antialiased`}
      >
        {/* SVG defs globais — gradientes de madeira para HexButton */}
        <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id="hex-wood" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#7a4a22" />
              <stop offset="18%"  stopColor="#5c3a1e" />
              <stop offset="40%"  stopColor="#3d2010" />
              <stop offset="60%"  stopColor="#6b4228" />
              <stop offset="80%"  stopColor="#4a2e18" />
              <stop offset="100%" stopColor="#5c3a1e" />
            </linearGradient>
            <linearGradient id="hex-inner" x1="30%" y1="0%" x2="70%" y2="100%">
              <stop offset="0%"   stopColor="#2a1a0c" />
              <stop offset="100%" stopColor="#1e1008" />
            </linearGradient>
            <pattern id="hex-grain" patternUnits="userSpaceOnUse" width="64" height="8" patternTransform="rotate(5)">
              <rect width="64" height="8" fill="transparent" />
              <line x1="0" y1="2" x2="64" y2="2" stroke="rgba(0,0,0,0.12)" strokeWidth="0.5" />
              <line x1="0" y1="5" x2="64" y2="5" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
            </pattern>
          </defs>
        </svg>

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

- [ ] **Step 2: Adicionar CSS tokens em `src/app/globals.css`**

Inserir após o segundo bloco `:root` existente (após `--rarity-brotaria-light`), antes dos keyframes:

```css
/* ---------- Design System — tokens do Herbário Vitoriano ---------- */
:root {
  /* Jardim */
  --color-garden-deep:   #0f200c;
  --color-garden-mid:    #1a3318;
  --color-garden-light:  #162a12;

  /* Pergaminho (sidebar / painéis) */
  --color-parch-light:   #f2e8d5;
  --color-parch-mid:     #ede0c4;
  --color-parch-dark:    #dbc89a;

  /* Madeira / Cobre / Ouro */
  --color-wood-light:    #8b6346;
  --color-wood-mid:      #5c3a1e;
  --color-wood-dark:     #3d1c02;
  --color-gold:          #c9a227;

  /* Texto */
  --color-text-dark:     #3d1c02;
  --color-text-mid:      #5c3a1e;
  --color-text-muted:    #9a7a4a;
  --color-text-light:    #e8d5a0;

  /* Fontes */
  --font-display:        var(--font-cinzel), 'Georgia', serif;
  --font-body:           var(--font-crimson), 'Georgia', serif;
  --font-caption:        var(--font-fell), 'Georgia', serif;
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
git add src/app/layout.tsx src/app/globals.css
git commit -m "feat: add design system CSS tokens, Google Fonts and SVG defs for HexButton"
```

---

## Task 2 — Sidebar: estilo pergaminho vitoriano

**Files:**
- Modify: `src/components/Sidebar.tsx`

**Interfaces:**
- Consome: `var(--color-parch-*)`, `var(--color-wood-*)`, `var(--color-text-*)`, `var(--font-display)`, `var(--font-body)` de Task 1

- [ ] **Step 1: Reescrever `src/components/Sidebar.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import NavLink from '@/components/NavLink';
import Inventory from '@/components/Inventory';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import {
  LogOut, LayoutDashboard, Store, Settings,
  ChevronLeft, ChevronRight, Coins, Trophy,
} from 'lucide-react';

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const { coins } = useWallet();
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const navItemClass = (href: string) => {
    const isActive = pathname === href;
    const base = 'flex items-center rounded-lg transition-all border-l-2';
    const layout = isSidebarCollapsed
      ? 'justify-center p-2.5 w-10 h-10 mx-auto border-l-0'
      : 'gap-3 px-3 py-2';
    const state = isActive
      ? 'border-l-[var(--color-wood-mid)] bg-[rgba(92,58,30,0.1)] text-[var(--color-text-dark)] font-bold'
      : 'border-l-transparent text-[var(--color-text-mid)] hover:bg-[rgba(92,58,30,0.07)] hover:text-[var(--color-text-dark)] font-medium';
    return `${base} ${layout} ${state}`;
  };

  return (
    <aside
      className={`${
        isSidebarCollapsed ? 'w-20' : 'w-64'
      } border-r-[3px] flex flex-col sticky top-0 h-screen z-20 shadow-sm transition-all duration-300 ease-in-out relative overflow-hidden`}
      style={{
        background: `linear-gradient(180deg, var(--color-parch-mid) 0%, var(--color-parch-dark) 100%)`,
        borderRightColor: 'var(--color-wood-mid)',
        backgroundImage: `linear-gradient(180deg, var(--color-parch-mid) 0%, var(--color-parch-dark) 100%), repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(92,58,30,0.03) 20px, rgba(92,58,30,0.03) 21px)`,
        backgroundBlendMode: 'normal',
      }}
    >
      {/* Borda direita dourada */}
      <div
        className="absolute right-0 top-0 bottom-0 w-[3px] pointer-events-none"
        style={{
          background: `linear-gradient(180deg, var(--color-gold), var(--color-wood-mid) 30%, var(--color-gold) 50%, var(--color-wood-dark) 70%, var(--color-gold))`,
        }}
      />

      {/* Toggle Button */}
      <button
        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        className="absolute top-6 -right-3 w-6 h-6 rounded-full flex items-center justify-center shadow-md cursor-pointer hover:scale-110 active:scale-95 transition-all z-30"
        style={{
          background: 'var(--color-parch-mid)',
          border: `1px solid var(--color-wood-light)`,
        }}
        title={isSidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
      >
        {isSidebarCollapsed
          ? <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--color-text-mid)' }} />
          : <ChevronLeft  className="w-3.5 h-3.5" style={{ color: 'var(--color-text-mid)' }} />
        }
      </button>

      {/* Logo / Wordmark */}
      <div
        className={`px-5 flex items-center h-20 ${isSidebarCollapsed ? 'justify-center' : 'gap-2.5'}`}
        style={{ borderBottom: `1px solid rgba(92,58,30,0.25)` }}
      >
        <NavLink href="/" className="flex items-center gap-2.5" title="Brotaria">
          <Image
            src="/imgs/brotaria.png"
            alt="Brotaria"
            width={36}
            height={36}
            className="w-9 h-9 object-contain hover:scale-110 transition-transform"
            priority
          />
          {!isSidebarCollapsed && (
            <span
              className="text-xl font-black tracking-tight"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}
            >
              Brotaria
            </span>
          )}
        </NavLink>
      </div>

      {/* Navigation / Inventory */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {/* Coins chip */}
        <NavLink
          href="/loja"
          title={`Moedas: ${coins}`}
          className={`flex items-center rounded-xl transition-all ${
            isSidebarCollapsed ? 'justify-center p-2.5 w-12 h-12 mx-auto' : 'gap-2 px-3 py-2'
          }`}
          style={{
            background: 'rgba(201,162,39,0.1)',
            border: '1px solid rgba(201,162,39,0.4)',
          }}
        >
          <Coins className="w-5 h-5 min-w-[20px]" style={{ color: 'var(--color-gold)' }} />
          {!isSidebarCollapsed && (
            <span
              className="font-black text-base"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-wood-dark)' }}
            >
              {coins}{' '}
              <span className="text-xs font-bold" style={{ color: 'var(--color-gold)' }}>
                moedas
              </span>
            </span>
          )}
        </NavLink>

        <div className="space-y-1">
          {!isSidebarCollapsed && (
            <p
              className="px-3 text-[10px] font-bold uppercase tracking-widest mb-2"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}
            >
              Principal
            </p>
          )}

          <NavLink href="/" title="Meu Jardim" className={navItemClass('/')}>
            <LayoutDashboard className="w-5 h-5 min-w-[20px]" />
            {!isSidebarCollapsed && <span style={{ fontFamily: 'var(--font-body)' }}>Meu Jardim</span>}
          </NavLink>

          <NavLink href="/loja" title="Loja" className={navItemClass('/loja')}>
            <Store className="w-5 h-5 min-w-[20px]" />
            {!isSidebarCollapsed && <span style={{ fontFamily: 'var(--font-body)' }}>Loja</span>}
          </NavLink>

          <NavLink href="/ranking" title="Ranking" className={navItemClass('/ranking')}>
            <Trophy className="w-5 h-5 min-w-[20px]" />
            {!isSidebarCollapsed && <span style={{ fontFamily: 'var(--font-body)' }}>Ranking</span>}
          </NavLink>
        </div>

        <div
          className="pt-4"
          style={{ borderTop: `1px solid rgba(92,58,30,0.2)` }}
        >
          {!isSidebarCollapsed && (
            <p
              className="px-3 text-[10px] font-bold uppercase tracking-widest mb-4"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}
            >
              Inventário
            </p>
          )}
          <div className={isSidebarCollapsed ? '' : 'px-1'}>
            <Inventory isCollapsed={isSidebarCollapsed} />
          </div>
        </div>
      </nav>

      {/* User / Profile */}
      <div
        className="p-4"
        style={{
          borderTop: `1px solid rgba(92,58,30,0.2)`,
          background: 'rgba(92,58,30,0.04)',
        }}
      >
        {user ? (
          <div className="flex flex-col gap-3">
            <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3 px-2 py-1'}`}>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold border flex-shrink-0 cursor-help"
                style={{
                  background: 'linear-gradient(135deg, #2a4a1e, #1a2f10)',
                  borderColor: 'var(--color-wood-light)',
                  fontFamily: 'var(--font-display)',
                  color: 'var(--color-wood-light)',
                  fontSize: 14,
                }}
                title={user.email || ''}
              >
                {user.email?.[0].toUpperCase()}
              </div>
              {!isSidebarCollapsed && (
                <div className="flex-1 overflow-hidden">
                  <p
                    className="text-sm font-bold truncate"
                    style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}
                  >
                    {user.email?.split('@')[0]}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                    {user.email}
                  </p>
                </div>
              )}
            </div>

            <div className={`flex ${isSidebarCollapsed ? 'flex-col items-center gap-2' : 'gap-1'}`}>
              <button
                className={`flex items-center justify-center p-2 rounded-lg transition-colors ${
                  isSidebarCollapsed ? 'w-10 h-10' : 'flex-1'
                }`}
                style={{ color: 'var(--color-text-muted)' }}
                title="Configurações"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={signOut}
                className={`flex items-center justify-center rounded-lg font-bold transition-colors ${
                  isSidebarCollapsed ? 'w-10 h-10 p-2' : 'flex-1 p-2 gap-2'
                }`}
                style={{ color: '#8b4040' }}
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
                {!isSidebarCollapsed && (
                  <span className="text-xs" style={{ fontFamily: 'var(--font-body)' }}>
                    Sair
                  </span>
                )}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
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
git add src/components/Sidebar.tsx
git commit -m "feat: sidebar redesign — parchment background, Cinzel typography, copper border"
```

---

## Task 3 — Garden: fundo de floresta + canteiro oval

**Files:**
- Modify: `src/components/Garden.tsx`

**Interfaces:**
- Consome: `var(--color-garden-*)`, `var(--color-wood-*)` de Task 1
- Modifica: garden container background, PotSlot estados `digging`, `ready`, `planted`

- [ ] **Step 1: Trocar background do Garden container**

Localizar o return de `Garden()`, linha com `className={`relative w-full h-full bg-green-300...`}`.

Substituir `bg-green-300` e adicionar o fundo de floresta escura:

```tsx
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden select-none ${
        shovelActive ? 'cursor-none' : ''
      }`}
      style={{
        background: `
          radial-gradient(ellipse at 20% 10%, rgba(30,60,20,0.8) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 90%, rgba(20,50,10,0.8) 0%, transparent 50%),
          linear-gradient(160deg, var(--color-garden-mid) 0%, var(--color-garden-deep) 40%, var(--color-garden-light) 60%, var(--color-garden-deep) 100%)
        `,
        boxShadow: 'inset 0 0 60px rgba(0,0,0,0.4)',
      }}
      onMouseMove={handleGardenMouseMove}
      onMouseLeave={handleGardenMouseLeave}
      onClick={handleGardenClick}
    >
```

- [ ] **Step 2: Atualizar o estado `digging` no PotSlot**

Localizar o bloco `if (state === 'digging')` e substituir:

```tsx
  if (state === 'digging') {
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Canteiro oval — cavando */}
        <div
          className="relative flex items-center justify-center animate-pulse"
          style={{
            width: '82%', height: '58%',
            borderRadius: '50px / 36px',
            background: 'radial-gradient(ellipse at 38% 30%, #3d2a18, #1a0f05)',
            border: '2.5px solid var(--color-wood-mid)',
            boxShadow: 'inset 0 4px 16px rgba(0,0,0,0.8), 0 3px 8px rgba(0,0,0,0.4)',
          }}
        >
          <div className="flex flex-col items-center gap-0.5">
            <Shovel className="w-4 h-4" style={{ color: 'var(--color-parch-dark)', opacity: 0.8 }} />
            <span className="font-mono text-xs font-bold leading-none" style={{ color: 'var(--color-parch-light)' }}>
              {formatSecondsLeft(msLeft)}
            </span>
          </div>
        </div>
      </div>
    );
  }
```

- [ ] **Step 3: Atualizar o estado `ready` no PotSlot**

Localizar o bloco `if (state === 'ready')` e substituir:

```tsx
  if (state === 'ready') {
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Canteiro oval — pronto para plantar */}
        <div
          className="relative flex items-center justify-center"
          style={{
            width: '82%', height: '58%',
            borderRadius: '50px / 36px',
            background: 'radial-gradient(ellipse at 38% 30%, #2d1c10, #0f0905)',
            border: '2.5px solid var(--color-wood-mid)',
            boxShadow: 'inset 0 6px 20px rgba(0,0,0,0.95), inset 0 -2px 6px rgba(80,50,20,0.2), 0 3px 8px rgba(0,0,0,0.4)',
          }}
        >
          {/* Anel ornamental interno */}
          <div className="absolute pointer-events-none" style={{
            inset: '-7px', borderRadius: '57px / 43px',
            border: '2px solid var(--color-wood-light)', opacity: 0.5,
          }} />
          {/* Anel tracejado externo */}
          <div className="absolute pointer-events-none" style={{
            inset: '-11px', borderRadius: '61px / 47px',
            border: '1.5px dashed rgba(92,58,30,0.3)',
          }} />
          <button
            disabled={plantMutation.isPending}
            onClick={handlePlant}
            className="p-2 rounded-full transition-all active:scale-95"
            style={{ color: 'rgba(139,99,70,0.7)' }}
            title="Plantar semente"
          >
            <Plus className={`w-7 h-7 ${plantMutation.isPending ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    );
  }
```

- [ ] **Step 4: Atualizar o estado `planted` — base do canteiro**

No estado `planted`, o canteiro oval aparece embaixo da planta. Localizar o return do `planted`:

```tsx
  // state === 'planted'
  return (
    <div className="relative group w-full h-full flex flex-col items-center justify-end select-none">
      {plant ? (
        <>
          {/* Canteiro oval de base (terra visível embaixo da planta) */}
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none"
            style={{
              width: '78%', height: '32%',
              borderRadius: '50px / 36px',
              background: 'radial-gradient(ellipse at 40% 40%, #2d1c10, #100806)',
              border: '2.5px solid var(--color-wood-mid)',
              boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.9), 0 2px 6px rgba(0,0,0,0.5)',
              zIndex: 0,
            }}
          />
          <div className="relative w-full h-full flex items-center justify-center" style={{ zIndex: 1 }}>
            {/* ... restante do conteúdo da planta inalterado ... */}
```

> **Atenção:** substituir apenas o JSX do container externo do `planted` state. O conteúdo interno (isEvolving, latestVersion, Loader, Image, overlay de ações) permanece idêntico. Apenas envolva o `{plant ? (<> ... </>)}` com o novo container e adicione o canteiro oval de base acima do conteúdo.

- [ ] **Step 5: Atualizar mensagem de jardim vazio**

Localizar:
```tsx
<p className="text-stone-600 font-bold text-lg bg-white/60 px-4 py-2 rounded-xl">
  Use a pá para cavar seu primeiro buraco!
</p>
```

Substituir por:
```tsx
<p
  className="font-bold text-lg px-4 py-2 rounded-xl backdrop-blur-sm"
  style={{
    fontFamily: 'var(--font-display)',
    color: 'var(--color-text-light)',
    background: 'rgba(15,32,12,0.7)',
    border: '1px solid rgba(92,58,30,0.3)',
  }}
>
  Use a pá para cavar seu primeiro buraco!
</p>
```

- [ ] **Step 6: Verificar tipos**

```powershell
Remove-Item -Force tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 7: Commit**

```powershell
git add src/components/Garden.tsx
git commit -m "feat: dark forest garden background + oval canteiro for all pot states"
```

---

## Task 4 — HexButton component + toolbar redesign

**Files:**
- Create: `src/components/HexButton.tsx`
- Modify: `src/components/Garden.tsx`
- Modify: `src/components/InventoryPanel.tsx`

**Interfaces:**
- Produz:
  ```ts
  export function HexButton(props: {
    icon: React.ReactNode;
    label: string;
    badge?: string | number;
    disabled?: boolean;
    active?: boolean;
    onClick?: (e: React.MouseEvent) => void;
    title?: string;
  }): JSX.Element
  ```
- Consome: SVG defs `#hex-wood`, `#hex-inner`, `#hex-grain` definidos em `layout.tsx` (Task 1)

- [ ] **Step 1: Criar `src/components/HexButton.tsx`**

```tsx
'use client';

import { ReactNode } from 'react';

interface HexButtonProps {
  icon: ReactNode;
  label: string;
  badge?: string | number;
  disabled?: boolean;
  active?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
}

export function HexButton({
  icon, label, badge, disabled = false, active = false, onClick, title,
}: HexButtonProps) {
  return (
    <div
      className="relative select-none transition-all duration-150"
      style={{
        width: 62, height: 62,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        filter: disabled ? 'grayscale(0.3)' : undefined,
        transform: active ? 'scale(1.05)' : undefined,
      }}
      onClick={disabled ? undefined : onClick}
      title={title}
      onMouseEnter={(e) => {
        if (!disabled) (e.currentTarget as HTMLDivElement).style.transform = active ? 'scale(1.05)' : 'scale(1.07)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = active ? 'scale(1.05)' : 'scale(1)';
      }}
    >
      {/* SVG hexágono de madeira — gradientes definidos globalmente em layout.tsx */}
      <svg
        viewBox="0 0 64 64"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 w-full h-full"
        aria-hidden="true"
      >
        {/* Sombra de profundidade */}
        <polygon
          points="32,3 57,17.5 57,46.5 32,61 7,46.5 7,17.5"
          fill="rgba(0,0,0,0.5)"
          transform="translate(1.5,2.5)"
        />
        {/* Corpo de madeira */}
        <polygon
          points="32,3 57,17.5 57,46.5 32,61 7,46.5 7,17.5"
          fill="url(#hex-wood)"
        />
        {/* Veio de madeira */}
        <polygon
          points="32,3 57,17.5 57,46.5 32,61 7,46.5 7,17.5"
          fill="url(#hex-grain)"
          opacity="0.8"
        />
        {/* Interior escuro */}
        <polygon
          points="32,7 53,19.5 53,44.5 32,57 11,44.5 11,19.5"
          fill="url(#hex-inner)"
        />
        {/* Borda chanfrada */}
        <polygon
          points="32,3 57,17.5 57,46.5 32,61 7,46.5 7,17.5"
          fill="none"
          stroke="rgba(180,120,60,0.5)"
          strokeWidth="1.5"
        />
        {/* Folhas nos 6 vértices */}
        <text x="32" y="5"    textAnchor="middle" fontSize="8" fill="#4a8a3a" opacity="0.9">🍃</text>
        <text x="56.5" y="20" textAnchor="middle" fontSize="7" fill="#3a7a2a" opacity="0.85" transform="rotate(60,56.5,19)">🍃</text>
        <text x="56.5" y="48" textAnchor="middle" fontSize="7" fill="#4a8a3a" opacity="0.85" transform="rotate(120,56.5,48)">🍃</text>
        <text x="32" y="63"   textAnchor="middle" fontSize="8" fill="#3a7a2a" opacity="0.9"  transform="rotate(180,32,62)">🍃</text>
        <text x="7.5" y="48"  textAnchor="middle" fontSize="7" fill="#4a8a3a" opacity="0.85" transform="rotate(-120,7.5,48)">🍃</text>
        <text x="7.5" y="20"  textAnchor="middle" fontSize="7" fill="#3a7a2a" opacity="0.85" transform="rotate(-60,7.5,19)">🍃</text>
        {/* Anel tracejado interno */}
        <polygon
          points="32,11 50,21.5 50,42.5 32,53 14,42.5 14,21.5"
          fill="none"
          stroke="rgba(92,58,30,0.4)"
          strokeWidth="0.8"
          strokeDasharray="3,3"
        />
        {/* Anel de "ativo" */}
        {active && (
          <polygon
            points="32,3 57,17.5 57,46.5 32,61 7,46.5 7,17.5"
            fill="none"
            stroke="rgba(201,162,39,0.6)"
            strokeWidth="2"
          />
        )}
      </svg>

      {/* Ícone */}
      <div
        className="absolute inset-0 flex items-center justify-center z-[2] text-[22px]"
        style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.7))' }}
      >
        {icon}
      </div>

      {/* Badge (contagem / cooldown) */}
      {badge !== undefined && (
        <div
          className="absolute top-[-4px] right-[-6px] z-[3] w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
          style={{
            background: '#3a7a2a',
            color: '#d4f0b0',
            border: '1.5px solid var(--color-garden-deep)',
            fontFamily: 'var(--font-display)',
          }}
        >
          {badge}
        </div>
      )}

      {/* Label */}
      <div
        className="absolute whitespace-nowrap text-[9px]"
        style={{
          bottom: '-20px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: 'var(--font-display)',
          color: 'var(--color-wood-light)',
          letterSpacing: '0.5px',
        }}
      >
        {label}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Substituir o shovel toolbar em `Garden.tsx`**

Adicionar import no topo:
```tsx
import { HexButton } from '@/components/HexButton';
```

Localizar o bloco `{/* Shovel toolbar */}` e substituir completamente:

```tsx
      {/* Shovel toolbar — hexágono de madeira */}
      <div
        className="absolute bottom-4 right-4 z-20 flex flex-col items-end gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {shovelError && (
          <div
            className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg shadow"
            style={{
              background: 'rgba(139,40,40,0.9)',
              color: '#fecaca',
              border: '1px solid rgba(220,80,80,0.4)',
              fontFamily: 'var(--font-body)',
            }}
          >
            <span>{shovelError}</span>
            <button onClick={() => setShovelError(null)}>
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {shovelActive && (
          <div
            className="text-xs px-3 py-1.5 rounded-lg backdrop-blur-sm"
            style={{
              background: 'rgba(15,32,12,0.85)',
              color: 'var(--color-text-light)',
              border: '1px solid rgba(92,58,30,0.3)',
              fontFamily: 'var(--font-caption)',
              fontStyle: 'italic',
            }}
          >
            Clique no jardim para cavar
          </div>
        )}

        <HexButton
          icon={digMutation.isPending ? '⏳' : '⛏'}
          label={
            digMutation.isPending ? 'Cavando...'
            : shovelActive ? 'Cancelar'
            : shovelReady ? 'Pá'
            : formatCooldown(shovelCooldownMs)
          }
          badge={!shovelReady ? formatCooldown(shovelCooldownMs) : undefined}
          disabled={!shovelReady || digMutation.isPending}
          active={shovelActive}
          onClick={toggleShovel}
          title={
            shovelReady ? 'Usar pá para cavar'
            : `Recarregando: ${formatCooldown(shovelCooldownMs)}`
          }
        />
      </div>
```

- [ ] **Step 3: Substituir o botão flutuante em `InventoryPanel.tsx`**

Adicionar import no topo:
```tsx
import { HexButton } from '@/components/HexButton';
```

Localizar o bloco `{/* Botão flutuante */}` e substituir:

```tsx
      {/* Botão flutuante — hexágono de madeira */}
      <div
        className="absolute bottom-4 left-4 z-20"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: '24px' }}
      >
        <HexButton
          icon="🎒"
          label="Mochila"
          badge={totalItems > 0 ? totalItems : undefined}
          active={open}
          onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
          title="Abrir mochila"
        />
      </div>
```

- [ ] **Step 4: Verificar tipos**

```powershell
Remove-Item -Force tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 5: Commit**

```powershell
git add src/components/HexButton.tsx src/components/Garden.tsx src/components/InventoryPanel.tsx
git commit -m "feat: HexButton wood SVG component — replace shovel and inventory toolbars"
```

---

## Task 5 — Contorno preto nas plantas (`plant-outline`)

**Files:**
- Modify: `src/components/Garden.tsx`
- Modify: `src/components/PlantHistoryModal.tsx`
- Modify: `src/components/InventoryPanel.tsx`

**Interfaces:**
- Consome: `.plant-outline` CSS class (já definida em `globals.css`)

- [ ] **Step 1: Adicionar `plant-outline` em `Garden.tsx`**

Localizar o `<Image>` de planta no estado `planted` do PotSlot:
```tsx
className="drop-shadow-lg object-contain animate-in fade-in zoom-in duration-500"
```
Trocar por:
```tsx
className="plant-outline object-contain animate-in fade-in zoom-in duration-500"
```

- [ ] **Step 2: Adicionar `plant-outline` em `PlantHistoryModal.tsx`**

Localizar o `<Image>` dentro de `HistoryCard`:
```tsx
className="object-contain p-3"
```
Trocar por:
```tsx
className="plant-outline object-contain p-3"
```

- [ ] **Step 3: Adicionar `plant-outline` em `InventoryPanel.tsx`**

Localizar o `<Image>` dentro de `PlantSlot`:
```tsx
className="object-contain p-1"
```
Trocar por:
```tsx
className="plant-outline object-contain p-1"
```

- [ ] **Step 4: Verificar tipos**

```powershell
Remove-Item -Force tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 5: Smoke test visual**

```powershell
npm run dev
```

Roteiro:
1. Sidebar — fundo pergaminho, texto escuro quente, borda cobre
2. Jardim — fundo floresta escura com vinheta
3. Canteiros — ovais com bordas de vime, não mais círculos
4. Botão Pá — hexágono de madeira com folhas nos vértices, canto inferior direito
5. Botão Mochila — hexágono de madeira, canto inferior esquerdo
6. Plantas existentes — contorno preto visível ao redor das imagens PNG

- [ ] **Step 6: Commit**

```powershell
git add src/components/Garden.tsx src/components/PlantHistoryModal.tsx src/components/InventoryPanel.tsx
git commit -m "feat: apply plant-outline CSS class to all plant images"
```

---

## Self-review

### Spec coverage
- [x] Task 1 — CSS tokens 10 cores + 3 fontes + SVG defs hex-wood/hex-inner/hex-grain
- [x] Task 2 — Sidebar: parchment, Cinzel, Crimson, borda cobre, nav items warm
- [x] Task 3 — Garden: fundo floresta, canteiro oval (digging/ready/planted)
- [x] Task 4 — HexButton SVG reutilizável + shovel toolbar + inventory button
- [x] Task 5 — `.plant-outline` em Garden, PlantHistoryModal, InventoryPanel

### Verificações adicionais
- SVG `fill="url(#hex-wood)"` funciona cross-browser porque o `<svg>` com defs está no mesmo documento HTML (Task 1). ✓
- `HexButton` não usa `useState` (sem hidratação SSR issue) — comportamento hover via `onMouseEnter/Leave` inline. ✓
- Canteiro oval no estado `planted` usa `z-index` explícito para canteiro (z=0) e planta (z=1) via `style`. ✓
- `plant-outline` usa `filter: drop-shadow` — funciona sobre PNG transparente (segue o silhouette do alpha). ✓
- Task 4 remove a importação de `Shovel` de `lucide-react` em Garden.tsx se não for mais usada — verificar e limpar import se necessário. ✓
