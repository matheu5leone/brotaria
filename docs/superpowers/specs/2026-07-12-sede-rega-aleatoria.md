# Plano — "Sede" da planta (rega aleatória) + rework do cronômetro de rega

**Data:** 2026-07-12

## 1. Objetivo e modelo

Cada planta ganha uma **sede** com 2 propriedades, **sorteadas no plantio** e **guardadas na planta**, mas o cliente só enxerga o **estágio atual** (nunca o futuro):

1. **Regas para subir de sub-passo** — aleatório, por sub-passo interno, com faixa definida pelo estágio visível:
   - enterrada (order 1): **3 fixo**
   - broto (order 2,3,4): cada um **3–6**
   - muda (order 5,6,7): cada um **4–9**
   - jovem (order 8,9,10): cada um **5–10**
   - **adulta (order 11): TERMINAL** — não se rega mais (a planta está completa). Orders 12/13 deixam de ser alcançados.
2. **Período que pede água** — aleatório **5h–12h**, um valor por planta (cadência fixa na vida da planta).

Mantém-se o modelo interno de 13 passos (imagens nos order 2/5/8/11, herbo/score por evolução) — só o `waters_required` deixa de ser global e vira **per-planta aleatório**, e a adulta vira terminal.

## 2. Modelo de dados (o "não revelar o futuro" manda aqui)

O cliente faz `supabase.from('plants').select('*')` (usePlantData, useGardenData). Logo, **coluna nova em `plants` = vaza**. Estratégia:

- **`plants.current_target int`** (client-readable) — regas necessárias no **sub-passo atual**. Setado no plantio (=3) e a cada evolução. Substitui o uso de `plant_stages.waters_required` no cliente. **Só o atual → não vaza futuro.**
- **`plants.water_period_ms int`** (client-readable) — período 5–12h. Não é "futuro de estágio"; é a cadência atual (o `next_water_needed_at` já revela o próximo horário). OK expor.
- **Tabela protegida `plant_sede`** (`plant_id uuid pk → plants on delete cascade`, `waters jsonb`) — o plano completo pré-sorteado por order (1–10). **RLS habilitado SEM policy de cliente** (só service role lê/escreve). É aqui que o futuro fica escondido de forma estrutural — um `select('*')` descuidado em `plants` no futuro não consegue vazar.

> Por que tabela protegida e não coluna em `plants`: RLS garante o sigilo por construção; depender de trocar `select('*')` por lista explícita em todo lugar é frágil.

**Migration** (`supabase/migrations/…_plant_sede.sql`, aplicar via MCP + salvar no repo):
- `alter table plants add column current_target int`, `add column water_period_ms int`.
- `create table plant_sede (...)` + `enable row level security` (sem policy).
- **Backfill das plantas existentes** (SQL): sortear `water_period_ms` (5–12h), sortear `waters` por order 1–10 nas faixas do tier, inserir em `plant_sede`, e setar `current_target` conforme o order atual (`greatest(rolled, current_stage_waters+1)` p/ não travar quem já regou muito). Plantas já em adulta (order ≥ 11): `current_target = 0`, `next_water_needed_at` = futuro distante.

## 3. Config das faixas (fonte única)

Em `src/config/economy.ts` (bloco novo `THIRST`):
```ts
THIRST: {
  PERIOD_MIN_HOURS: 5, PERIOD_MAX_HOURS: 12,
  // faixa [min,max] inclusiva de regas por sub-passo, por tier visível
  WATERS_BY_TIER: { semente:[3,3], broto:[3,6], muda:[4,9], jovem:[5,10] }, // adulta = terminal
}
```
+ helper puro `rollSede()` → `{ period_ms, waters: {1..10} }` e `tierOfOrder(order)`.

## 4. Lógica de servidor

- **`inventoryService.plantSeed`** (criação): chama `rollSede()`, insere `plant_sede`, e cria a planta com `current_target = waters[1]` (=3), `water_period_ms`, `next_water_needed_at = now()+period`.
- **`growthService.waterPlant`**: requisito passa a ser **`plant.current_target`** (não `current_stage.waters_required`). Se a planta é adulta (order ≥ 11) → rejeita ("já é adulta, não precisa de água", code `IS_ADULT`). `next_water_needed_at` no não-evoluir = `now() + water_period_ms`.
- **`growthService.evolvePlant`**: ao evoluir para `next_order`:
  - se `next_order === 11` (adulta): marca **terminal** — `current_target = 0`, `hydration_status='hydrated'`, `next_water_needed_at` = sentinela distante (nunca vira `waiting_water`, sem balão 💧). Gera a imagem da adulta normalmente.
  - senão: lê `plant_sede.waters[next_order]` → `current_target`; `next_water_needed_at = now()+period`.
  - O RPC `evolve_plant_tx` já recebe `p_next_water` — passar o valor certo; precisa também gravar `current_target` (estender o RPC OU um `update` logo após, dentro da mesma garantia). **Decisão:** estender `evolve_plant_tx` p/ receber `p_current_target` e gravá-lo (mantém atômico).
