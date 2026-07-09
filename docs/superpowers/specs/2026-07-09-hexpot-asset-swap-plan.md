# Plano — Troca do asset do HexPot (canteiro → tile de terra hexagonal)

**Data:** 2026-07-09
**Objetivo:** substituir o asset do canteiro (`empty-pot.webp`, canteiro de madeira levantado, 782×572) por um **tile de terra hexagonal achatado** (vista quase de cima), mantendo intactas todas as lógicas acopladas: mapeamento por silhueta (alpha), hover/hitbox, coordenadas, colisão de cava, animações e âncoras relativas.

**Decisões travadas:**
- Âncora da planta = **centro visual do tile** (a planta brota do meio da superfície de terra, não da base).
- Silhueta de colisão/hitbox = **gerada por script que traça o alpha opaco** do PNG (exato, re-executável).

---

## 1. O que está acoplado ao asset hoje (mapa de impacto)

O componente é uma "caixa" (`.hex-pot`) com `aspect-ratio 1 / 1.65` (portrait). Dentro dela a imagem do canteiro é renderizada a `height: 80%`, `object-contain object-bottom`. **Todos** os números abaixo estão calibrados contra a silhueta e o aspecto atuais:

| Local | Constante / valor | Papel |
|---|---|---|
| `lib/potGeometry.ts` | `POT_FOOTPRINT` (6 vértices, y 0.586–0.988) | Silhueta opaca → colisão de cava (SAT) + prévia |
| `lib/potGeometry.ts` | comentário `boxH = 1.65 · boxW` | contrato do aspecto |
| `components/HexPot.tsx` | `POT_HEIGHT = 80%` | altura da imagem na caixa |
| `components/HexPot.tsx` | `PLANT_BOTTOM = 18%` | onde a base da planta encaixa |
| `components/HexPot.tsx` | `BALLOON_BOTTOM = 48%` | balões 💧/😢 acima do canteiro |
| `components/HexPot.tsx` | `HITBOX_CLIP` (polygon 8 pts) | único elemento clicável; carrega `data-pot-id` |
| `components/HexPot.tsx` | `plantScale` origin `bottom center` | escala da planta por estágio |
| `components/HexPot.tsx` | `paddingBottom: 18%` (cavando/plantar) | centra conteúdo na terra |
| `components/HexPot.tsx` | badge `bottom-[6%]` | nível encostado na madeira |
| `components/HexPot.tsx` | `src="/imgs/empty-pot.webp"` | asset em si (2 ocorrências) |
| `components/Garden.tsx` | `boxH = boxW * 1.65` (`potBoxWidthPx`/`computeDig`) | colisão real em px |
| `components/Garden.tsx` | `FOOTPRINT_SVG_POINTS` usa `y * 165` + `viewBox 0 0 100 165` | contorno-fantasma da prévia |
| `components/Garden.tsx` | `aspectRatio: '1 / 1.65'` (pots, fantasma, wrap) | caixa dos pots |
| `components/Garden.tsx` | fantasma usa `height: 80%` + `empty-pot.webp` | prévia da cava |
| `components/Garden.tsx` | wrap clip-path `polygon(0 38%, 50% 25%, 100% 38%…)` | overlay 🎁 |
| `components/PotFx.tsx` | `aspectRatio '1 / 1.65'` + `bottom: '20%'` | terra/gotas ancoradas na superfície |
| `components/GardenView.tsx` | `aspectRatio '1 / 1.65'`, `width: 12%` | jardim de outro usuário (read-only) |
| `app/globals.css` | `.hex-pot { width }` 18%/11%/14% + `pot-squash` origin `50% 100%` | responsivo + squash |

**Não acoplado (não mexer):** `app/api/shovel/dig/route.ts` — o servidor só insere `pos_x/pos_y`; **a colisão é 100% client-side**. A troca de asset não toca o backend.

### Fonte de verdade duplicada — refactor obrigatório
O aspecto `1.65` e a altura `80%`/anchor estão **espalhados como literais** em 5 arquivos. Antes de trocar o asset, centralizar em `lib/potGeometry.ts`:

```ts
export const POT_BOX_ASPECT = 1.65;      // altura/largura da caixa (revisto pós-script)
export const POT_IMG_HEIGHT_PCT = 0.80;  // altura da imagem na caixa
export const PLANT_ANCHOR_PCT = 0.44;    // centro da terra (revisto pós-script)
```
e derivar `aspectRatio`, `viewBox`, `boxH`, `y*165` desses tokens. Isso transforma a calibração final em **um lugar só**.

---

## 2. Passos

### Passo 0 — Arquivar o asset antigo
- Mover `public/imgs/empty-pot.webp` → `public/imgs/_archive/empty-pot.webp` (ou `legacy/`). Manter no repo.
- Adicionar o novo asset como `public/imgs/hexpot.webp` (converter o PNG fornecido p/ webp, mantendo alpha). **Pré-requisito: o arquivo do novo asset precisa estar salvo no projeto** — hoje ele só existe na conversa.

