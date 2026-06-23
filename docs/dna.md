# DNA da Planta

## Princípio

O DNA é a fonte de verdade absoluta da planta.

A IA nunca altera o DNA.

A IA nunca deriva o DNA de uma imagem.

A imagem sempre deve ser derivada do DNA.

---

## Estrutura

O DNA é armazenado em JSON na coluna `dna` da tabela `plants`.

```json
{
  "biome": "planicie",
  "rarity": "comum",
  "personality": "feliz",
  "color": {
    "name": "Verde Vivo",
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
    "flower_color_hex": "#FFD700",
    "has_fruit": false,
    "fruit_color_hex": null
  },
  "traits": [
    { "name": "perigosa", "params": { "thorn_size": 3 } }
  ]
}
```

---

## Biomas

- `planicie`
- `floresta`
- `deserto`
- `montanha`
- `pantano`

---

## Raridade

| Raridade   | Chance ao plantar |
|------------|-------------------|
| `comum`    | 80%               |
| `incomum`  | 15%               |
| `raro`     | 4%                |
| `lendario` | 1%                |

---

## Forma (DNAForm)

Campos imutáveis definidos na geração da semente:

| Campo                  | Tipo     | Valores possíveis                                          |
|------------------------|----------|------------------------------------------------------------|
| `leaf_style`           | enum     | rounded, pointed, heart, serrated, needle, fan, lobed      |
| `leaf_density`         | enum     | sparse, medium, dense                                      |
| `stem_style`           | enum     | straight, curvy, twisting, branching, none                 |
| `stem_thickness_grown` | enum     | thin, medium, thick, woody                                 |
| `growth_pattern`       | enum     | tall, bushy, vine, compact, spreading                      |
| `max_height_cm`        | int      | altura adulta final (randomizada por bioma/raridade)       |
| `has_flowers`          | bool     | —                                                          |
| `flower_color_hex`     | string?  | hex, presente se has_flowers = true                        |
| `has_fruit`            | bool     | —                                                          |
| `fruit_color_hex`      | string?  | hex, presente se has_fruit = true                          |

---

## Traits

Traits representam características visuais que a planta pode adquirir.

Cada trait tem:
- `name` — identificador
- `params` — parâmetros sorteados na aquisição (ex.: tamanho dos espinhos)
- `render(params, growthFraction)` — função que descreve o trait em prosa para o LLM

Exemplos de traits:

| Nome       | Efeitos visuais                    |
|------------|------------------------------------|
| perigosa   | espinhos, pontas escuras nas folhas |
| angelical  | brilho suave, pétalas claras        |
| cristalina | reflexos translúcidos               |
| luminosa   | bioluminescência, aura suave        |
| flamejante | pontas de folha alaranjadas/vermelhas |
| venenosa   | pigmentação roxa/verde-neon         |
| sombria    | folhas escuras, aura sombria        |
| misteriosa | detalhes etéreos, névoa leve        |

A IA nunca inventa efeitos visuais. Ela apenas utiliza os efeitos definidos nos traits.

---

## Mutações

Ao avançar de estágio existe chance de mutação.

Tabela de chance por raridade resultante:

| Raridade   | Chance  |
|------------|---------|
| `comum`    | 80%     |
| `incomum`  | 15%     |
| `raro`     | 4%      |
| `lendario` | 1%      |

Mutações **adicionam** novos traits ao DNA. Nunca substituem.

Exemplo:

```json
// Antes
{ "traits": [{ "name": "feliz", "params": {} }] }

// Depois
{
  "traits": [
    { "name": "feliz", "params": {} },
    { "name": "perigosa", "params": { "thorn_size": 2 } }
  ]
}
```

Regra absoluta:

```
Adicionar ≠ Substituir
```

Características existentes nunca desaparecem.
