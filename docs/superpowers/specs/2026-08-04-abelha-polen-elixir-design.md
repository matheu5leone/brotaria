# Abelha, Pólen e Elixir Floral

**Data:** 2026-08-04
**Status:** Design — aguardando revisão.
**Telas afetadas:** jardim próprio (`Garden.tsx`), mochila (inventário).

---

## 1. A cadeia

Três peças que formam um loop só:

```
abelha pousa  →  clica  →  +1 pólen (mochila, stack 20)
                                   ↓
                        20 pólen  →  1 Elixir Floral
                                   ↓
                 usa numa planta  →  reroll da sede (intervalo de rega)
```

**Por que retém:** o pólen recompensa **presença** (estar com o jardim aberto quando a abelha aparece), e o elixir dá ao jogador uma alavanca sobre a mecânica mais frustrante do jogo — a planta que pede água a cada 12h.

---

## 2. A abelha

### Ritmo (server-authoritative)

- O servidor guarda `profiles.bee_next_at`. Quando `now >= bee_next_at`, **há uma abelha disponível**.
- Ao coletar (ou perder) a abelha, o próximo horário é **re-sorteado aleatoriamente entre 1h e 3h**.

### Quando ela aparece

A abelha **surge quando o jogador abre/está no próprio jardim** e o cooldown já venceu — não num instante absoluto do relógio.

> **Decisão de design (importante).** Com cooldown de 1–3h e janela de 1 minuto, um horário absoluto tornaria a abelha praticamente inalcançável: o jogador teria que estar olhando naquele minuto exato. Ancorar o surgimento na presença é o que faz a mecânica recompensar presença de verdade, mantendo o cooldown como controle de ritmo.

### Comportamento

1. A abelha **entra voando** pela borda da tela.
2. Fica **ativa por 20 minutos**, **pousando nas plantas** — pousa numa, descansa, voa até outra, e assim por diante.
3. Se o jogador **clicar nela pousada** → ganha **1 pólen** (com feedback visual voando até a mochila).
4. Passados os 20 minutos, ela **voa para o canto e vai embora**; a chance é **perdida** e o servidor re-sorteia o próximo horário.

A janela de 20 min é **rastreada no servidor** (`bee_spawned_at`), então sair e voltar ao jardim não reinicia nem duplica a abelha — ela continua de onde estava.

### Assets

`public/imgs/abelha.webp` — **WebP animado** de 2 frames (asa para cima / para baixo), 256×256, ~21KB, gerado dos PNGs originais.

> **Por que WebP e não GIF:** a abelha tem asas translúcidas e glow suave. O GIF só suporta alfa de **1 bit** (medido: 2 níveis, 0 semitransparentes) e serrilharia essas bordas sobre o verde do jardim. O WebP animado preserva **254 níveis** de alfa pelo mesmo peso. Existe um `abelha.gif` gerado para comparação, mas o código usa o `.webp`.

### Anti-trapaça

A abelha é visual no cliente; o pólen é concedido **só pelo servidor**, que valida `now >= bee_next_at`. Forjar cliques não acelera nada: o teto é o cooldown. No pior caso o trapaceiro coleta o mesmo 1 pólen por janela que todo mundo.

### Escopo

Só no **jardim próprio**. Não aparece em jardins visitados nem em outras telas.

---

## 3. Pólen (item de mochila)

- `item_type = 'polen'`, empilha até **20 por slot**.
- **Achado:** `inventory_items.item_type` é `text` livre, **sem constraint** — não precisa migração de tipo. Mas o teto de stack está **fixo em 10** no `inventoryService` (`.lt('quantity', 10)`); vira **teto por tipo** (pólen 20, demais 10).
- Inventário tem **10 slots** no total; 20 pólen = exatamente 1 slot cheio = 1 elixir.

---

## 4. Elixir Floral

**Nome:** "Elixir Floral" (o usuário chamou de fertilizante, mas o item não faz crescer — ele *reroda o destino*, então elixir descreve melhor).

- **Receita:** 20 pólen → 1 elixir.
- **Onde se transforma:** na própria mochila — tocar num stack **cheio** (20) de pólen oferece *"Transformar em Elixir Floral"*. Não exige tela nova.
- **Não empilhável:** cada elixir ocupa **1 slot** dos 10.

### Efeito: reroll da sede

- Reroda o **`plants.water_period_ms`** (o intervalo com que a planta pede água) usando **a mesma faixa do plantio**: `randInt(5h, 12h)` com granularidade de minuto.
- **Não** mexe nas regas por sub-passo (`plant_sede.waters`) — só no intervalo.

> **Por que isso é economicamente seguro:** o elixir só produz valores que o jogo **já gera naturalmente no plantio**. Não existe superfície econômica nova, e o custo de IA não muda. Além disso o item se auto-balanceia: o valor esperado do reroll é ~8h30, então usar numa planta de 12h costuma valer a pena e numa de 5h costuma piorar. O jogador só quer usá-lo onde havia frustração.

### O cronômetro atual

