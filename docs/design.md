# Brotaria — Design System

**Identidade visual:** Herbário Vitoriano Druídico  
**Referência de arte:** Don't Starve Together  
**Data:** 2026-06-23

---

## 1. Conceito

A Brotaria é um jardim virtual de espécimes mágicos. A identidade visual une dois universos:

- **Herbário Vitoriano** — molduras de latão e cobre, pergaminho envelhecido, tipografia Cinzel, catalogação científica com toque mágico
- **Arte Druídica Gótica** — plantas com personalidade sombria, madeira entalhada, folhas vivas, atmosfera de grimório encantado
- **Don't Starve Together** — estilo visual de referência para as plantas geradas por IA: traço de tinta espessa, cores levemente dessaturadas dentro de contornos pretos fortes, textura de livro ilustrado sombrio

O resultado é um jogo que parece um **grimório botânico vivo** — sério, mágico, levemente sinistro.

---

## 2. Paleta de Cores

### Jardim (fundo escuro)
| Token CSS | Hex | Uso |
|-----------|-----|-----|
| `--color-garden-deep` | `#0f200c` | Fundo principal do jardim |
| `--color-garden-mid`  | `#1a3318` | Gradiente médio |
| `--color-garden-light`| `#162a12` | Acento de floresta |

### Pergaminho (sidebar / painel)
| Token CSS | Hex | Uso |
|-----------|-----|-----|
| `--color-parch-light` | `#f2e8d5` | Fundo claro do pergaminho |
| `--color-parch-mid`   | `#ede0c4` | Fundo sidebar |
| `--color-parch-dark`  | `#dbc89a` | Gradiente base do pergaminho |

### Madeira / Cobre
| Token CSS | Hex | Uso |
|-----------|-----|-----|
| `--color-wood-light`  | `#8b6346` | Borda de madeira clara / cobre |
| `--color-wood-mid`    | `#5c3a1e` | Madeira média / vime |
| `--color-wood-dark`   | `#3d1c02` | Madeira escura / carvalho |
| `--color-gold`        | `#c9a227` | Detalhes dourados (badges, accents) |

### Texto
| Token CSS | Hex | Uso |
|-----------|-----|-----|
| `--color-text-dark`   | `#3d1c02` | Texto principal no pergaminho |
| `--color-text-mid`    | `#5c3a1e` | Texto secundário |
| `--color-text-muted`  | `#9a7a4a` | Labels, hints |
| `--color-text-light`  | `#e8d5a0` | Texto sobre fundo escuro |

---

## 3. Tipografia

| Papel | Fonte | Fonte alternativa | Uso |
|-------|-------|-------------------|-----|
| **Títulos / Logotipo** | `Cinzel Decorative` | system serif | Headers, nome do app, labels de raridade |
| **Corpo / Nav** | `Crimson Text` | system serif | Textos de navegação, descrições |
| **Legendas / Itálico** | `IM Fell English` | system serif | Subtítulos, datas, hints poéticos |

Carregadas via `next/font/google`. Nunca usar Geist (fonte padrão do Next.js) no tema druídico.

---

## 4. Componentes de UI

### 4.1 HexPot — Célula Hexagonal de Planta

Substituiu o Canteiro Oval. Célula hexagonal com `clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)` (pointy-top), posicionada livremente pelo sistema de `pos_x / pos_y` da pá.

**Anatomia:**
- Camada de borda: div outer com clip-path hex, fundo = cor da borda (`rgba(92,58,30,0.75)`)
- Camada de conteúdo: div inner com `inset: 3px` + mesmo clip-path, fundo escuro radial
- Badge "Nível X": fora do clip-path (não cortado), posicionado na base (`bottom: 0, translate-y: 35%`)

**Estados:**
- **Vazio / Pronto**: `+` + "Plantar" centralizados, fundo `#1e1408`
- **Cavando**: ícone de pá pulsando + countdown `mm:ss`, fundo `#3d2a18`
- **Plantado**: imagem da planta via `next/image` + `RarityEffect`, fundo escuro-verde
- **Selecionado**: borda dourada `rgba(201,162,39,0.95)` + anel de seleção interno

