# DNA da Planta

## Princípio

O DNA é a fonte de verdade absoluta da planta.

A IA nunca altera o DNA.

A IA nunca deriva o DNA de uma imagem.

A imagem sempre deve ser derivada do DNA.

> Números exatos de probabilidade de cada campo vivem em
> **[relatorio-dna.md](relatorio-dna.md)**. Este documento descreve a estrutura e as
> regras; o relatório traz as chances.

---

## Estrutura

O DNA é armazenado em JSON na coluna `dna` da tabela `plants`.

```json
{
  "biome": "planicie",
  "rarity": "comum",
  "personality": "sonhadora",
  "color": {
    "name": "personalizada",
    "primary_hex": "#4CAF50",
    "secondary_hex": "#81C784"
  },
  "form": {
    "leaf_style": "rounded",
    "leaf_density": "medium",
    "stem_style": "straight",
    "stem_thickness_grown": "medium",
    "growth_pattern": "bushy",
    "max_height_cm": 45,
    "has_flowers": true,
    "has_flowers_young": false,
    "flower_color_hex": "#FFD700",
    "has_fruit": false,
    "fruit_color_hex": null,
    "tree_potential": false
  },
  "traits": [
    { "name": "perigosa", "params": { "thorn_count": 7, "thorn_size": "medium", "dark_leaf_tips": true } }
  ]
}
```

Fonte no código: `src/services/dnaService.ts` (geração) + `src/config/genome/*`
(catálogos). Adicionar valores a esses catálogos amplia o vocabulário sem outras
mudanças.

---

## Biomas

10 biomas, sorteados uniformemente (10% cada):

- `planicie`
- `floresta`
- `deserto`
- `montanha`
- `pantano`
- `oceano`
- `vulcao`
- `tundra`
- `selva`
- `caverna`

---

## Personalidade

36 personalidades (uniforme). É um rótulo de "sabor" que alimenta a descrição — **não**
determina o perk inicial (perks são aleatórios, ver abaixo). Exemplos: `feliz`,
`sombria`, `raiva`, `medo`, `gotica`, `tropical`, `gelada`, `cyber`, `carnivora`,
`melancolica`, `ancestral`, `noturna`, `zen`… (lista completa em `dnaService.ts`).

---

## Cor

Primário (corpo) e secundário (detalhes) são **hex 100% aleatório** — cada planta tem
uma combinação praticamente única. O campo `name` é sempre `"personalizada"`. (A paleta
nomeada antiga permanece em `colors.ts` apenas como referência.)

---

## Raridade

6 níveis, pesos somando 95:

| Raridade   | Peso | Chance ao plantar |
|------------|-----:|-------------------|
| `comum`    |  60  | 63,16%            |
| `incomum`  |  15  | 15,79%            |
| `raro`     |  10  | 10,53%            |
| `epico`    |   5  | 5,26%             |
| `lendario` |   4  | 4,21%             |
| `brotaria` |   1  | 1,05%             |

---

## Forma (DNAForm)

Campos imutáveis definidos na geração da semente:

| Campo                  | Tipo     | Valores / regra                                            |
|------------------------|----------|------------------------------------------------------------|
| `leaf_style`           | enum     | rounded, pointed, heart, serrated, needle, fan, lobed      |
| `leaf_density`         | enum     | sparse, medium, dense                                      |
| `stem_style`           | enum     | straight, curvy, twisting, branching, none                 |
| `stem_thickness_grown` | enum     | thin, medium, thick, woody                                 |
| `growth_pattern`       | enum     | tall, bushy, vine, compact, spreading                      |
| `max_height_cm`        | int      | altura adulta, **uniforme 35–90 cm** (independente de bioma/raridade) |
| `has_flowers`          | bool     | 55% — flores na fase adulta (média/grande)                 |
| `has_flowers_young`    | bool     | 10% — flores já na fase jovem/broto                        |
| `flower_color_hex`     | string?  | hex, presente se `has_flowers` **ou** `has_flowers_young`  |
| `has_fruit`            | bool     | 30%                                                        |
| `fruit_color_hex`      | string?  | hex, presente se `has_fruit`                               |
| `tree_potential`       | bool     | 17% — potencial de virar árvore no porte grande (ver abaixo) |

### Potencial de árvore (`tree_potential`)

Rolado no plantio (17%) e **guardado no DNA** para uma feature futura ainda não
implementada: quando a planta atingir o porte grande, esta flag decidirá se ela pode
evoluir para uma árvore. Por ora só é armazenada.

---

## Traits (perks)

Traits representam características visuais que a planta pode adquirir.

Cada trait tem:
- `name` — identificador
- `params` — parâmetros sorteados na aquisição (ex.: quantidade de espinhos)
- `render(params, growthFraction)` — descreve o trait em prosa para o LLM

Catálogo (9 perks), em `src/config/genome/traits.ts`:

| Nome       | Efeito visual (sólido) |
|------------|------------------------|
| feliz      | cor viva e saturada, postura ereta e sadia |
| misteriosa | folhagem escura densa, silhueta intrincada e secreta |
| perigosa   | espinhos sólidos no caule, pontas de folha escurecidas |
| sombria    | paleta escurecida e dessaturada, bordas de folha pretas |
| cristalina | cristais facetados sólidos e opacos brotando da planta |
| luminosa   | marcações de cor viva e sólida pintadas nas folhas |
| venenosa   | manchas tóxicas sólidas coloridas nas folhas |
| angelical  | folhagem clara e pálida, pétalas extras claras |
| flamejante | pontas de folha em cor de fogo (vermelho-laranja) sólida |

### Perks no plantio

Toda planta nasce com **1 perk garantido** (aleatório). Depois: **33%** de um 2º; se o
2º saiu, **11%** de um 3º. Todos distintos. (Distribuição: 1 perk 67%, 2 perks 29,37%,
3 perks 3,63%.)

### Regras de estilo (absolutas)

A IA nunca inventa efeitos visuais — usa apenas o que os traits definem. Além disso:

- **Nunca humanizar:** sem rostos, olhos, bocas ou expressões. Personalidade se mostra
  por postura, cor e forma.
- **Só sólido/opaco:** proibido brilho, bioluminescência, aura, halo, fumaça, névoa,
  partículas flutuantes (brasas, faíscas, pólen), translucidez ou transparência
  parcial. Esses efeitos renderizam como blocos sólidos, então o visual mágico deve vir
  de cor e estrutura sólidas dentro do contorno preto. (O **fundo** continua
  transparente; a **planta** é 100% opaca.)

---

## Mutações

A cada **avanço de estágio** existe chance de mutação. Rola-se a tabela de raridade; se
o resultado **não for `comum`** (36,84%), a planta **ganha 1 perk novo** (aleatório
entre os que ainda não tem).

- A mutação **adiciona** perks; nunca substitui nem remove.
- A raridade **da planta não muda** — a raridade sorteada é só o gatilho.
- Teto: no máximo 9 perks (tamanho do catálogo).

Exemplo:

```json
// Antes
{ "traits": [{ "name": "sombria", "params": { "palette_darkened": true, "black_edges": false } }] }

// Depois (mutação adicionou 'perigosa')
{
  "traits": [
    { "name": "sombria", "params": { "palette_darkened": true, "black_edges": false } },
    { "name": "perigosa", "params": { "thorn_count": 5, "thorn_size": "small", "dark_leaf_tips": true } }
  ]
}
```

Regra absoluta:

```
Adicionar ≠ Substituir
```

Características existentes nunca desaparecem.
