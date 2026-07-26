# Herbo — Geração e Balanceamento

> **Fonte da verdade:** derivado do código (`src/lib/scoring.ts`,
> `src/services/growthService.ts`, `src/config/economy.ts`). Estado de 2026-07-19.
> Números marcados com "≈" são estimativas calculadas (esperança), não constantes.

Herbo (🍃) é a **moeda orgânica** do jogo — ganha jogando, nunca comprada com dinheiro.
As **moedas** (compradas em R$) são outra coisa; herbo é separado.

---

## 1. Única fonte: evoluir plantas

Herbo só entra de **um** lugar: cada vez que uma planta **avança de estágio**, o dono
recebe herbo. Não há herbo por missão, login, coleta de água, presente ou qualquer
outra ação (a missão `herbo_100` apenas *verifica* o saldo e dá 1 semente — não gera
herbo).

O valor de cada avanço é `calcPlantScore(dna, order_index)`:

```
herbo = peso_raridade × order_index
```

- `order_index` — passo interno da planta (1–13). O herbo escala **linearmente** com o
  estágio: quanto mais madura, mais rende cada avanço.
- `peso_raridade` — ver tabela abaixo.
- **Perks NÃO influenciam o herbo** (desde 2026-07-19). Eles são só visuais.

Concedido atomicamente na RPC `evolve_plant_tx` (`update profiles set herbo = herbo + p_herbo`).

### Pesos de raridade (`RARITY_WEIGHTS`)

| Raridade   | Peso | Chance de nascer |
|------------|-----:|-----------------:|
| `comum`    |   3  | 63,16% |
| `incomum`  |   5  | 15,79% |
| `raro`     |  10  | 10,53% |
| `epico`    |  15  | 5,26%  |
| `lendario` |  22  | 4,21%  |
| `brotaria` |  30  | 1,05%  |

A raridade é fixa no plantio e **multiplica todo o herbo** da planta pela vida inteira.
O topo agora é só **10×** a comum (era 100×) — cauda de raridade bem menos explosiva.

---

## 2. Quantas evoluções por planta

A planta nasce em `enterrada` (order 1) e evolui a cada sub-passo até a **adulta**
(order 11), que é **terminal** (não se rega mais). Logo há **10 avanços**, concedendo
herbo para os orders **N = 2, 3, …, 11**.

Soma dos order_index premiados: `2+3+…+11 = 65`.

Herbo de vida = `peso × 65`.

---

## 3. Herbo por planta ao longo da vida

| Raridade   | Herbo/vida (peso × 65) |
|------------|-----------------------:|
| `comum`    |   **195** |
| `incomum`  |   **325** |
| `raro`     |   **650** |
| `epico`    |   **975** |
| `lendario` | **1.430** |
| `brotaria` | **1.950** |

### Esperança por planta aleatória (totalmente crescida)

Multiplicador médio de raridade `E[peso] = Σ chance×peso ≈ 5,77`. Logo, uma planta
aleatória levada até a adulta rende **≈375 herbo**.

> **Distribuição mais achatada agora:** 63% das plantas são comuns (195). Uma
> `brotaria` (1,05%) rende 1.950 — 10× uma comum (antes era 100×). A média ainda é
> puxada pelos raros, mas nenhuma planta isolada "quebra" a economia.

---

## 4. Esforço para maturar (o "custo" de tempo/água)

Cada sub-passo exige um número de **regas** sorteado por tier (sistema de sede):

| Tier (orders) | Regas por sub-passo | Sub-passos |
|---------------|:-------------------:|:----------:|
| semente (1)   | 3 (fixo) | 1 |
| broto (2–4)   | 3–6 | 3 |
| muda (5–7)    | 4–9 | 3 |
| jovem (8–10)  | 5–10 | 3 |

Regas para levar da semente à adulta: **≈39 (mín) a 78 (máx), média ≈58,5**. Cada
planta pede água a cada **5–12h** (média ≈8,5h). Se regada sempre em dia, maturar uma
planta leva **≈20 dias**.

