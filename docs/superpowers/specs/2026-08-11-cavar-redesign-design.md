# Redesign do sistema de cavar — pá consumível, obra escalonada e minigame

**Data:** 2026-08-11 · **Status:** implementado (branch local `feat/cavar-redesign`, sem push)

## Problema

O sistema de cavar era o cadeado mais visível do early game:

- A pá tinha **cooldown de 24h** (liberado só com 0 canteiros), então o **dia 1 do jogador novo era exatamente 1 planta**.
- A planta nasce hidratada com a próxima sede em 5–12h e só mostra a primeira imagem de IA depois de ~25h.
- Resultado: a primeira sessão durava ~3 minutos e o segundo ato era no dia seguinte.

Os números vinham de três fontes de verdade divergentes (`economy.ts`, `shovel/dig/route.ts:5`, `HexPot.tsx:13`), e `/api/shovel/status` era código morto — o cliente lia `profiles.shovel_last_used_at` direto do Supabase e reimplementava a regra, sem a exceção dos 0 canteiros que o servidor aplicava.

## Objetivo

Trocar o relógio arbitrário por um sistema **escalável, rápido no começo e imersivo**, em que o freio seja consequência do estado do jardim e o ato de cavar tenha participação do jogador.

**Fora de escopo nesta leva:** o gargalo de sementes (segue a grátis do cadastro) e qualquer efeito mecânico da fertilidade — a raridade do solo é sorteada e guardada, mas inerte.

## O sistema

### Pá consumível
5 usos, barra de durabilidade no botão. Reposição por **10 moedas ou 300 herbo**, ofertada só quando quebra; recarrega para 5. Quebrada, o botão vira atalho para a loja — o bloqueio explica a si mesmo. O cooldown de 24h deixou de existir (`shovel_last_used_at` fica na tabela, sem leitor).

### Regra do novato
Com **0 canteiros** a cavada é blindada: não consome durabilidade, **0% de item**, solo sempre `comum`. Garante que ninguém fique preso sem jardim. Não é explorável — o ciclo "apagar tudo → cavar de graça" devolve um canteiro só, sem acúmulo.

### Obra escalonada
A duração depende de quantos canteiros **vazios** (sem planta, **incluindo os em obra**) o jogador já tem, medido antes de cavar:

| Vazios | Obra |
|---|---|
| 0 | 1 min |
| 1 | 5 h |
| 2 | 24 h |
| 3+ | 7 dias |

Buraco vazio é dívida: quem mantém o jardim cheio cava rápido para sempre. A duração é **gravada no canteiro** (`pots.dig_duration_ms`) porque o cliente não teria como recalculá-la depois.

### Acelerar
Só faixas acima de 24h: **24h = 5 moedas**, **7 dias = 30**. Preço fixo por faixa, não proporcional ao restante, para o jogador saber o custo antes de cavar. Implementado empurrando `digging_started_at` para trás — não inventa estado novo.

### Minigame
Três camadas (grama → terra → terra fofa), um golpe em cada; o marcador varre a pista e acertar a faixa clara crava fundo. A precisão média vira `accuracy` (0..1).

A varredura visual é animação CSS (GPU) e a posição lógica é derivada do **tempo decorrido** no golpe — as duas usam a mesma duração, então o React não re-renderiza a cada quadro. Com `prefers-reduced-motion` a varredura não existe, então o minigame vira um clique simples com precisão neutra (0,5).

### Sorteios do servidor (ocultos e inertes)

| Sorteio | Base | Com precisão máxima | Destino |
|---|---|---|---|
| Raridade do solo | uniforme, 1/6 | (não afetado) | `pots.soil_rarity` |
| Minhoca | 10% | 15% | `inventory_items` |
| Terra molhada | 40% | 50% | `inventory_items` |

A distribuição uniforme do solo é deliberadamente diferente da raridade de planta (fortemente enviesada para comum) — é outro eixo.

## Decisões e riscos

