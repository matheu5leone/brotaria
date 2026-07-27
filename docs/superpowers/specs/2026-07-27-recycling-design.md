# Reciclagem de plantas — design

**Data:** 2026-07-27
**Objetivo:** juntar **3 plantas da mesma raridade** (qualquer estágio) para forjar
**1 semente da raridade imediatamente superior**. Essa semente vira um item de
inventário próprio (stack separado por raridade, sprite com a raridade explícita) e,
ao ser plantada, **garante no mínimo aquela raridade**, mantendo as chances normais
para raridades ainda maiores.

---

## 1. Regras (do pedido)

- **Entrada:** 3 plantas do mesmo tier de raridade, **independente do estágio**.
- **Saída:** 1 semente do **próximo tier** (ex.: 3 incomuns → 1 semente rara).
- **Sprite:** a mesma `seed.webp`, mas com **partículas/efeito da raridade** para
  diferenciar (reusa `RarityEffect`).
- **Inventário:** a semente de raridade **não** empilha com a semente genérica; cada
  raridade tem seu **próprio stack**.
- **Plantio:** raridade da planta = **piso garantido** = raridade da semente; rola a
  tabela normal de raridade e **eleva ao piso** se cair abaixo (chances de raridades
  maiores permanecem idênticas).

---

## 2. Escada de raridade

`comum → incomum → raro → epico → lendario → brotaria`

- `nextRarity(r)` devolve o próximo tier; **`brotaria` é o topo e não recicla**
  (não há tier acima).
- Config nova em `src/config/rarity.ts` (ou dentro de `scoring.ts`, que já tem
  `RARITY_WEIGHTS`): `RARITY_ORDER: Rarity[]`, `nextRarity(r): Rarity | null`,
  `rarityRank(r): number`.

---

## 3. Modelo de dados

Hoje `inventory_items` empilha semente só por `item_type = 'seed'` (sem raridade).
Para stacks separados por raridade:

- **Migration** (aplicar via MCP Supabase + salvar em `supabase/migrations/`, ver
  [[migrations-manual]]): adicionar coluna `rarity text null` em `inventory_items`
  (null = semente genérica). Índice em `(user_id, item_type, rarity)`.
- **Stacking:** a chave de empilhamento passa a ser `(item_type, rarity)`. `seed`
  com `rarity = null` (genérica) e `seed` com `rarity = 'raro'` são stacks distintos,
  cada um no seu `slot_index`.
- `inventoryService.addStackableItem` e `findStackableSlot` ganham um parâmetro
  `rarity?: Rarity | null` e passam a casar por raridade também.

> Sem mudança na RPC de compra da loja: a semente comprada continua genérica
> (`rarity = null`).

---

## 4. Geração com piso de raridade

`generateRandomDNA(minRarity?: Rarity)`:
- Rola `calculateRarity()` normalmente.
- `rarity = rank(rolled) >= rank(minRarity) ? rolled : minRarity` (eleva ao piso).
- Efeito: uma semente `raro` nunca gera abaixo de raro, mas épico/lendário/brotaria
  mantêm exatamente as mesmas chances de sempre.

`plantSeed(userId, potId, seedRarity?: Rarity | null)`:
- Seleciona o stack de semente com aquela `rarity` (ou genérica se `null`); erro
  `NO_SEEDS` se não houver.
- Decrementa esse stack específico (remove o slot se zerar).
- Chama `generateRandomDNA(seedRarity ?? undefined)`.

---

## 5. Backend — reciclar

- **RPC atômica** `recycle_plants(p_user_id uuid, p_plant_ids uuid[])`:
  1. Valida: exatamente 3 ids, todos do usuário, todos existem, **mesma raridade**
     (lida de `plants.dna->>'rarity'`), e essa raridade **não é brotaria**.
  2. Deleta as 3 plantas e **esvazia os canteiros** (`pots.plant_id = null`; o
     canteiro continua existindo).
  3. Insere/empilha 1 `inventory_items` (`item_type='seed'`, `rarity = nextRarity`).
     Se o inventário estiver cheio, aborta com `INVENTORY_FULL` (nada é consumido).
  - Exceções: `INVALID_SET`, `MIXED_RARITY`, `TOP_RARITY`, `INVENTORY_FULL`.