`next_water_needed_at = last_watered_at + novo_período` — **preserva o tempo já corrido**, não reseta. Se já passou mais tempo que o novo período, a planta fica pedindo água na hora.

---

## 5. Animação do elixir

Ao usar o elixir numa planta:

1. A tela **escurece**.
2. **Folhas caem** ao fundo — reaproveitar o componente `FallingLeaves.tsx` (o mesmo do login).
3. Um **cronômetro/roleta** gira com números aleatórios até parar no **novo intervalo de sede**.
4. Botão **OK** para confirmar e fechar.

### Som (preparação)

O projeto **não tem camada de áudio** hoje — nenhum `<audio>`, nenhuma lib. Para não travar a animação nem exigir refatoração depois, entra um **gancho** `playSfx('drumroll')` que hoje é **no-op**. Quando a sonoplastia chegar, basta implementar o `playSfx` num lugar só e o rufar de tambores toca sem tocar neste componente.

---

## 6. Data model

```sql
alter table public.profiles
  -- Quando a próxima abelha pode aparecer (re-sorteado a cada evento).
  add column if not exists bee_next_at    timestamptz,
  -- Quando a abelha atual apareceu; janela ativa = +20min. Null = sem abelha.
  add column if not exists bee_spawned_at timestamptz;
```

Pólen e elixir **não precisam de migração**: `inventory_items.item_type` é texto livre.

`bee_next_at` nulo = abelha disponível na primeira visita ao jardim.

---

## 7. Backend

Novo `src/services/beeService.ts` + rotas, no padrão server-authoritative de `gnomeService`/`neighborService`.

| Rota | Efeito |
|---|---|
| `GET /api/bee/status` | Deriva o estado (com expiração preguiçosa da janela de 20 min) e, se o cooldown venceu, **marca o spawn**. Retorna `{ active, remainingMs }` |
| `POST /api/bee/claim` | Valida a janela ativa → +1 pólen na mochila → limpa o spawn e re-sorteia `bee_next_at` em 1–3h. Erros: `NO_BEE`, `INVENTORY_FULL` |
| `POST /api/inventory/craft-elixir` | 20 pólen → 1 elixir. Erros: `NOT_ENOUGH_POLEN`, `INVENTORY_FULL` |
| `POST /api/plants/use-elixir` | Consome 1 elixir → reroll de `water_period_ms` + recálculo de `next_water_needed_at`. Retorna o novo período para a animação. Erros: `NO_ELIXIR`, `PLANT_NOT_FOUND`, `NOT_OWNER` |

Todas com compare-and-swap, como as demais mecânicas.

---

## 8. Config (`economy.ts`)

```ts
/** Minutos que a abelha fica ativa no jardim antes de ir embora. */
BEE_ACTIVE_MINUTES:    20,
/** Segundos que ela fica pousada numa planta antes de voar para outra. */
BEE_HOP_SECONDS:       30,
/** Faixa (horas) do sorteio do próximo aparecimento da abelha. */
BEE_MIN_HOURS:         1,
BEE_MAX_HOURS:         3,
/** Pólen por abelha coletada. */
BEE_POLEN_PER_CLAIM:   1,
/** Pólen necessário para 1 Elixir Floral. */
ELIXIR_POLEN_COST:     20,
/** Teto de stack por tipo de item (o resto usa 10). */
STACK_MAX_BY_TYPE:     { polen: 20 },
```

---

## 9. Fora de escopo

- Abelha em jardins visitados ou em outras telas.
- Camada de áudio real (só o gancho).
- Outros usos do pólen (polinização cruzada, mel, cosméticos) — ficam para depois.
- Sprite animada da abelha (protótipo usa emoji 🐝 até a arte chegar).

---

## 10. Riscos

| Risco | Mitigação |
|---|---|
| Forjar cliques na abelha | Concessão só no servidor, validando `bee_next_at` |
| Elixir acelerar custo de IA | Reroll fica na faixa 5–12h que o plantio já usa; é aposta, não buff |
| Elixir entupir a mochila (10 slots) | Item é caro (20 pólen ≈ dias) e pensado para uso imediato; monitorar |
| Jogador perder a abelha por distração | Janela de 1 min é generosa; o próximo vem em 1–3h |

---

## 11. Verificação

Sem framework de teste — verificação ao vivo (dev server + `curl` com JWT + SQL via MCP):

- `claim` fora da janela → `NO_BEE`, sem pólen.
- `claim` na janela → +1 pólen, `bee_next_at` re-sorteado dentro de 1–3h.
- Pólen empilha até 20 num slot; o 21º abre outro slot.
- `craft-elixir` com 19 pólen → `NOT_ENOUGH_POLEN`; com 20 → consome os 20 e cria 1 elixir ocupando 1 slot.
- Dois elixires → 2 slots distintos (não empilham).
- `use-elixir`: `water_period_ms` muda para um valor em [5h,12h]; `next_water_needed_at` = `last_watered_at + novo período`; o elixir some da mochila.
- `use-elixir` em planta de outro dono → `NOT_OWNER`.
