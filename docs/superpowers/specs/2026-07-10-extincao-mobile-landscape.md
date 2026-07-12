# Plano — Extinção do modo mobile-landscape (travar em portrait)

**Data:** 2026-07-10
**Objetivo:** encerrar todo suporte a **mobile landscape**. Modos suportados: **desktop** e **mobile portrait**. Remover o código morto do landscape e **bloquear** o uso em celular deitado com um overlay "gire o celular".

---

## 1. Como "travar em portrait" (decisão técnica)

Não existe PWA manifest nem `viewport` com orientação no projeto, e `screen.orientation.lock()` só funciona em fullscreen/PWA instalada — **não é confiável no browser**. A solução padrão e robusta é um **overlay CSS-only** que cobre a tela quando o dispositivo é um **celular em landscape**, pedindo pra girar.

**Detecção (media query):**
```css
@media (orientation: landscape) and (max-height: 600px) and (pointer: coarse) { … }
```
- `max-height: 600px` exclui desktop (desktop landscape tem altura ≥ 600).
- `pointer: coarse` restringe a **touch** → uma janela de desktop baixa (mouse) nunca é bloqueada.
- Tablet landscape (≥ 600px de altura) **não** é bloqueado → cai no layout desktop (ok).

Sem JS: o overlay é `display:none` por padrão e `display:flex` sob essa query.

## 2. Onde está o código de landscape (inventário)

Só **2 arquivos** têm lógica real (o resto são comentários):

### `src/app/globals.css`
| Linhas | O quê | Ação |
|---|---|---|
| 207–210 | `.painel` — query combinada desktop **+ landscape** (`row-reverse`) | Remover o ramo `(orientation: landscape) and (max-height:600px)`; manter só desktop |
| 249–266 | `.painel-group` — mesma query combinada (layout horizontal) | Remover o ramo landscape; manter só desktop |
| 302–306 | `.hex-pot` landscape 11% | **Apagar o bloco inteiro** (sobra portrait 18% + desktop 14%) |
| 339–343 | `.garden-bg` `@media (min-width:768px), (orientation: landscape)` | Tirar `(orientation: landscape)` → só `(min-width:768px)` |
| 180–181, 193–194, 199, 206, 220 | comentários "portrait + landscape" / "celular deitado" | Atualizar texto |

> `.app-shell` (185–189) e a `DESKTOP_QUERY` **não mudam**: um celular landscape não bate `min-height:600` → recebe o shell mobile, e o overlay o cobre. Mantém a detecção de desktop intacta.

### `src/components/Garden.tsx`
| Linhas | O quê | Ação |
|---|---|---|
| 62–84 | `PainelToggleIcon` — `landscape:hidden md:hidden` e `hidden landscape:inline-flex md:inline-flex` | Remover a variante `landscape:` → `md:hidden` / `hidden md:inline-flex`. Portrait = seta vertical; desktop = horizontal |
| 381–383 | `potBoxWidthPx` — ramo `(orientation: landscape) and (max-height:600px) → 0.11` | Remover o ramo; fica desktop `0.14` / else `0.18` |
| 61–65 | comentário | Atualizar |

### Só comentário (sem código landscape)
- `src/components/PlantsGridModal.tsx:167` — grid usa `sm:/md:/lg:` (largura), não `landscape:`. Só ajustar o comentário.
- `src/hooks/useIsDesktop.ts:7` — comentário "portrait ou landscape". Atualizar.
- `src/components/HexPot.tsx:85`, `src/lib/potGeometry.ts:17` — comentários com a palavra "portrait/landscape" descrevendo a imagem; não mexer.

## 3. Novo — overlay de rotação (portrait-lock)

**CSS** (`globals.css`): bloco `.rotate-lock` fixo, z-index acima de tudo, fundo do tema, ícone de girar + texto. `display:none` base; `display:flex` na media query da §1.

**Montagem** (`src/app/layout.tsx`): um `<div class="rotate-lock">…</div>` no `<body>`, **global** — cobre login, signup e o app. Estático (sem estado), então funciona até se o React não hidratar.

Conteúdo sugerido: emoji/📱↻ + "Gire o celular para o modo retrato 🌱 — o Brotaria funciona em pé".

## 4. Verificação (via preview + resize_window)
1. **Mobile portrait** (375×812): app normal, bottomnav, painel vertical, sem overlay.
2. **Desktop** (1280×800): sidebar, painel horizontal, sem overlay, `.hex-pot` 14%.
3. **Celular landscape** (812×375, pointer coarse): **overlay "gire o celular" cobrindo tudo**, app inacessível.
4. Confirmar que nenhuma regra `(orientation: landscape)` sobrou: `grep -rn "orientation: landscape\|landscape:" src` → só o overlay.
5. `tsc` + `eslint` + `next build` limpos.

## 5. Riscos / edge cases
- **Janela desktop baixa** (< 600px de altura): protegida pelo `pointer: coarse` (mouse ≠ coarse) → não bloqueia.
- **Tablet landscape** (altura ≥ 600): não bloqueia; recebe layout desktop (aceitável).
- **Tablet pequeno landscape** (altura < 600, coarse): mostra "gire" — aceitável.
- O overlay é só visual: quem burlar (DevTools) ainda acessa, mas o layout landscape deixou de ser mantido — sem garantia de UI. Aceitável pelo escopo.

## 6. Ordem de execução
1. globals.css: remover ramos landscape + adicionar `.rotate-lock`.
2. Garden.tsx: remover variantes `landscape:` + ramo de `potBoxWidthPx`.
3. layout.tsx: montar o `.rotate-lock`.
4. Atualizar comentários (globals, useIsDesktop, PlantsGridModal, Garden).
5. Verificar nos 3 viewports + build.
