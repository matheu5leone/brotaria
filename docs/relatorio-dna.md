# Relatório de Probabilidades do DNA

> **Fonte da verdade:** derivado do **código real** de geração
> (`src/services/dnaService.ts` + `src/config/genome/*`). Reflete o retrabalho de
> 2026-07-19 (sem humanização, cores livres, +biomas/personalidades, perks 1–3).
>
> **Regra geral:** salvo raridade, flores, frutos e potencial de árvore, **todo
> campo categórico é sorteado com distribuição uniforme** (`pick()` = `Math.random()`
> sobre a lista). Campos independentes entre si. Cores são hex 100% aleatório.

---

## 1. Raridade

6 níveis, pesos somando 95:

| Raridade   | Peso | Chance no plantio |
|------------|-----:|------------------:|
| `comum`    |  60  | **63,16%**        |
| `incomum`  |  15  | **15,79%**        |
| `raro`     |  10  | **10,53%**        |
| `epico`    |   5  | **5,26%**         |
| `lendario` |   4  | **4,21%**         |
| `brotaria` |   1  | **1,05%**         |

Chances acumuladas ("pelo menos"):

| Alvo         | Chance |
|--------------|-------:|
| ≥ incomum    | 36,84% |
| ≥ raro       | 21,05% |
| ≥ épico      | 10,53% |
| ≥ lendário   | 5,26%  |
| = brotaria   | 1,05%  |

A mesma tabela é o gatilho da **mutação** (ver §7).

---

## 2. Bioma

10 biomas, uniforme → **10% cada**.

`planicie` · `floresta` · `deserto` · `montanha` · `pantano` · `oceano` · `vulcao`
· `tundra` · `selva` · `caverna`

---

## 3. Personalidade

36 personalidades, uniforme → **~2,78% cada**. É só um rótulo de "sabor" que
alimenta a descrição — **não** determina mais o perk inicial.

`feliz`, `misteriosa`, `perigosa`, `sombria`, `tranquila`, `agitada`, `sabia`,
`curiosa`, `raiva`, `medo`, `angustia`, `descolada`, `gotica`, `tropical`, `gelada`,
`cavernosa`, `cyber`, `carnivora`, `melancolica`, `radiante`, `selvagem`,
`ancestral`, `majestosa`, `brincalhona`, `timida`, `orgulhosa`, `mistica`,
`festiva`, `guerreira`, `sonhadora`, `rebelde`, `serena`, `noturna`, `faminta`,
`real`, `zen`.

---

## 4. Cor

**Hex 100% aleatório** para primário (corpo) e secundário (detalhes) — 16.777.216
possibilidades cada, ~2,8×10¹⁴ combinações. Praticamente única por planta. (A antiga
paleta nomeada de 8 cores foi aposentada; fica só como referência em `colors.ts`.)

---

## 5. Forma (DNAForm)

Campos categóricos uniformes:

| Campo | Opções | Chance cada |
|-------|--------|------------|
| `leaf_style` | 7 (rounded, pointed, heart, serrated, needle, fan, lobed) | **14,29%** |
| `leaf_density` | 3 (sparse, medium, dense) | **33,33%** |
| `stem_style` | 5 (straight, curvy, twisting, branching, none) | **20%** |
| `stem_thickness_grown` | 4 (thin, medium, thick, woody) | **25%** |
| `growth_pattern` | 5 (tall, bushy, vine, compact, spreading) | **20%** |

### Altura adulta (`max_height_cm`)
Inteiro **uniforme de 35 a 90 cm** (56 valores, ~1,79% cada, média ≈ 62,5 cm).
Independente de bioma e raridade.

### Flores, frutos e potencial de árvore

| Campo | Chance | Quando |
|-------|-------:|--------|
| `has_flowers` | **55%** | flores na fase adulta (média/grande) |
| `has_flowers_young` | **10%** | flores já na fase jovem/broto |
| `has_fruit` | **30%** | frutos (fase madura) |
| `tree_potential` | **17%** | potencial de virar árvore no porte grande (guardado p/ feature futura) |

`flower_color_hex` existe se `has_flowers` **ou** `has_flowers_young`; `fruit_color_hex`
existe se `has_fruit`. Ambos são hex aleatório.

Combinações de flor adulta × fruto:
| Resultado | Chance |
|-----------|-------:|
| Flores (adulta) **e** frutos | 16,5% |
| Só flores adultas | 38,5% |
| Só frutos | 13,5% |
| Nenhum | 31,5% |

