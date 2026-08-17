# Perks por raridade + arquétipos de planta — esquema

**Status:** proposta para revisão. Nada implementado ainda.
**Revisão 2** — incorpora as decisões tomadas e responde à pergunta da samambaia.

---

## Decisões já tomadas

| Ponto | Decisão |
|---|---|
| Travar `cristalina`/`flamejante` retroativamente | **Não.** Plantas antigas com cristal continuam como estão |
| Garantia de marca no topo | **Não.** Segue por chance |
| `marca_do_bioma` | **10%** das lendárias+, e só a partir do estágio **jovem** |
| `cipos` | Só a partir do estágio **jovem** |

---

## 1. Como funciona hoje

Catálogo em `src/config/genome/traits.ts`: **9 perks**, cada um com `params` sorteados no plantio e um `render(params, f)` que descreve o perk em inglês, escalando pela fração de crescimento.

Sorteio igual para todos (`dnaService.rollInitialTraits`):

> 1 perk garantido · **33%** de um 2º · se veio o 2º, **11%** de um 3º

**Não existe trava por raridade** — e `cristalina` e `flamejante` já nascem em planta comum por isso.

---

## 2. O mecanismo de trava

Campos novos no `TraitDef`:

```ts
minRarity?: Rarity;      // pool só inclui o perk se a planta for >= isso
minStageOrder?: number;  // render fica em silêncio antes deste estágio
independentChance?: number; // sorteio próprio, fora do pool (marca_do_bioma)
```

> Usei `minStageOrder` em vez de "fração de crescimento" porque "jovem pra cima" é um estágio exato (order ≥ 8 no ciclo Semente 1 · Broto 2–4 · Muda 5–7 · **Jovem 8–10** · Adulta 11–13). Fração seria aproximação.

**Contagem de perks escalando com a raridade** (hoje é fixa):

| Raridade | Perks | Pool |
|---|---|---|
| comum | 1 · **20%** de um 2º | 7 |
| incomum | 1 · **35%** de um 2º | 7 |
| raro | 2 · **25%** de um 3º | 12 |
| épico | 2 · **45%** de um 3º | 16 |
| lendário | 3 · **35%** de um 4º | 17 |
| brotaria | 3 · **60%** de um 4º | 17 |

> `mutateDNA` também adiciona perk ao evoluir — precisa respeitar a mesma trava, senão uma rara ganha perk lendário pela porta dos fundos.

---

## 3. Catálogo proposto

**Sem trava (7)** — os atuais: `feliz`, `misteriosa`, `sombria`, `luminosa`, `angelical`, `venenosa`, `perigosa`.

### A partir de RARO (5)

| Perk | O que faz | Params |
|---|---|---|
| `caule_retorcido` | Caule dramaticamente curvo ou em espiral fechada | `twist`: leve/médio/fechada |
| `folhas_espiral` | Folhas enroladas, curtas ou muito retorcidas | `curl` · `count` 2–8 |
| `folhas_peludas` | Penugem visível nas folhas e no caule | `density` · `on_stem` |
| `folhagem_atipica` | Formato fora do vocabulário comum | `shape`: enum de 5 |
| `flamejante` ⚠️ | já existe — passa a ser travado aqui | (mantém) |

### A partir de ÉPICO (4)

| Perk | O que faz | Params |
|---|---|---|
| `caule_duplo` | Dois caules principais desde a base | `symmetry` · `entwined` |
| `folhas_degrade` | Cor em degradê entre duas matizes | `from_hex`, `to_hex` · `direction` |
| `carnivora` | Jarros, folhas-mandíbula, cerdas | `trap` · `count` 1–5 |
| `cipos` 🌿 | Cipós pendendo — **`minStageOrder: 8`** | `count` 2–6 · `length` |

### A partir de LENDÁRIO (2)

| Perk | O que faz | Regra |
|---|---|---|
| `cristalina` ⚠️ | já existe — passa a ser travado aqui | no pool |
| `marca_do_bioma` | Marca rara do bioma | **fora do pool**: 10% · `minStageOrder: 8` |

#### `marca_do_bioma` — um perk, dez leituras

| Bioma | Marca | Bioma | Marca |
|---|---|---|---|
| tundra | Espinhos de gelo | floresta | Toca de inseto num nó |
| vulcao | Labaredas na base | selva | Musgo escalando o caule |
| montanha | Rochas incrustadas | oceano | Incrustações de coral |
| deserto | Areia cristalizada | caverna | Fungos (pigmento sólido, nunca luz) |
| pantano | Poucos fungos na base | planicie | Espigas secas presas |

> Exige o `render` receber o bioma — hoje só recebe `(params, f)`. É a única mudança estrutural fora do catálogo.

---

## 4. Probabilidades reais

Raridade (pesos sobre 95): comum 63,2% · incomum 15,8% · raro 10,5% · épico 5,3% · lendário 4,2% · brotaria 1,1%.

Chance de **um perk específico** numa planta nova:

| Tier | Chance | Na prática |
|---|---|---|
| Sem trava | **~17,7%** | ~1 em 6 |
| Raro+ | **~3,8%** | ~1 em 26 |
| Épico+ | **~1,9%** | ~1 em 53 |
| Lendário+ (`cristalina`) | **~1,1%** | ~1 em 95 |
| `marca_do_bioma` | **~0,53%** | **~1 em 190** |

