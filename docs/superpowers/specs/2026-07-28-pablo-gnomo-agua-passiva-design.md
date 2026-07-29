# Pablo — o gnomo de coleta passiva de água (/agua)

**Data:** 2026-07-28
**Status:** Design aprovado, aguardando revisão do spec antes do plano de implementação.
**Rota:** `/agua` (Coleta de Água)

---

## 1. Objetivo

Adicionar uma fonte de **coleta passiva** de água na página `/agua`: um gnomo (Pablo) que, uma vez desbloqueado com **1 estrela** (`profiles.stars`), coleta **1 água a cada 24h** enquanto está "acordado". A coleta é semi-idle: ele trabalha sozinho por 24h (mesmo com o jogador offline), mas o jogador precisa **acordá-lo** a cada ciclo e **pegar o balde** que ele enche.

Complementa a coleta manual existente (poço, minigame de barra, 1 água / 2h) sem substituí-la. Como o teto de água (`WATER_MAX_BALANCE`, hoje 5, com upgrade) já limita o estoque, a coleta passiva não desequilibra a economia.

---

## 2. Personagem — Pablo

**História (base para os diálogos):** Pablo tentou a vida na sociedade dos gnomos, mas nunca gostou de verdade de trabalhar. O hobby dele é cultivar cogumelos e ficar sozinho dormindo bastante, esperando os cogumelos crescerem pra ele comer. Você o "contrata" com uma estrela; a contragosto, ele enche um balde de água por dia pra você.

**Voz — pleonasmo/redundância (regra de tom obrigatória):** Pablo dobra a raiz das palavras com um adjetivo/derivado inventado. Todo diálogo dele (cutscene + balões) segue esse tom:

- trabalho **trabalhoso**
- água **molhada**
- balde **baldoso**
- boboca **bobalho**
- (livre para inventar: sono **soneca**, cogumelo **cogumeloso**, gnomo **gnômico**, etc.)

**Visual:** sprites reais em `public/imgs/pablo/` — Pablo em pé, dormindo, e dois retratos de diálogo (normal e nervoso), além do chapéu e do balde. Ver seção 3. (Não usa mais emoji.)

---

## 3. Assets

Todos em `public/imgs/pablo/` (WebP, quality 82):

| Arquivo | Uso |
|---------|-----|
| `pablo-em-pe.webp` | Pablo **acordado** (estado `awake`), em pé na cena. |
| `pablo-dormindo.webp` | Pablo **dormindo** (estados `asleep_idle` e `holding_water`), deitado com Zzz. |
| `pablo-dialogo.webp` | Retrato (sorrindo) — **cutscene** e diálogos normais. |
| `pablo-dialogo-nervoso.webp` | Retrato (bravo) — **fala do balde cheio** / nervoso. |
| `chapeu-pablo.webp` | Estado **`locked`**: chapéu vermelho largado na cena (com etiqueta "1 ⭐"). |
| `balde-cheio.webp` | O balde que aparece **encostado** no Pablo em `holding_water`. |

> **Nota:** os sprites já têm **fundo transparente** (confirmado pelo usuário) — usar direto na cena.

---

## 4. Mecânica e máquina de estados

Dois alvos de toque **separados e vizinhos** (assets separados): o **Pablo** e o **balde**.

### Estados (derivados no servidor)

| Estado | Condição | Visual | Interação no Pablo | Interação no balde |
|--------|----------|--------|--------------------|--------------------|
| `locked` | `gnome_unlocked = false` | Só o chapéu (`chapeu-pablo.webp`) + "1 ⭐" | tocar chapéu → confirma gastar 1 ⭐ → **cutscene** → desbloqueia | — |
| `awake` | acordado e `now < gnome_awoken_at + 24h` | `pablo-em-pe.webp` | tocar → balão *"próxima água em Xh"* (sem mudar estado) | — |
| `holding_water` | tem balde pendente (`gnome_bucket_pending = true`) | `pablo-dormindo.webp` + `balde-cheio.webp` ao lado | tocar → balão da **fala do balde cheio** (retrato `pablo-dialogo-nervoso.webp`; continua dormindo) | tocar → **+1 água** (se houver espaço) |
| `asleep_idle` | desbloqueado, `gnome_awoken_at = null`, sem balde | `pablo-dormindo.webp`, sem balde | tocar → **acorda** → `awake` (novo ciclo 24h) | — |

### Ciclo completo

1. **Desbloqueio:** toca o chapéu → confirma 1 ⭐ → cutscene de apresentação → Pablo nasce **`awake`** (`gnome_awoken_at = now`; primeira água em 24h — "começa acordado").
2. **`awake` (trabalhando):** passa 24h de tempo real, mesmo offline.
3. **Coleta automática (transição preguiçosa):** quando `now ≥ gnome_awoken_at + 24h`, o servidor marca `gnome_bucket_pending = true` e `gnome_awoken_at = null` → estado vira **`holding_water`** (Pablo dorme + balde aparece).
4. **Pegar a água:** toca o **balde** → se `water_balance < max`: `+1` água, `gnome_bucket_pending = false` → estado vira **`asleep_idle`**. **O Pablo continua dormindo.**
5. **Re-acordar:** toca o **Pablo** (em `asleep_idle`) → `gnome_awoken_at = now` → volta pra `awake`. Novo ciclo.

