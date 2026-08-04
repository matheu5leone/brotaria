# Rega de Vizinho — ajudar o jardim dos outros

**Data:** 2026-08-04
**Status:** Design — aguardando revisão.
**Rotas afetadas:** `/jardim/[nickname]` (visita), nova API `/api/garden/water-neighbor`.

---

## 1. Objetivo e problema

O novato hoje planta, rega uma vez e **bate num muro**: a rega da própria planta trava por 5–12h, a pá por 24h, e ele fica com **até 5 de água parada no bolso sem nada onde gastar**. O jogo não tem resposta para "o que eu faço agora?".

Esta feature transforma essa água ociosa em ação: **visitar o jardim de outro jogador e regar uma planta dele**, ganhando herbo e reputação. É um loop social assíncrono que dá utilidade imediata a um recurso morto, sem tocar no gargalo de custo de IA (a rega de vizinho **não faz planta nenhuma crescer**).

---

## 2. Regras (fechadas com o usuário)

| Regra | Valor |
|---|---|
| Progresso da planta regada | **Nenhum.** Não conta rega, não avança estágio |
| Sede do dono | **Não sacia.** `next_water_needed_at` e `hydration_status` ficam intactos |
| Custo | **1 água** do saldo de quem rega |
| Recompensa base | **5 herbo** |
| Recompensa com sorte | **10% de chance → 10 herbo** (em vez de 5, não somado) |
| Reputação | **+1** por rega (novo saldo em `profiles`) |
| Limite | **2 regas por dia** |
| Alvo | **1 planta por jardim** — só ela pede água ao vizinho |

**Consequência importante:** para o dono, nada muda mecanicamente. A ajuda é simbólica — é um gesto social, não um atalho de progressão. Isso é deliberado: mantém a economia intocada e impede que jogadores usem contas-satélite para acelerar plantas.

### Regras derivadas (decisões deste design)

- **Não pode regar o próprio jardim** (`from_user ≠ dono`).
- **Uma única planta por jardim pede ajuda**, sorteada de forma **determinística por (dono + dia)** via hash FNV-1a: todo visitante vê a mesma planta pedindo água, ela troca sozinha à meia-noite, e não precisa de estado no banco nem de cron. O servidor **valida** o alvo (`NOT_ASKING`) — o cliente não escolhe qual planta regar.
- **Máximo 1 rega por planta por dia** — como só há uma planta pedindo por jardim, isso equivale a **1 ajuda por jardim por dia**; as 2 regas diárias vão para jardins diferentes.
- **A planta que pede não precisa estar com sede** de verdade: a sede do dono não é afetada, então o pedido é puramente social.
- **Sem água = sem rega**: `water_balance = 0` → erro `NO_WATER`.
- **Reset diário à meia-noite de `America/Sao_Paulo`** (não UTC) — o jogo é brasileiro; virar o dia às 21h seria confuso.

---

## 3. Rastro visível (proposta — pendente de aprovação)

⚠️ **Ponto em aberto.** Do jeito que as regras estão, quem *recebe* a rega não ganha nada e **não fica sabendo** — o que desperdiça o gancho de retorno mais forte da mecânica ("alguém cuidou do meu jardim enquanto eu dormia").

Proposta que **não viola nenhuma regra** (continua sem dar progresso):

- No jardim do dono, aparece um aviso: **"🌿 @fulano regou seu jardim hoje"** (últimas 24h, agrupado).
- A planta regada ganha um brilho/gotas sutil por 24h.

Custo baixo, e é o que fecha o ciclo social. **Se o usuário não quiser, a feature funciona sem isso** — só perde força de retenção.

---

## 4. Data model

Migração manual via MCP Supabase (`apply_migration`) + cópia em `supabase/migrations/`.

### 4.1 Novo saldo em `profiles`

```sql
alter table public.profiles
  add column if not exists reputation             integer not null default 0,
  add column if not exists neighbor_waters_today  integer not null default 0,
  add column if not exists neighbor_waters_date   date;
```

- `reputation` — **nunca se gasta**. É status/prestígio (base para níveis de jardineiro e ranking futuro).
- `neighbor_waters_today` + `neighbor_waters_date` — contador diário. Se `neighbor_waters_date < hoje`, o contador é tratado como 0 e reescrito (reset preguiçoso, sem cron).

> **Nota de limpeza:** `profiles.daily_waters_used` e `profiles.water_reset_date` estão **órfãs** (sobraram do modelo antigo de água diária). Não são reaproveitadas aqui para não carregar nomes mentirosos; devem ser removidas numa limpeza separada.

### 4.2 Log de regas

```sql
create table if not exists public.neighbor_waterings (
  id           uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id   uuid not null references public.profiles(id) on delete cascade,
  plant_id     uuid not null references public.plants(id)   on delete cascade,
  herbo_gained integer not null,
  created_at   timestamptz not null default now()
);

create index if not exists neighbor_waterings_from_created_idx on public.neighbor_waterings (from_user_id, created_at desc);
create index if not exists neighbor_waterings_to_created_idx   on public.neighbor_waterings (to_user_id, created_at desc);
```

RLS: fechada (só service role), como as demais tabelas de mecânica. O log serve para três coisas: **anti-duplicata** (1 por planta/dia), **o rastro visível** (§3) e estatística futura.

---

## 5. Backend

Novo `src/services/neighborService.ts` + rota `POST /api/garden/water-neighbor`. Padrão idêntico ao `waterService`/`gnomeService`: auth por `getAuthUser`, DB por `supabaseAdmin`, tudo validado no servidor.