**Arquivo:** `src/components/HexPot.tsx`

### 4.2 Botão Hexagonal de Madeira

Usado para **Pá** e **Mochila** — os dois controles principais do jardim.

**Anatomia (SVG):**
- Hexágono com gradiente de carvalho (`#7a4a22 → #5c3a1e → #3d2010 → #6b4228`)
- Veio de madeira: SVG `<pattern>` com linhas horizontais sutis sobrepostas
- Chanfro nas arestas: `stroke rgba(180,120,60,0.5)` simula entalhe tridimensional
- 6 folhas (`🍃`) nos vértices como adorno orgânico
- Interior escuro (`#2a1a0c → #1e1008`)
- Anel tracejado interno: `stroke rgba(92,58,30,0.4) stroke-dasharray="3,3"`

**Estados:**
- **Ativo/Pronto**: opacidade e saturação normais
- **Cooldown**: `opacity: 0.55; filter: grayscale(0.3)` — parece madeira velha ressecada
- **Hover**: `transform: scale(1.07); filter: brightness(1.12)`

**Badge:**
- Mochila: verde-floresta `#3a7a2a` com contagem de itens
- Pá em cooldown: `#5c3a1e` com tempo restante

### 4.3 Sidebar (Pergaminho)

**Fundo:** `linear-gradient(180deg, #ede0c4, #e5d4b0, #dbc89a)`  
**Textura:** `repeating-linear-gradient` de linhas finas horizontais simulando fibra de papel  
**Borda direita:** 3px com gradiente de madeira/cobre  
**Tipografia:** Cinzel Decorative para labels, Crimson Text para itens de nav  
**Itens ativos:** `border-left: 2px solid #5c3a1e; background: rgba(201,162,39,0.12)`

### 4.4 PlantActionMenu — Menu de Ação Flutuante

Aparece acima do pot selecionado ao clicar numa planta. Três botões: **Regar**, **Histórico**, **Remover**.

**Anatomia:**
- Pill `border-radius: full`, fundo `rgba(8,14,5,0.92)` com `backdrop-filter: blur(10px)`
- Borda `rgba(201,162,39,0.25)` (sutil dourado)
- Posicionado em `left: potX%, top: potY%`, transform `translate(-50%, -145%)`
- Arrow pointer triangular abaixo do pill
- Cada botão: ícone + label em `var(--font-display)` 8px uppercase

**Arquivo:** `src/components/PlantActionMenu.tsx`

### 4.5 PlantDetailModal — Painel de Detalhes

Abre junto ao menu de ação; mostra informações completas da planta selecionada.

**Layout responsivo:**
- **Mobile** (`< md`): `fixed inset-0` — tela inteira com backdrop
- **Desktop** (`≥ md`): `fixed right-0 top-0 bottom-0 w-80` — painel lateral

**Conteúdo:**
- Badge de raridade no topo + botão X
- Imagem da planta em container circular com `RarityEffect`
- Nome: `{stage.name} {level}`
- Grid 2×2 de chips: Tipo, Ambiente, Plantado em, Personalidade
- Barra de progresso verde: `current_stage_waters / waters_required`
- "Pode regar agora!" ou "Próxima rega em Xh Xm"
- Recompensas: `nivel * 2` moedas + 10 XP
- Botões **Regar** (azul, desabilitado se não puder regar) e **Remover** (vermelho)

**Arquivo:** `src/components/PlantDetailModal.tsx`

### 4.6 Partículas de Background do Jardim

8 flores SVG de 4 pétalas posicionadas em coordenadas fixas nas bordas do jardim. Animação CSS `garden-float` (keyframe em `globals.css`): oscilação suave de ±9px com rotação leve, opacidade 0.13–0.22, duração 4.6–6.4s com delays variados.

Cor: `rgba(201,162,39,0.9)` (ouro/dourado). Não interativas (`pointer-events-none`).

### 4.7 Toolbar Flutuante (barra inferior do jardim)