### Regras / edge cases

- **Acordar bloqueado com balde cheio:** tocar o Pablo enquanto `gnome_bucket_pending = true` → ele **não acorda**, solta a fala do balde cheio. O jogador é obrigado a pegar o balde antes de re-acordar. (Isso elimina empilhamento/desperdício.)
- **Sem empilhar:** no máximo 1 balde pendente. Como não dá pra re-acordar com balde cheio, nunca há uma 2ª coleta sobrepondo a 1ª.
- **Regador cheio ao pegar o balde:** toca o balde com `water_balance = max` → balão *"regador cheio"*, `gnome_bucket_pending` **permanece true** (balde continua ali). O jogador pega depois de abrir espaço. Nunca perde água.
- **Toque no Pablo acordado:** só mostra o countdown ("próxima água em Xh"); não coleta nem reinicia nada.
- **Hover (desktop) / toque (mobile):** o countdown do estado `awake` aparece em hover no desktop e em toque no mobile.

---

## 5. Data model

Migração **manual** via MCP Supabase (`apply_migration` no projeto `cnsrpukgnsdxznhlyyvr`) + cópia salva em `supabase/migrations/` (ver convenção [migrations-manual]).

Três colunas novas em `public.profiles`:

```sql
alter table public.profiles
  add column gnome_unlocked      boolean     not null default false,
  add column gnome_awoken_at     timestamptz,          -- início do ciclo; null = dormindo (idle)
  add column gnome_bucket_pending boolean    not null default false;
```

**Invariantes:**
- `gnome_bucket_pending = true` ⟹ `gnome_awoken_at = null` (dormindo com balde). Nunca acordado com balde pendente.
- `gnome_unlocked = false` ⟹ `gnome_awoken_at = null` e `gnome_bucket_pending = false`.

---

## 6. Backend — serviço + rotas

Novo serviço `src/services/gnomeService.ts` + rotas em `src/app/api/gnome/*`, espelhando o padrão server-authoritative de `waterService` / `/api/water/*`. Auth via `getAuthUser`; DB via `supabaseAdmin`. Timer e crédito 100% no servidor (o cliente só exibe/deriva o countdown a partir do timestamp, como o poço já faz).

### Derivação de estado (preguiçosa, sem cron)

Função `deriveGnomeState(profile)`:
- `!gnome_unlocked` → `locked`.
- `gnome_bucket_pending` → `holding_water`.
- `gnome_awoken_at != null`:
  - `now < gnome_awoken_at + COOLDOWN` → `awake` (com `cooldownRemainingMs`).
  - `now ≥ gnome_awoken_at + COOLDOWN` → **transição preguiçosa**: persiste `gnome_bucket_pending = true`, `gnome_awoken_at = null` → `holding_water`.
- senão → `asleep_idle`.

A transição preguiçosa roda em qualquer endpoint do gnomo que leia o estado (igual à prontidão derivada por timestamp em `waterPlant`/poço). Não depende de cron.

### Rotas

| Rota | Lógica |
|------|--------|
| `GET /api/gnome/status` | Deriva (e persiste transição de coleta se aplicável). Retorna `{ unlocked, state, cooldownRemainingMs, canClaim, waterFull, stars }`. |
| `POST /api/gnome/unlock` | Compare-and-swap atômico: exige `stars ≥ 1` e `gnome_unlocked = false`. Faz `stars -= 1`, `gnome_unlocked = true`, `gnome_awoken_at = now`, `gnome_bucket_pending = false`. Erros: `NO_STARS` (sem estrela), `ALREADY_UNLOCKED` (idempotência). |
| `POST /api/gnome/wake` | Exige `gnome_unlocked`. Se `gnome_bucket_pending` → retorna `BUCKET_FULL` (cliente mostra a fala; **sem** mudar estado). Se já `awake` → `ALREADY_AWAKE` (no-op). Senão (`asleep_idle`) → `gnome_awoken_at = now`. |
| `POST /api/gnome/collect` | Pegar o balde. Exige `gnome_unlocked` + `gnome_bucket_pending`. Se `water_balance ≥ max` → `WATER_FULL` (balde permanece). Senão RPC atômica: `water_balance += 1` (respeita o teto derivado dos upgrades), `total_waters += 1`, `gnome_bucket_pending = false`. |

**Atomicidade:** `unlock` e `collect` usam compare-and-swap / RPC no mesmo espírito de `add_coins` e `harvest_adult_tx` (nunca crédito duplo, nunca estrela gasta sem desbloqueio). O teto de água respeita o mesmo cálculo de max que o poço usa (base + upgrades `water_capacity`).