### `waterNeighborPlant(userId, plantId)`

Ordem de validação (falha rápido, sem efeito colateral):

1. Planta existe? → `PLANT_NOT_FOUND`
2. Dono ≠ `userId`? → `OWN_PLANT`
3. Contador diário (com reset preguiçoso por data) `< 3`? → `DAILY_LIMIT`
4. Já regou **esta planta** hoje (consulta em `neighbor_waterings`)? → `ALREADY_WATERED`
5. `water_balance > 0`? → `NO_WATER`

Efeito (compare-and-swap, mesmo espírito do `collectWater`):

```
herbo_ganho = Math.random() < 0.10 ? 10 : 5

UPDATE profiles SET
  water_balance         = water_balance - 1,
  herbo                 = herbo + herbo_ganho,
  reputation            = reputation + 1,
  neighbor_waters_today = <contador do dia> + 1,
  neighbor_waters_date  = <hoje BRT>
WHERE id = userId AND water_balance = <saldo lido>   -- CAS anti-corrida

INSERT INTO neighbor_waterings (from_user_id, to_user_id, plant_id, herbo_gained)
```

Se o CAS não afetar linha (corrida), recomputa e devolve o motivo atual. **A planta do dono não é tocada em nenhum momento** — nenhum `UPDATE` em `plants`.

### Retorno

```ts
{ ok: true, herboGained: 5 | 10, lucky: boolean,
  waterBalance: number, reputation: number, remainingToday: number }
```

### Anti-abuso

- Adicionar `/api/garden/water-neighbor` aos `LIMITS` do `middleware.ts` (ex.: 10/min) — é rota de escrita exposta.
- O limite real é server-side (3/dia + 1 por planta/dia); o rate limit só barra flood.

---

## 6. Frontend

### Onde
Na visita a `/jardim/[nickname]` (componente `GardenView`). A interação imita a **rega de verdade** do próprio jardim, não um botão:

1. A planta sorteada exibe o **balão 💧** (mesmo visual do balão de sede).
2. Um **regador** fica ancorado no rodapé da cena, com a dica "arraste até a 💧".
3. O jogador **arrasta o regador** até a planta (pointer capture + `elementsFromPoint` sobre `data-pot-id`, igual ao `Garden.tsx`). Sobre o alvo certo, o regador cresce e ganha brilho, e o canteiro acende (`isWaterTarget`).
4. Ao soltar em cima: **gotas caem na terra** (`PotFx type="water"`, o mesmo efeito da rega real) e a rega é enviada.

**Balões do dono ficam escondidos na visita** (`HexPot hideStatusBalloons`): sem isso o visitante veria 💧 em toda planta sedenta do dono e só uma seria acionável.

### Estados

| Situação | Visual |
|---|---|
| Pode ajudar | Balão 💧 na planta + regador arrastável |
| Já ajudou este jardim hoje | Sem balão, sem regador (servidor informa via `alreadyWateredByMe`) |
| Limite diário / sem água | Chip com o motivo ao soltar |

### Feedback
Ao regar: gotas na terra + chip com o ganho (`+5 herbo · +1 rep`). No caso de sorte (10%), chip dourado com ✨ — para o 10% valer como momento. A planta regada passa a exibir o rastro de partículas **brancas** por 24h.

### Hook
`src/hooks/useNeighborWater.ts` — mutation com update otimista de `herbo`/`water_balance`/`reputation` e rollback no erro (padrão do `useCollectWater`), invalidando as queries de carteira e do jardim visitado.

---

## 7. Onde a reputação aparece

Nesta entrega, reputação é **acumulada e exibida**, sem sink:

- No perfil/sidebar, junto de moedas e herbo.
- No jardim visitado, ao lado do apelido do dono.

O uso dela (níveis de jardineiro, títulos no ranking, destravar receitas de pólen) fica para uma feature futura — mas o saldo já começa a crescer desde agora, o que é proposital: quando o sistema de níveis chegar, os jogadores antigos já terão história.

---

## 8. Fora de escopo

- Sink/níveis de reputação.
- Notificação push do rastro (§3 é só visual, dentro do app).
- Ranking por reputação.
- Regar com água de outros recursos que não o `water_balance`.

---

## 9. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Contas-satélite farmando herbo | Limite 2/dia + 1 planta pedinte por jardim; herbo/dia máx = 20 (raro), típico 10 |
| Inflação de herbo | 10/dia é modesto perto dos custos de upgrade do poço; monitorar após lançar |
| Cliente escolher o alvo | `getAskingPlantId` roda no servidor e a rega valida (`NOT_ASKING`) |
| Jogador rega e não vê valor (dono não ganha nada) | Rastro visível (§3) + o ganho é do *regador*, então o incentivo é dele |
| Corrida (dois cliques simultâneos) | CAS no `water_balance` + checagem do log |

---

## 10. Verificação

Sem framework de teste no projeto — verificação ao vivo (dev server + `curl` com JWT da conta de teste + SQL via MCP):

- Regar planta de outro: herbo +5 (ou +10), água −1, reputação +1, log criado.
- Planta do dono **inalterada**: `current_stage_waters`, `next_water_needed_at`, `hydration_status` idênticos antes/depois.
- 4ª rega no mesmo dia → `DAILY_LIMIT`.
- 2ª rega na mesma planta → `ALREADY_WATERED`.
- Regar a própria planta → `OWN_PLANT`.
- Água 0 → `NO_WATER`, sem efeito colateral.
- Virada de data (BRT) reseta o contador.