**Anti-cheat.** `accuracy` vem do cliente e não é auditável. Mitigação: o servidor clampa 0..1 e o teto de ganho é curto (+5pp / +10pp), então forjar precisão máxima rende quase nada — e os materiais são inertes. **Quando os materiais ganharem uso mecânico, isto precisa ser revisitado**, provavelmente com um desafio emitido pelo servidor no início da obra.

**Colisão.** Continua no cliente (SAT sobre o footprint, `potGeometry`), porque a caixa do canteiro depende do viewport (14% no desktop, 18% no mobile) e o servidor não sabe qual. O servidor ganhou apenas uma guarda de distância mínima entre centros (4%), que barra o abuso escancarado de empilhar canteiros via chamada direta sem arriscar rejeitar cavadas legítimas.

**300 herbo é agressivo.** Existiam 700 herbo de sink no jogo inteiro e o jogador mediano leva ~3 semanas para gerar isso, então uma pá ≈ 9 dias de herbo. Como sink é ótimo (o `docs/herbo.md` pede exatamente isso), mas empurra o early game para a moeda paga. Vale observar antes de considerar uma rota gratuita de reparo.

**Atomicidade.** `consume_shovel_use` desce a durabilidade com `where durability > 0` — o CAS que impede duas cavadas simultâneas de gastarem o mesmo último uso. A cavada gasta a pá **antes** de criar o canteiro e estorna o uso se o insert falhar (padrão de compensação já usado em `missions/claim`).

## Arquivos

- **Migrações:** `20260811120000_shovel_durability.sql` (tabela `user_tools`, backfill de pá cheia para os 52 jogadores, RPCs `buy_shovel` e `consume_shovel_use`), `20260811120100_pots_dig_scaling.sql`, `20260811120200_inventory_dig_materials.sql`.
- **Config:** `src/config/economy.ts` — `SHOVEL_MAX_DURABILITY`, `PRICES.SHOVEL_*`, `DIG_DURATION_BY_EMPTY_POTS`, `DIG_RUSH_COST_COINS`, `DIG_LOOT`, `SOIL_RARITIES`. Saíram `SHOVEL_COOLDOWN_HOURS`/`DIG_DURATION_SECONDS` e derivados.
- **Servidor:** `src/services/shovelService.ts` (novo); rotas `/api/shovel/{dig,status,buy}` e `/api/pots/rush`.
- **Cliente:** `src/hooks/useShovel.ts` (novo), `src/components/DigMinigame.tsx` (novo), `HexButton` (prop `durability`), `HexPot` (`dig_duration_ms`, `formatDigLeft`, botão de acelerar), `Garden.tsx`, `loja/page.tsx`, `tutorialSteps.ts`.
- **Som:** `src/lib/sfx.ts` ganhou `dig_hit` e `dig_miss`, sintetizados (ruído filtrado + envelope), sem arquivos de áudio.

## Verificação executada

`tsc` e `npm run build` limpos. Ao vivo com a conta de teste:

- **Escalonamento:** cavadas 1–5 deram 1min / 5h / 24h / 7d / 7d, com o previsto no status batendo com o gravado no canteiro em todas.
- **Novato:** primeira cavada não gastou pá (5→5), solo `comum`, loot vazio.
- **Durabilidade:** 5→0 ao longo de 6 cavadas; a 7ª deu 409 `NO_DURABILITY`.
- **Corrida:** duas cavadas simultâneas com 1 uso → uma 200, uma 409; durabilidade parou em 0, nunca negativa.
- **Compras:** herbo 500→200 e moedas 65→55, ambas recarregando para 5; com pá cheia recusa `ALREADY_FULL`.
- **Acelerar:** 5h recusou (`NOT_RUSHABLE`), 24h cobrou 5, 7d cobrou 30, repetir deu `ALREADY_DONE`.
- **Distribuições** (27 cavadas, precisão 0): as 6 raridades de solo apareceram, inclusive `lendario` e `brotaria`; terra molhada 37% (esperado 40%).
- **UI:** barra em 60% com 3/5 usos, tooltip "3/5 usos · obra de 5h", preview "⏳ 5h" antes de cavar, botão "⏩ 5 🪙" no canteiro de 24h, e o minigame completo (3 camadas → canteiro de 5h criado, pá 3→2).