Fundo: `rgba(8,14,5,0.75)` com `backdrop-filter: blur(6px)`  
Borda: `1px solid rgba(92,58,30,0.35)`  
Forma: pílula (`border-radius: 44px`)  
Contém os dois botões hexagonais separados por um divisor vertical sutil.

---

## 5. Arte das Plantas (IA Generativa)

### 5.1 Estilo visual

**Referência:** Don't Starve Together  
**Características obrigatórias:**
- Contorno preto espesso e sólido em todos os elementos (folhas, caule, raízes, flores)
- Linha com qualidade de tinta à mão, ligeiramente imperfeita
- Cores ricas mas levemente dessaturadas dentro dos contornos
- Hachura e textura de tinta para profundidade
- Atmosfera druídica/mística: plantas com personalidade sombria
- Bioluminescência mágica onde os traits da planta indicam

**Proibido:**
- Cartoon sem contornos, flat vector, anime, 3D render, pastel, cute kawaii, pintura realista, arte digital moderna

### 5.2 Background / Transparência

**Padrão:** PNG com canal alpha totalmente transparente (sem fundo)  
**Fallback:** Se o modelo não suportar alpha nativo, usar chromakey magenta `#FF00FF` + remoção em pós-processamento  
**CSS garantia:** Classe `.plant-outline` aplica `drop-shadow` 8-direcional como contorno preto de 2px sobre o PNG transparente, independente do que o modelo gerou

```css
.plant-outline {
  filter:
    drop-shadow(-2px  0px 0 #000)
    drop-shadow( 2px  0px 0 #000)
    drop-shadow( 0px -2px 0 #000)
    drop-shadow( 0px  2px 0 #000)
    drop-shadow(-2px -2px 0 #000)
    drop-shadow( 2px -2px 0 #000)
    drop-shadow(-2px  2px 0 #000)
    drop-shadow( 2px  2px 0 #000);
}
```

Aplicar em todo `<Image>` de planta em `Garden.tsx`, `PlantHistoryModal.tsx` e `InventoryPanel.tsx`.

### 5.3 Prompt de descrição (LLM)

**Arquivo:** `src/prompts/DESCRIPTION_PLANT.md`  
**Voz:** oráculo botânico de uma ordem druídica — parte diário de campo encantado, parte catalogação científica de grimório vitoriano  
**Tom:** vivido, reverente, específico; referencia brilhos mágicos, auras e significado druídico onde o DNA permite

### 5.4 Prompt de geração de imagem

**Arquivo:** `src/prompts/IMAGE_GENERATOR.md`  
**Estilo declarado:** Don't Starve Together + ilustração botânica gótica + grimório druídico encantado  
**Background:** transparent PNG (alpha channel)  
**Contorno:** "Very thick, bold, solid black ink outline (3–4px equivalent) around every single element"

---

## 6. Modelo de Imagem

| # | Modelo | Uso |
|---|--------|-----|
| 6 ✅ | `recraft/recraft-v4.1-utility` | **Padrão atual** — transparência nativa, forte em estilo de ilustração |
| 1 | `black-forest-labs/flux.2-pro` | Referencial / máxima qualidade |
| 5 | `black-forest-labs/flux.2-klein-4b` | Fallback rápido e barato |

Trocar em `src/services/aiService.ts` via `CONFIG.SELECTED_IMAGE`.

---

## 7. Implementação — Próximos Passos

A identidade visual está **documentada e parcialmente especificada**. A implementação do redesign visual da UI (sidebar, canteiros, botões hexagonais) ainda não foi executada — os componentes atuais ainda usam o estilo original.

**Ordem recomendada:**
1. `globals.css` — CSS tokens da paleta + fonte Cinzel/Crimson via `next/font`
2. `Sidebar.tsx` — redesign para pergaminho + tipografia
3. `Garden.tsx` — canteiro oval + toolbar hexagonal
4. `InventoryPanel.tsx` — estilo madeira integrado
5. Aplicar `.plant-outline` em todos os `<Image>` de planta

Os prompts de IA (`IMAGE_GENERATOR.md` e `DESCRIPTION_PLANT.md`) já estão atualizados.