**Anti-cheat:** cooldown de 24h e crédito são derivados/validados só no servidor; o cliente exibe. `wake` recusa com balde pendente; `collect` cheio não zera `bucket_pending`.

---

## 7. Config

Em `src/config/economy.ts`, dentro de `GAME`:

```ts
GNOME_COOLDOWN_HOURS:   24,  // ciclo de trabalho do Pablo
GNOME_STAR_COST:        1,   // custo de desbloqueio (profiles.stars)
GNOME_WATER_PER_COLLECT: 1,  // água por balde
```

---

## 8. Frontend

### Posição na cena
Pablo + balde no **canto superior-esquerdo**, **abaixo** do bloco de título "Coleta de Água" (pra não sobrepor). O balde fica **encostado** no Pablo. `z-index` acima do fundo, abaixo dos modais. Alvos de toque separados (Pablo e balde são elementos distintos).

### Hooks (React Query, espelhando `useWater`)
`src/hooks/useGnome.ts`:
- `useGnomeStatus()` — query de `/api/gnome/status` (deriva countdown de `dataUpdatedAt + cooldownRemainingMs`, igual ao poço).
- `useGnomeUnlock()`, `useGnomeWake()`, `useGnomeCollect()` — mutations com update otimista + rollback (padrão `useCollectWater`). `collect` sobe o `water_balance` otimista; rollback se o servidor negar (`WATER_FULL`).

### Balões de comunicação
Reutilizar/espelhar o estilo do balão de "planta pedindo água" (balão de fala). Conteúdo por estado (todos na **voz do Pablo**):

- `awake` (hover/toque): *"volta em {Xh}, tô no meu sono soneca."* (mostra o countdown)
- `holding_water` → toque no Pablo: *"eu já fiz meu trabalho trabalhoso, sua água molhada está bem ali no balde baldoso, seu boboca bobalho!"* (fala exata)
- `holding_water` → balde com regador cheio: *"teu regador tá cheião — guarda essa água molhada e volta depois, bobalho."* (balde permanece)
- `asleep_idle` (dica sutil): *"me acorda pra eu encher teu balde baldoso."*

### Desbloqueio (toque no chapéu)
Diálogo de confirmação: *"Gastar 1 ⭐ pra acordar o Pablo?"*. Se `stars = 0`, o cliente reflete "você não tem estrela" (o servidor também valida com `NO_STARS`). Ao confirmar → `unlock` → **cutscene**.

### Cutscene (modal de diálogo em balões)
Modal dedicado (mesmo padrão de modal do `/agua`) com o **retrato do Pablo** (`pablo-dialogo.webp`; usar `pablo-dialogo-nervoso.webp` se algum balão pedir tom bravo) e **balões de fala em sequência** (toca pra avançar). Rascunho (refinar na implementação, mantendo a voz):

1. *(bocejo) "Ãaah... quem me acordou do meu sono soneca?"*
2. *"Eu sou o Pablo, gnomo gnômico. Fugi da sociedade trabalhadeira dos gnomos — trabalho é trabalhoso demais pro meu gosto gostoso."*
3. *"Meu lance é cultivar cogumelo cogumeloso e dormir esperando eles crescerem crescidos pra eu comer."*
4. *"Mas você me pagou com uma estrela estrelada... tá bom. Todo dia eu encho um balde baldoso de água molhada pra você. É só me acordar — e pegar o balde, seu boboca bobalho!"*

Ao fechar a cutscene → Pablo fica visível no estado `awake`. A cutscene toca **uma vez** (o próprio `gnome_unlocked` é o gate; não precisa flag separada).

---

## 9. Economia / balanceamento

- Custo: **1 ⭐** (recompensa da 3ª colheita da planta adulta — prestígio, difícil de obter). Desbloqueio **permanente**.
- Ganho: **1 água / 24h**, limitado pelo teto de `water_balance`. Semi-idle (exige acordar + pegar o balde a cada ciclo).
- Sem impacto em herbo/coins/estrelas além do custo único.

---

## 10. Fora de escopo (futuro)

- Animação/transições dos sprites do Pablo (dormindo↔acordando↔coletando) — por ora imagens estáticas por estado.
- Notificação/push quando o balde fica pronto.
- Múltiplos gnomos, níveis/upgrades do Pablo, cogumelos como mecânica.

---

## 11. Testes (considerações)

- Transições de estado no servidor: `locked → awake → holding_water → asleep_idle → awake`.
- `unlock`: gasta exatamente 1 estrela; idempotente (sem duplo desconto); recusa sem estrela.
- `wake` recusa com balde pendente (`BUCKET_FULL`); no-op se já acordado.
- `collect` cheio não zera `bucket_pending`; com espaço credita exatamente +1 e respeita o teto.
- Timing de 24h derivado do timestamp (sem depender de cron).
- Update otimista + rollback nos hooks.

---

## 12. Git

Trabalho **apenas local** enquanto durar o desenvolvimento desta feature — **não** dar push pro GitHub até o usuário liberar. (Sobrepõe a preferência padrão de commit+push automático.)
