# Tutorial de onboarding — Coach marks do jardim (design)

Data: 2026-07-07

## Objetivo
Ensinar contas novas a usar os **botões do painel do jardim** (menu, mochila, pá,
regador, carrinho, lixeira) com **coach marks**: holofote sobre o botão real +
balão com foto do item, nome e como usar. Abre automático 1x e é reabrível por um
botão "?".

## Decisões (confirmadas)
- Formato: **coach marks** (holofote no botão de verdade), não slideshow.
- Modo: **leitura + Próximo** (aponta e explica; não exige executar a ação).
- Cobertura: **só os botões do painel** (menu, mochila, pá, regador, carrinho, lixeira).
- Gatilho: **auto 1x** (após o popup da semente) **+ botão "?"** pra reabrir.

## Passos (ordem)
1. menu (âncora) — abre/recolhe as ferramentas
2. mochila (`backpack.webp`) — guarda sementes e itens
3. pá (`shovel.webp`) — cava canteiro (texto adapta mobile=arrastar / desktop=clicar); 0 canteiros = sempre liberada
4. regador (`watering-can.webp`) — arraste até a planta; gasta 1 água
5. carrinho (`wheelbarrow.webp`) — recolhe/replanta arrastando
6. lixeira (`trash.webp`) — arraste até a planta/canteiro pra remover

## Componentes
- **`config/tutorialSteps.ts`** — `TutorialStep { target, image?, title, body, bodyDesktop? }` + `TUTORIAL_STEPS`.
- **`components/TutorialCoach.tsx`** — camada full-screen. Acha o alvo por
  `[data-tutorial="<target>"]`, mede com `getBoundingClientRect` (rAF + interval
  150ms + listener de resize — setState só em callbacks, respeita o lint), desenha:
  - **holofote**: div no retângulo do alvo (padding ~8px, borda dourada) com
    `box-shadow: 0 0 0 9999px rgba(8,14,5,0.8)` (escurece o resto);
  - **camada de bloqueio** (pointer-events) pra não interagir com o jogo durante o tour;
  - **balão**: foto + título + corpo + progresso (x/N) + Pular / Anterior / Próximo,
    virando pra cima/baixo conforme o espaço, clampado na viewport.
- **`HexButton`** ganha `tutorialId?: string` → `data-tutorial` na raiz (única mudança).

## Estado / dados
- Migration: `profiles.tutorial_seen boolean not null default false`; backfill dos
  atuais = true (só contas novas veem o auto).
- `POST /api/profile/tutorial-ack` (espelha welcome-ack) → seta true.
- `useWallet` expõe `tutorialSeen`.

## Integração no Garden
- `data-tutorial` em cada HexButton do painel (menu/backpack/shovel/water/barrow/trash).
- Enquanto o tour roda, força **painel aberto** (`setPainelOpen(true)`), senão os
  botões do grupo ficam recolhidos e sem retângulo.
- Auto-trigger: quando `welcomeAck === true` e `tutorialSeen === false`, abre o tour
  (guarda pra rodar 1x; setState via callback, sem lint de effect).
- Botão **"?"** (canto superior esquerdo, perto de "Minhas Plantas") reabre o tour
  a qualquer hora.
- Ao concluir/pular: fecha; se foi o auto (tutorialSeen false), `POST tutorial-ack`
  + invalida `wallet`.

## Fora de escopo
Modo "faça você mesmo" (exigir a ação real), botões fora do painel (Minhas Plantas,
água, missões, ranking, loja, indicação), e uma página /ajuda — ficam pra depois
(a lista de passos já serve de base).
