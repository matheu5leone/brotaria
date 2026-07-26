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
herbo = peso_raridade × order_index × (1 + nº_perks × 0,2)
```

- `order_index` — passo interno da planta (1–13). O herbo escala **linearmente** com o
  estágio: quanto mais madura, mais rende cada avanço.
- `peso_raridade` — ver tabela abaixo.
- `nº_perks` — quantidade de perks no DNA **no momento do avanço** (perks crescem por
  mutação, então o bônus sobe ao longo da vida).

Concedido atomicamente na RPC `evolve_plant_tx` (`update profiles set herbo = herbo + p_herbo`).

### Pesos de raridade (`RARITY_WEIGHTS`)

| Raridade   | Peso | Chance de nascer |
|------------|-----:|-----------------:|
| `comum`    |   1  | 63,16% |
| `incomum`  |   3  | 15,79% |
| `raro`     |   8  | 10,53% |
| `epico`    |  20  | 5,26%  |
| `lendario` |  50  | 4,21%  |
| `brotaria` | 100  | 1,05%  |

A raridade é fixa no plantio e **multiplica todo o herbo** da planta pela vida inteira.

### Bônus de perks

`perkBonus = 1 + nº_perks × 0,2`. Ex.: 1 perk → ×1,2; 3 perks → ×1,6; 5 perks → ×2,0.
No plantio a planta tem 1–3 perks (média 1,37) e ganha mais por mutação (36,84% por
avanço). Ao longo da vida o `perkBonus` médio efetivo fica em **≈1,77**.

---

## 2. Quantas evoluções por planta

A planta nasce em `enterrada` (order 1) e evolui a cada sub-passo até a **adulta**
(order 11), que é **terminal** (não se rega mais). Logo há **10 avanços**, concedendo
herbo para os orders **N = 2, 3, …, 11**.

Soma dos order_index premiados: `2+3+…+11 = 65`.

Herbo de vida (perks constantes) = `peso × perkBonus × 65`.

---

## 3. Herbo por planta ao longo da vida

Duas leituras — com 1 perk fixo (piso) e com perks crescendo por mutação (realista,
`perkBonus` efetivo ≈1,77, i.e. fator de vida ≈115,2):

| Raridade   | Herbo/vida (1 perk fixo, ×78) | Herbo/vida (perks crescendo, ×115,2) |
|------------|------------------------------:|-------------------------------------:|
| `comum`    |   78 | **≈115** |
| `incomum`  |  234 | **≈346** |
| `raro`     |  624 | **≈921** |
| `epico`    | 1.560 | **≈2.304** |
| `lendario` | 3.900 | **≈5.759** |
| `brotaria` | 7.800 | **≈11.518** |

### Esperança por planta aleatória (totalmente crescida)

Multiplicador médio de raridade `E[peso] = Σ chance×peso ≈ 6,16`. Logo, uma planta
aleatória levada até a adulta rende **≈709 herbo** (piso ≈480 com 1 perk fixo).

> **Distribuição muito torta:** 63% das plantas são comuns (≈115). Mas uma única
> `brotaria` (1,05%) rende ≈11,5 mil — ~100× uma comum. A cauda de raridade domina a
> economia; a mediana é baixa, a média é puxada pelos raros.

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
(~921) ou ~6 comuns já pagam o jogo inteiro de upgrades.

A missão `herbo_100` ("Primeira Colheita") dá **1 semente** ao atingir 100 de saldo —
é um marco, não um gasto.

---

## 6. Análise de balanceamento

**Problema central — o herbo satura.** Com apenas 700 de sink total, um jogador
mediano zera os upgrades em ~3 semanas (crescendo várias plantas em paralelo nos 9
vasos gratuitos). Depois disso o herbo **não tem mais uso** e só acumula — vira número
morto. O maior risco de balanceamento não é a taxa de ganho, é a **falta de dreno**.

**Skew de raridade agressivo.** O peso vai de 1 (comum) a 100 (brotaria) — fator 100×.
Uma brotaria sozinha (~11,5k herbo) supera 16× o custo de todos os upgrades. Enquanto
os sinks forem pequenos, qualquer raro alto "quebra" a progressão.

**Escala linear por estágio é saudável.** O `× order_index` faz o herbo crescer
conforme a planta amadurece (2 → 11), recompensando levar a planta até o fim em vez de
abandonar cedo. A soma 65 concentra ~48% do herbo de vida nos 3 últimos avanços
(orders 9–11), o que incentiva persistência.

**Bônus de perks é modesto.** Perks crescendo adicionam ~48% ao herbo de vida
(perkBonus 1,2 → ~1,77). Não desequilibra; é um tempero.

---

## 7. Alavancas para rebalancear

Onde mexer, do menos ao mais invasivo (tudo em `config`/`scoring`):

1. **Adicionar sinks** (prioridade nº 1) — dar no que gastar herbo:
   novos ramos de upgrade, a feature de **árvore** (`tree_potential` já é rolado no
   DNA), vasos/cosméticos, sementes compráveis com herbo, re-roll de sede, etc.
   Sem isso, mexer na geração só adia a saturação.
2. **Custos dos upgrades** (`WATER_UPGRADES[*].cost_herbo`) — subir os 50/100/200 para
   estender a progressão inicial.
3. **Pesos de raridade** (`RARITY_WEIGHTS`) — comprimir o topo (ex.: brotaria 100→30)
   para a cauda não trivializar a economia.
4. **Fator de estágio** — trocar `× order_index` por uma curva (ex.: `order²` mais
   suave no começo, ou um teto) muda o ritmo de ganho por avanço.
5. **Bônus de perks** (`0,2` por perk) — se quiser que perks pesem mais/menos no valor.

> Recomendação: antes de tocar na **geração**, resolver o **sink**. Hoje o herbo é
> fácil de acumular e quase não tem onde gastar — qualquer ajuste de ganho é secundário
> enquanto o teto de gasto for 700.

---

## 8. Resumo rápido

- **Entra** só por evolução: `peso_raridade × order_index × (1 + perks×0,2)`, nos
  orders 2–11 (soma 65).
- **Planta comum** rende ≈115 na vida; **aleatória** ≈709; **brotaria** ≈11,5k.
- **Sai** só em upgrades de água: **700 no total** para maximizar tudo.
- **Gargalo de ritmo** = água (coleta 1/2h), não o herbo em si.
- **Ponto fraco do balanceamento** = ausência de dreno de herbo após os upgrades.