E por dentro do topo: uma planta **lendária** tem **~28%** de chance de exibir alguma marca lendária (cristal ou marca de bioma). Você optou por não garantir — fica registrado que ~7 em 10 lendárias não vão mostrar nada do tier máximo.

---

## 5. Samambaia — por que você não chega nela hoje

Você não chega **e não é questão de perk**. O prompt descreve a planta assim:

```
- Leaf style: <um formato simples>, density: <...>
- Stem style: <...>, adult thickness: <...>
- Growth pattern: <...>, adult height: ~Ncm
- Flowers at this stage: <sim/não> | Fruit: <sim/não>
```

Quatro bloqueios estruturais:

1. **Toda folha é simples.** `LEAF_STYLES` só tem lâminas únicas (`rounded`, `pointed`, `heart`, `serrated`, `needle`, `fan`, `lobed`). Uma fronde de samambaia é **composta** — dezenas de folíolos num ráquis. Não há como dizer isso.
2. **Toda planta tem caule.** Existe `stem_style: 'none'`, mas nenhum padrão de crescimento em **roseta**, onde as frondes brotam direto da base sem caule central.
3. **Flor é sorteada solta.** `has_flowers` tem 55% de chance, independente de tudo. Samambaia **não floresce** — reproduz por esporo. Hoje sairia uma samambaia com flores.
4. **Não existe báculo.** A fronde jovem enrolada em espiral (*fiddlehead*) é a assinatura da samambaia.

**Samambaia não é ornamento — é plano corporal.** Perk é o que você pendura por cima; samambaia define o corpo inteiro. Tentar fazer via perk daria uma planta comum com "folhas de samambaia grudadas".

### A proposta: eixo de ARQUÉTIPO na forma

Um campo novo em `dna.form`, sorteado no plantio e **independente da raridade** — tipo de planta não é prêmio, é variedade. Cada arquétipo fixa ou enviesa os outros eixos:

| Arquétipo | Arquitetura da folha | Caule | Crescimento | Reprodução |
|---|---|---|---|---|
| `erva` (padrão) | simples | qualquer | qualquer | flor |
| `samambaia` | **pinada / bipinada** | nenhum | **roseta** | **esporo** |
| `palmeira` | **palmada** | único, grosso | alto | flor rara |
| `suculenta` | carnuda | nenhum | roseta/compacta | flor rara |
| `graminea` | **linear (fita)** | nenhum | **tufo** | espiga |
| `trepadeira` | simples | trepante | vinha | flor |
| `arbusto` | simples | ramificado lenhoso | arbustivo | flor |
| `musgo` | **escamiforme** | nenhum | **tapete** | esporo |

Isso exige **dois eixos novos** e **um ajuste**:

- `leaf_architecture`: `simple | pinnate | bipinnate | palmate | linear | scale | succulent`
- `growth_habit` ganha: `rosette`, `tuft`, `mat`
- `reproduction`: `flower | spore | cone` — **substitui o sorteio solto de flor**; esporo nunca floresce

### O bônus: o báculo cai de graça

Você já pediu `folhas_espiral` ("curtos ou muito retorcidos"). Num arquétipo `samambaia`, esse mesmo perk **vira o báculo** — a fronde enrolada. Um perk, duas leituras, conforme o corpo. É o mesmo truque do `marca_do_bioma`.

### Distribuição sugerida dos arquétipos

| Arquétipo | Peso |
|---|---|
| `erva` | 40% |
| `arbusto` | 15% |
| `suculenta` | 10% |
| `samambaia` | 10% |
| `trepadeira` | 10% |
| `graminea` | 8% |
| `palmeira` | 5% |
| `musgo` | 2% |

Uniforme deixaria o jardim estranho (musgo demais). `erva` continua maioria para o jogo não mudar de cara de repente.

---

## 6. O que eu ainda perguntaria

1. **Arquétipo é retroativo?** Plantas existentes não têm o campo. Proposta: quem não tem lê como `erva` — nada muda para elas.
2. **A distribuição acima te agrada?** É o número que mais muda a cara do jardim.
3. **Arquétipos exóticos por raridade?** Poderia travar `palmeira`/`musgo` em raro+, mas isso conflita com "cobrir todos os tipos" — minha recomendação é deixar todos abertos.

---

## 7. O que muda no código

| Arquivo | Mudança |
|---|---|
| `src/types/index.ts` | `TraitDef` ganha `minRarity`/`minStageOrder`/`independentChance`; `DNAForm` ganha `archetype`, `leaf_architecture`, `reproduction`; `render` recebe o bioma |
| `src/config/genome/traits.ts` | 11 perks novos + trava em `cristalina`/`flamejante` |
| `src/config/genome/forms.ts` | Tabela de arquétipos e os vocabulários novos |
| `src/config/genome/index.ts` | Contagem de perks por raridade |
| `src/services/dnaService.ts` | `rollInitialTraits(rarity)`; arquétipo no `randomForm`; `mutateDNA` respeita a trava |
| `src/services/aiService.ts` | Prompt descreve arquétipo, arquitetura de folha e reprodução |

Nenhuma migração: o DNA é JSON, e planta antiga sem `archetype` lê como `erva`.