- **`processGrowth` (cron)**: inalterado (marca `waiting_water` por timestamp); a sentinela distante da adulta a exclui naturalmente.

## 5. Cliente — consumidores a atualizar

Trocar `current_stage.waters_required` → `current_target` e ajustar o "willEvolve"/barra:
- `hooks/usePlantData.ts` — `PlantRow` ganha `current_target`, `water_period_ms`; select explícito **não** precisa mudar (sede está em outra tabela), mas remover a dependência de `waters_required`.
- `components/Garden.tsx` — `handleWaterPot`: `cached.current_stage_waters + 1 >= cached.current_target`.
- `config/lifecycle.ts` `getLifecycle` — hoje usa `WATERS_PER_STEP=3` p/ montar a barra do **estágio visível inteiro** (3 sub-passos). Isso **revelaria o futuro** e assume valor fixo. **Rework:** a barra passa a mostrar o **sub-passo atual** (`current_stage_waters / current_target`) com o nome do estágio visível. (Só o atual, honra o spec.)
- `components/PlantDetailModal.tsx`, `PlantHistoryModal.tsx`, `HexPot.tsx` — usar a barra por sub-passo + `current_target`.
- `types/index.ts` — tipos da planta.

## 6. Rework do cronômetro de rega (UI)

Hoje: `PlantDetailModal:196` mostra `Próxima rega em: {formatNextWater(...)}` em **`text-[9px]`** (a queixa: minúsculo).

**Novo componente `WaterCountdown`** (client), grande e bonito, tema pergaminho:
- Conta ao vivo (tick 1s) o tempo até `next_water_needed_at`.
- Visual: card/anel com dígitos `HH:MM:SS` (ou "5h 12m") em `var(--font-display)`, ícone 💧, e um **anel de progresso** (fração do `water_period_ms` já decorrida) — mesmo espírito do cooldown radial da pá (`.painel-cooldown`).
- Estado "pode regar agora": vira botão/badge pulsante "Pode regar 💧" (verde/âmbar), bem maior que o atual.
- Reusável no `PlantDetailModal` e `PlantHistoryModal`; opcionalmente uma versão mini no balão do `HexPot` (fora do escopo se ficar pesado).

### 6b. Feedback de herbo voando (a cada sub-passo)
Confirmado: a barra enche **por sub-passo** e **reseta** a cada transição (broto_1→broto_2 etc.), e **cada** transição dá herbo (já é assim no `evolvePlant`, por passo interno).

**Novo:** a cada sub-passo, mostrar um **"+N 🍃" saindo da planta e voando até o contador de herbo no menu** (chip 🍃 da Sidebar no desktop; `🍃 {herbo}` do BottomNav no mobile).
- Implementação: um overlay `fixed` (portal) que anima um `+N 🍃` da **posição de tela da planta** (rect do `.hex-pot` / do card no modal) até a **posição do contador** (ref/`data-herbo-target`), com easing (arco), e um "pulse" no contador ao chegar.
- Disparo: o resultado de `waterMutation`/`evolvePlant` já retorna `{ evolved, herbo }`. Hoje o toast só aparece em **mudança visível**; passar a disparar o **fly** em TODA evolução com `herbo > 0` (inclusive sub-passos internos), e invalidar `['wallet']` ao fim do voo (o número sobe quando o 🍃 "chega").
- Respeita `prefers-reduced-motion` (sem voo → só incrementa).

## 7. Verificação
1. **Plantar** (dev, AI_MODE mock): nova planta tem `current_target=3`, `water_period_ms` em [5h,12h], linha em `plant_sede`.
2. **Regar até evoluir**: no broto, `current_target` ∈ [3,6] e muda a cada sub-passo; imagem gera nos order 2/5/8/11; herbo por evolução mantido.
3. **Adulta terminal**: ao chegar no order 11, não pede mais água (sem balão, water rejeita `IS_ADULT`).
4. **Não-vazamento**: `supabase.from('plants').select('*')` no cliente **não** traz `waters` futuros (estão em `plant_sede`, RLS bloqueia). Conferir via preview/DevTools.
5. **Cronômetro**: conta ao vivo, grande, anel de progresso; "pode regar" quando `next_water_needed_at` passa.
6. `tsc`/`eslint`/`build` limpos.

## 8. Riscos / decisões
- **Backfill**: plantas existentes ganham sede retroativa; usar `greatest(rolled, current_stage_waters+1)` no `current_target` inicial pra não evoluir alguém sem querer.
- **Adulta terminal encurta o ciclo** (para no order 11 em vez de 13): herbo total por planta cai um pouco (menos 2 evoluções). Se quiser compensar, rebalancear `calcPlantScore` — fora do escopo, sinalizar.
- **RPC `evolve_plant_tx`**: precisa de novo parâmetro `p_current_target` (migration da função).
- **Barra vira por-sub-passo** (não mais "X/9 até Muda"): consequência direta de "só o atual". Confirmar que a UX agrada.