- **API** `POST /api/plants/recycle` `{ plantIds: string[3] }` → `{ ok, seedRarity }`.
- **Serviço** `recycleService.recyclePlants(userId, plantIds)`.

---

## 6. Plantio por raridade (wiring)

- `POST /api/plants/plant` aceita `{ potId, seedRarity?: Rarity | null }`.
- `plantSeed` consome o stack certo e passa o piso.
- No cliente, arrastar um **stack específico** de semente define qual `seedRarity`
  vai no plantio (a semente genérica manda `null`).

---

## 7. UI

### Sprite da semente (raridade explícita)
Componente `SeedIcon({ rarity }) `: `seed.webp` embrulhado em `RarityEffect` com a cor
do tier (mesmo efeito das plantas). `rarity = null` → semente genérica (sem efeito).

### Inventário (`InventoryPanel`)
- Renderiza um item por stack: genérica + um por raridade reciclada, cada um com
  `SeedIcon` + contagem. Cada stack é arrastável e carrega sua `rarity` no plantio.

### Reciclagem (modo no `PlantsGridModal`)
O grid já lista todas as plantas com raridade — adicionar um **modo "Reciclar"**:
- Botão "Reciclar" alterna o modo de seleção.
- Ao tocar uma planta, entra na seleção; só permite plantas da **mesma raridade** da
  primeira escolhida (as de raridade diferente ficam esmaecidas/bloqueadas).
- Plantas `brotaria` ficam bloqueadas (topo).
- Ao selecionar **3**, habilita "Reciclar em semente {próxima raridade}"; confirma →
  `recycle` mutation → toast "+1 semente {raridade}" e o grid atualiza (as 3 somem).
- Feedback: reaproveitar animações existentes (partículas/`count-pop`); a semente
  nova aparece no inventário com `SeedIcon` da raridade.

---

## 8. Fases

- **Fase 1 (dados + backend):** migration (`rarity` em `inventory_items`); config de
  escada (`nextRarity`/`rarityRank`); `generateRandomDNA(minRarity)`;
  `plantSeed(seedRarity)`; `addStackableItem(rarity)`; RPC `recycle_plants` +
  `/api/plants/recycle` + `recycleService`; API de plantio aceitando `seedRarity`.
  Sem UI ainda — testável por SQL/HTTP.
- **Fase 2 (UI):** `SeedIcon` com `RarityEffect`; stacks por raridade no
  `InventoryPanel` + plantio carregando a raridade; modo "Reciclar" no
  `PlantsGridModal` com seleção e confirmação; feedback visual.

---

## 9. Arquivos afetados

- `supabase/migrations/<novo>_inventory_rarity.sql` (+ aplicar via MCP).
- `src/config/rarity.ts` (novo) ou `src/lib/scoring.ts` (escada).
- `src/services/dnaService.ts` (`generateRandomDNA(minRarity)`).
- `src/services/inventoryService.ts` (`plantSeed(seedRarity)`, `addStackableItem(rarity)`).
- `src/services/recycleService.ts` (novo) + `src/app/api/plants/recycle/route.ts` (novo).
- `src/app/api/plants/plant/route.ts` (aceitar `seedRarity`).
- `src/components/SeedIcon.tsx` (novo), `InventoryPanel.tsx`, `PlantsGridModal.tsx`.
- Hooks de inventário/plantio (`useGardenData`/`useGardenMutations`) para o `seedRarity`.

---

## 10. Decisões assumidas (ajustáveis)

- **3 plantas** por reciclagem; **1 semente** de saída.
- **Custo = só as 3 plantas** (sem herbo/moedas).
- **Brotaria não recicla** (topo).
- Reciclagem consome plantas **plantadas** (nos canteiros), esvaziando os canteiros;
  não recicla sementes nem plantas embrulhadas.
- Semente de raridade **não é giftável** nesta versão (fora de escopo).
- Coluna `rarity` em `inventory_items` (em vez de codificar no `label`).
- UI de reciclar dentro do `PlantsGridModal` (não uma tela nova).
