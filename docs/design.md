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

> **Atualização 2026-06-26:** o canteiro agora é a **imagem `empty-pot.png`** (hexágono de madeira achatado), não mais clip-path CSS. A planta renderiza **na frente** do canteiro (`z-10` vs `z-0`).

Posicionada livremente pelo sistema de `pos_x / pos_y` da pá. Container retangular alto (`aspect-ratio: 1 / 1.65`), responsivo via `.hex-pot` (36% mobile / 12% desktop).

**Anatomia:**
- Canteiro: `empty-pot.png` ancorado embaixo (`POT_HEIGHT 80%`, `object-contain object-bottom`), `z-0`
- Planta: imagem IA `z-10`, base em `PLANT_BOTTOM 18%` (encaixa na terra); 30% menor no mobile (`.hex-plant-img scale(0.7)`)
- **Hitbox preciso** (`HITBOX_CLIP`): um div recortado com `clip-path` na silhueta (base do canteiro + coluna central da planta) é o **único** elemento clicável (`pointer-events: auto`); o wrapper é `pointer-events: none`. Evita que o retângulo vazio de um pot roube cliques do vizinho. Carrega o `data-pot-id` (detecção de drop)
- Badge "Nível X": `bottom: 6%`, encostada na madeira do canteiro
- Balões de status (💧 rega / 😢 stress): ancorados ao container em `bottom: 48%` (acima do canteiro), não à planta

**Estados:**
- **Vazio / Pronto**: `+` + "Plantar" centralizados
- **Cavando**: ícone de pá pulsando + countdown `mm:ss`
- **Plantado**: imagem da planta via `next/image` + `RarityEffect`
- **Selecionado / alvo**: glow via `drop-shadow` na silhueta (dourado=seleção, azul=rega, âmbar=mover, vermelho=lixeira)

**Loading:** spinner só a partir do 4º estágio (`order_index > 2`) — estágios enterrada (1–3) não geram imagem IA.

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

### 4.4 Painel de Ferramentas (`Garden.tsx` + `HexButton.tsx`)

> **Atualização 2026-06-26 (refatoração):** o antigo HUD/HUB (portal pro footer, slot 50/50,
> classes `hud-*`/`hub-*`/`garden-tools-*`) foi **substituído** por um único componente **"painel"**.
> O `PlantActionMenu` flutuante já havia sido removido; ações via botões do painel (drag-and-drop).

**Botões (ordem):** `[âncora, mochila, pá, regador, carrinho, lixeira]` — o botão de **presente foi
removido do painel** (lógica de gifts permanece dormente, a tratar depois).

**Estrutura:** `.painel` (wrapper `position: fixed; right:0; z-index:60`) → âncora (fixa) +
`.painel-group` (colapsável) → `.painel-group-inner` (flex com os 5 tools). Botões = `.painel-btn`.

**3 versões (CSS por media query; sem JS de detecção):**
| | Posição | Expande | Banda/bottom | Botão |
|---|---|---|---|---|
| **Desktop** (`min-width:768 and min-height:600`) | `bottom:0` | horizontal p/ esquerda (`row-reverse`) | 120px | **120px** |
| **Landscape** (`orientation:landscape and max-height:600`) | `bottom:0`, sobre o footer (não é filho dele) | horizontal p/ esquerda | 100px | **100px** |
| **Portrait** (base) | `bottom:72px` (10px acima da navbar de 62px) | vertical p/ cima (`column-reverse`) | — | **100px** |

- Âncora **fixa** durante toda a animação (fica na borda do canto; o grupo expande "saindo de trás").
- Âncora = **mesmo tamanho** dos outros botões. Ícone chevron: ↑/↓ (portrait), ←/→ (horizontal).
- **gap 10px** sempre (entre botões e âncora↔1º botão; o gap âncora↔grupo vem do `padding` do
  `.painel-group-inner`, que some quando colapsado via `overflow: hidden`).
- Animação recolher/expandir: **grid `0fr → 1fr`** (`grid-template-rows` portrait /
  `grid-template-columns` horizontal), `0.26s cubic-bezier(0.4,0,0.2,1)` + fade.
- Press feedback: `scale(0.88)` ao clicar/tocar.

**Notificações nos botões:**
- **Regador:** badge numérico (regas restantes) sobreposto no canto (notificação padrão).
- **Pá:** **cooldown radial estilo MOBA** — overlay `conic-gradient` (`.painel-cooldown`) que
  esvazia em sentido horário conforme o tempo, com o número (`formatCooldown`) no centro
  (`.painel-cooldown-num`). Ângulo = `remaining/SHOVEL_COOLDOWN_MS*360`, atualizado por timer
  local de 1s (não depende do refetch). Prop `cooldown` do `HexButton`; bloqueia o clique enquanto ativo.