Gargalo real = **água**. Cada rega gasta 1 de água; água vem do mini-game de coleta
(1 por coleta, cooldown 2h, +chance de bônus). Isso liga o herbo de volta à água: os
upgrades pagos em herbo aumentam o estoque/coleta de água → cresce mais plantas em
paralelo → mais herbo. Mas esse laço tem teto (ver §5).

---

## 5. Sumidouros de herbo (onde gasta)

**Hoje só existe um sink: os upgrades de água** (`WATER_UPGRADES`).

| Upgrade | Níveis (custo herbo) | Total |
|---------|----------------------|------:|
| Capacidade (teto 5→20) | 50 · 100 · 200 | 350 |
| Coleta Farta (0→60% de +1 água) | 50 · 100 · 200 | 350 |
| **Total para maximizar tudo** | | **700** |

Ou seja: **todo o conteúdo comprável com herbo custa 700**. Uma única planta `raro`
(650) ou ~4 comuns (195 cada) já pagam quase o jogo inteiro de upgrades.

A missão `herbo_100` ("Primeira Colheita") dá **1 semente** ao atingir 100 de saldo —
é um marco, não um gasto.

---

## 6. Análise de balanceamento

**Problema central — o herbo satura.** Com apenas 700 de sink total, um jogador
mediano zera os upgrades em ~3 semanas (crescendo várias plantas em paralelo nos 9
vasos gratuitos). Depois disso o herbo **não tem mais uso** e só acumula — vira número
morto. O maior risco de balanceamento não é a taxa de ganho, é a **falta de dreno**.

**Skew de raridade agora controlado.** O peso vai de 3 (comum) a 30 (brotaria) — fator
10× (era 100×). Mesmo a brotaria (1.950/vida) supera o total de sinks só ~2,8× — nenhum
raro isolado "quebra" mais a progressão.

**Escala linear por estágio é saudável.** O `× order_index` faz o herbo crescer
conforme a planta amadurece (2 → 11), recompensando levar a planta até o fim em vez de
abandonar cedo. A soma 65 concentra ~48% do herbo de vida nos 3 últimos avanços
(orders 9–11), o que incentiva persistência.

**Perks fora do herbo.** Desde 2026-07-19 perks não afetam mais o valor — são puramente
visuais. O herbo depende só de raridade × maturidade, o que torna o balanceamento mais
previsível.

---

## 7. Alavancas para rebalancear

Onde mexer, do menos ao mais invasivo (tudo em `config`/`scoring`):

1. **Adicionar sinks** (prioridade nº 1) — dar no que gastar herbo:
   novos ramos de upgrade, a feature de **árvore** (`tree_potential` já é rolado no
   DNA), vasos/cosméticos, sementes compráveis com herbo, re-roll de sede, etc.
   Sem isso, mexer na geração só adia a saturação.
2. **Custos dos upgrades** (`WATER_UPGRADES[*].cost_herbo`) — subir os 50/100/200 para
   estender a progressão inicial.
3. **Pesos de raridade** (`RARITY_WEIGHTS`) — hoje 3/5/10/15/22/30. Dá pra reabrir o
   leque (topo maior) ou achatar mais, conforme o quão "loteria" a economia deve ser.
4. **Fator de estágio** — trocar `× order_index` por uma curva (ex.: `order²` mais
   suave no começo, ou um teto) muda o ritmo de ganho por avanço.

> Recomendação: antes de tocar na **geração**, resolver o **sink**. Hoje o herbo é
> fácil de acumular e quase não tem onde gastar — qualquer ajuste de ganho é secundário
> enquanto o teto de gasto for 700.

---

## 8. Resumo rápido

- **Entra** só por evolução: `peso_raridade × order_index` (perks não contam), nos
  orders 2–11 (soma 65).
- **Planta comum** rende 195 na vida; **aleatória** ≈375; **brotaria** 1.950.
- **Sai** só em upgrades de água: **700 no total** para maximizar tudo.
- **Gargalo de ritmo** = água (coleta 1/2h), não o herbo em si.
- **Ponto fraco do balanceamento** = ausência de dreno de herbo após os upgrades.