---

## 6. Perks no plantio

Toda planta nasce com **1 perk garantido** (aleatório). Depois:
- **33%** de ganhar um **2º** perk;
- se o 2º saiu, **11%** de ganhar um **3º**.

Todos distintos (sem repetição). Quantidade de perks de nascença:

| Nº de perks | Chance |
|-------------|-------:|
| 1 | **67,00%** |
| 2 | **29,37%** (0,33 × 0,89) |
| 3 | **3,63%** (0,33 × 0,11) |

Número esperado de perks por planta = **1,3663**.

Catálogo de perks (9): `feliz`, `misteriosa`, `perigosa`, `sombria`, `cristalina`,
`luminosa`, `venenosa`, `angelical`, `flamejante`.

Como a escolha é uniforme e simétrica, cada perk específico aparece de nascença com
**~15,18%** (= 1,3663 / 9).

> **Sem humanização, tudo sólido:** os perks foram reescritos para descrever apenas
> pigmento/estrutura **sólida e opaca** (nada de rostos, olhos, brilho, aura, fumaça,
> partículas ou translucidez — ver §8).

---

## 7. Mutação (perks ganhos na evolução)

A cada **avanço de estágio**, rola-se a tabela de raridade de novo. Se o resultado
**não for `comum`**, a planta ganha **1 perk novo** (aleatório entre os que ainda não
tem). Perks nunca são removidos nem duplicados.

- **Chance de ganhar um perk por avanço de estágio: 36,84%** (= P(raridade ≠ comum)).
- **63,16%** dos avanços não adicionam perk.
- Teto: no máximo **9 perks** (tamanho do catálogo).
- A raridade **da planta não muda** na mutação — a raridade sorteada é só o gatilho.

### Parâmetros sorteados por perk
Cada perk, ao ser adquirido, sorteia seus params (afetam só o visual — todos sólidos):

| Perk | Parâmetros |
|------|-----------|
| `feliz` | `plump_leaves` 60% |
| `misteriosa` | `tangled` 70% |
| `perigosa` | `thorn_count` int 3–12 · `thorn_size` small/medium/large (33,3%) · `dark_leaf_tips` 60% |
| `sombria` | `palette_darkened` 80% · `black_edges` 60% |
| `cristalina` | `crystal_count` int 2–8 · `crystal_color_hex` aleatório |
| `luminosa` | `accent_color_hex` aleatório · `intensity` soft/bold (50%) |
| `venenosa` | `spot_count` int 3–14 · `spot_color_hex` aleatório |
| `angelical` | `pale` 70% · `extra_petals` 60% |
| `flamejante` | `flame_color_hex` aleatório · `fiery_gradient` 70% |

---

## 8. Regras de estilo (impacto na geração)

- **Nunca humanizar:** sem rostos, olhos, bocas ou expressões. Personalidade se
  expressa por postura, cor e forma botânica.
- **Só sólido/opaco:** proibido brilho, bioluminescência, aura, halo, fumaça, névoa,
  partículas flutuantes (brasas, faíscas, pólen), translucidez ou transparência
  parcial — tudo isso renderizava como blocos sólidos. O visual mágico vem de cor e
  estrutura sólidas dentro do contorno preto.
- **Fundo transparente** continua obrigatório; o que muda é que a **planta** deve ser
  100% opaca.

---

## 9. Números combinados (curiosidades)

Campos **categóricos** (excluindo cores aleatórias, altura, params de perk e o
conjunto de perks):

```
biome(10) × rarity(6) × personality(36) × leaf_style(7) × leaf_density(3)
  × stem_style(5) × stem_thickness(4) × growth_pattern(5)
  × has_flowers(2) × has_flowers_young(2) × has_fruit(2) × tree_potential(2)
  =  72.576.000
```

Somando cores hex aleatórias (~2,8×10¹⁴), altura (56 valores) e o conjunto de perks
(1–3 de 9), o espaço real é **efetivamente infinito** — cada planta é única.

Chances notáveis de uma planta recém-plantada:
- Nascer **brotaria**: **1,05%**.
- Nascer **lendária ou melhor**: **5,26%**.
- Nascer com **3 perks**: **3,63%**.
- Nascer com um perk específico (ex.: `flamejante`): **~15,18%**.
- Ter **potencial de árvore**: **17%**.
- Ter **flores já na fase jovem**: **10%**.