**Ferramentas drag-and-drop** (estilo unificado, `setPointerCapture` para funcionar no toque):
| Ferramenta | Asset | Ação | Glow do alvo |
|-----------|-------|------|--------------|
| Regador   | `watering-can.png` | arrasta até a planta → rega | azul |
| Carrinho  | `wheelbarrow.png`  | arrasta até planta (recolhe) → arrasta até pot vazio (replanta); miniatura no botão | âmbar |
| Lixeira   | `trash.png`        | arrasta até planta → confirmação; até pot vazio → remove canteiro | vermelho |

O **glow do alvo** segue a silhueta via `drop-shadow` no HexPot (`isWaterTarget`/`isMoveTarget`/`isTrashTarget`).

**Mochila:** abre um **modal centralizado** na tela (`InventoryPanel`, tema grimório, backdrop +
fecha ao clicar fora), desatrelado da posição do botão. As **mensagens de erro/dica** do painel foram removidas.

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

### 4.7 PlantHistoryModal — Card de Histórico de Evolução

Modal de histórico/detalhe da planta. Usa **tema escuro do jardim** (não pergaminho) para permanecer imersivo no contexto do garden.

**Diferença de estilo intencional:** O fundo dark-green do card contrasta com os painéis de parchment. É o único componente com tema escuro, justificado pela imersão no jardim.

**Card:**
- Fundo: `linear-gradient(160deg, #1c2d10, #0f1a08, #0a1205)`
- Borda: `1.5px solid rgba(201,162,39,0.35)` + `inset 0 1px 0 rgba(201,162,39,0.12)`
- Border-radius: `24px` (rounded-3xl)
- Largura: `min(88vw, 360px)`

**Estrutura interna:**
- Badge de raridade: ícone lucide (mockado por raridade) + label colorido pela raridade
- Botão X (fechar) — top right
- Imagem da planta: `75%` da largura do card, aspect 1:1, `RarityEffect` ativo
- Nome: `{stage.name} {level}` em `var(--font-display)`
- Descrição gerada do DNA: `personality + biome` → texto curto em itálico
- Chips meta: Tipo | Plantado em | Ambiente
- Barra de progresso verde (100% para estágios históricos; live para estágio atual)
- Status de rega (próxima rega / pode regar agora)
- Recompensas: `level * 2 moedas` + `10 XP`
- Botões: **Remover** (vermelho translúcido) + **Regar** (verde, desabilitado se não pode regar)

**Navegação < >:**
- Setas flutuantes fora do card, navegam pelos `plant_versions` do banco
- Dots de paginação coloridos pela raridade da versão ativa
- O último item é o estágio atual (com dados ao vivo)

**Ícones de raridade (mockados — sem assets externos):**
| Raridade | Ícone lucide | Cor |
|----------|-------------|-----|
| comum    | Leaf        | `#d1d5db` |
| incomum  | Droplets    | `#22d3ee` |
| raro     | Star        | `#60a5fa` |
| epico    | Zap         | `#c084fc` |
| lendario | Flame       | `#fb923c` |
| brotaria | Sprout      | `#4ade80` |

**Arquivo:** `src/components/PlantHistoryModal.tsx`

### 4.9 ConfirmDeleteModal — Diálogo de Confirmação (lixeira)

Modal de confirmação ao remover uma planta (via lixeira ou card). Segue o **tema grimório escuro** (mesma linguagem do PlantHistoryModal §4.7).

**Anatomia:**
- Backdrop `rgba(5,8,3,0.62)` + `backdrop-filter: blur(4px)`, clicar fora cancela
- Card: `linear-gradient(160deg, #1c2d10, #0f1a08, #0a1205)`, borda `1.5px rgba(201,162,39,0.35)`, `border-radius: 24px`, `width: min(88vw, 340px)`
- Ícone de lixeira (`Trash2`) num círculo vermelho translúcido
- Título Cinzel + corpo Crimson
- Botões: **Cancelar** (neutro) + **Remover** (vermelho translúcido `rgba(185,28,28,0.45)`)

**Arquivo:** `ConfirmDeleteModal` em `src/components/Garden.tsx`

### 4.10 Toolbar Flutuante (barra inferior do jardim)

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