### Passo 1 — Script de traçado da silhueta (`scripts/trace-footprint.mjs`)
Entrada: o PNG/webp do tile. Saída (stdout + escreve um `.json`):
- decodifica alpha (usar `sharp` — já disponível via Next? senão `npm i -D sharp`), varre por linha,
- para cada linha de scan encontra `xMin/xMax` do alpha > limiar (ex. 8),
- reduz a um polígono hexagonal (6 vértices: topo, sup-dir, inf-dir, base, inf-esq, sup-esq) em **fração da caixa** (não do PNG),
- calcula bounding box, **centróide** (→ candidato a `PLANT_ANCHOR_PCT`) e o **aspecto sugerido** da caixa,
- opcional: emite o `HITBOX_CLIP` (silhueta + coluna central da planta) já em `polygon(...)`.

Rodar → colar os números em `potGeometry.ts`. Reexecutável se o asset mudar.

### Passo 2 — `lib/potGeometry.ts`
- Substituir `POT_FOOTPRINT` pela saída do script.
- Adicionar os tokens `POT_BOX_ASPECT`, `POT_IMG_HEIGHT_PCT`, `PLANT_ANCHOR_PCT`.
- Atualizar o comentário-cabeçalho (geometria/anchor novos).
- `potPolygonPx`, `pointInPolygon`, `polygonsOverlap` **não mudam** (algoritmos genéricos).

### Passo 3 — `components/HexPot.tsx`
- `src` → `/imgs/hexpot.webp` (2×).
- `POT_HEIGHT` ← `POT_IMG_HEIGHT_PCT`.
- `PLANT_BOTTOM` ← derivado de `PLANT_ANCHOR_PCT` (centro do tile); `transformOrigin` da planta passa a `center` conforme âncora nova.
- `BALLOON_BOTTOM`, badge `bottom`, `paddingBottom` (cavando/plantar) → recalcular relativos ao centro do tile.
- `HITBOX_CLIP` ← saída do script (silhueta do tile + coluna da planta acima do centro).

### Passo 4 — `components/Garden.tsx`
- `boxH = boxW * POT_BOX_ASPECT`.
- `FOOTPRINT_SVG_POINTS` e `viewBox` derivam de `POT_BOX_ASPECT` (trocar `165`/`100` por `100*aspect`).
- Todos os `aspectRatio: '1 / 1.65'` → `1 / ${POT_BOX_ASPECT}` (helper/const).
- Fantasma da cava: `src` novo + `height` do token; polígono verde/vermelho já vem do footprint novo (automático).
- Wrap clip-path 🎁 → reajustar ao novo hexágono (achatado).

### Passo 5 — `components/PotFx.tsx`
- `aspectRatio` via token; `bottom: '20%'` → âncora no centro do tile (usar `PLANT_ANCHOR_PCT`).
- Rever leque de terra (`DIRT`) e altura das gotas (`DROPS.start`) p/ baterem na superfície nova.

### Passo 6 — `components/GardenView.tsx` (read-only)
- `aspectRatio` via token; reavaliar `width: 12%` para o novo aspecto.

### Passo 7 — `app/globals.css`
- `.hex-pot` widths (18/11/14%) — reavaliar por breakpoint (tile mais largo pode pedir % menor p/ não colidir).
- `pot-squash` `transform-origin` → alinhar ao centro/base do tile novo.

### Passo 8 — Docs
- `docs/design.md §4.1` — atualizar descrição (tile de terra, âncora central, novos números).

---

## 3. Verificação (antes de dar por pronto)
Rodar o app e exercitar de fato — não só typecheck:
1. **Cava (desktop hover + mobile drag):** fantasma segue o cursor; verde onde cabe, vermelho colado/fora; cava respeita a silhueta nova.
2. **Colisão entre canteiros:** cavar encostado num vizinho → bloqueia sem sobrepor os tiles.
3. **Hitbox:** clicar num tile não rouba clique do vizinho; `data-pot-id` correto no drop de regador/carrinho/lixeira/semente.
4. **Assentamento da planta:** planta brota do centro do tile em todos os estágios (broto→adulta), sem flutuar nem afundar.
5. **Balões 💧/😢 e badge de nível:** posição coerente sobre o tile.
6. **FX:** terra ao plantar e gotas ao regar batem na superfície; `pot-squash` distorce a partir do ponto certo.
7. **Pan/zoom + breakpoints** (portrait / landscape-baixo / desktop): sem colisão nem corte; nitidez ok.
8. **GardenView (jardim de terceiros):** mesmo assentamento.

## 4. Riscos
- **Aspecto muda a densidade do jardim:** um tile mais largo/achatado colide mais fácil → talvez reduzir `.hex-pot` width e/ou a área plantável (`inArea` 6–94 / 8–92 em `computeDig`).
- **Âncora central quebra o "encaixe":** planta vista de frente sobre tile visto de cima pode exigir uma leve sombra/oclusão na base p/ vender o "plantado" (fora de escopo do asset, mas anotar).
- **Espalhamento de literais:** se pular o refactor do Passo 1-tokens, a calibração vira caça a números em 5 arquivos.
