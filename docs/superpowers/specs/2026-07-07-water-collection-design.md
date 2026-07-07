# Coleta de Água — Nível 1 (design)

Data: 2026-07-07

## Problema

Hoje "água" é um **contador diário** (`profiles.daily_waters_used`, reset à meia-noite
de Brasília, limite `DAILY_WATER_LIMIT = 10`). Ninguém *ganha* água — ela reaparece
sozinha. Isso:

- não escala (10/dia vira gargalo conforme o jardim cresce via pá);
- não tem interação humana nem retenção (nada traz o jogador de volta).

## Objetivo

Transformar água num **recurso estocável** obtido por uma interação ativa que dê
motivo pra voltar ao jogo. Nível 1 (fundação; upgrades e mini-games mais ricos vêm
depois, reaproveitando o mesmo saldo).

## Decisões (confirmadas)

- O saldo de água **substitui** o limite diário — não convivem.
- Saldo máximo: **10** (por enquanto).
- Coleta rende **+1** água e tem **cooldown de 2h** (server-authoritative).
- Saldo aparece **só** no regador do jardim e na página de coleta.

## Modelo de dados

`profiles`:
- `water_balance INT NOT NULL DEFAULT 10` — default 10 preenche contas atuais e novas.
- `water_last_collected_at TIMESTAMPTZ` — âncora do cooldown de coleta.
- `CHECK (water_balance >= 0)`.

`daily_waters_used` / `water_reset_date` permanecem no banco (sem migration
destrutiva) mas deixam de ser lidas/escritas.

## Config (`src/config/economy.ts`)

Bloco `WATER`:
- `MAX_BALANCE: 10`
- `COLLECT_COOLDOWN_HOURS: 2`
- `PER_COLLECT: 1`
- Parâmetros da barra (client, tunáveis): `BAR_FILL_PER_CLICK`, `BAR_DECAY_PER_TICK`, `BAR_TICK_MS`.

Remove os usos de `DAILY_WATER_LIMIT`. Deriva `WATER_COLLECT_COOLDOWN_MS`.

## Rega consome saldo (`growthService.waterPlant`)

- Substitui a checagem de limite diário por: saldo > 0? senão erro `NO_WATER`.
- Decremento atômico: `UPDATE profiles SET water_balance = water_balance - 1
  WHERE id = ? AND water_balance > 0 RETURNING water_balance`. Nunca negativa.
- Mantém: cooldown de 8h por planta, incremento de `total_waters` (missão), e a
  reversão do saldo se a evolução por IA falhar (`water_balance + 1`, `total_waters` de volta).
- Retorna `waterBalance` (novo saldo) no lugar de `watersRemaining`.

## Coleta — API

- `GET /api/water/status` → `{ balance, max, cooldownRemainingMs, collectableNow }`.
- `POST /api/water/collect`:
  - Update atômico com guarda no SQL:
    `UPDATE profiles SET water_balance = water_balance + 1, water_last_collected_at = now()
     WHERE id = ? AND water_balance < :max
       AND (water_last_collected_at IS NULL OR water_last_collected_at < now() - interval '2 hours')
     RETURNING water_balance`.
  - Se nenhuma linha voltou, faz um SELECT pra decidir o motivo: `FULL` (409) ou `COOLDOWN` (429).
  - Sucesso → `{ balance, cooldownRemainingMs }`.

### Anti-cheat (Nível 1)

A barra é gesto do cliente; o servidor não valida os cliques. Chamar a API direto
pula o esforço, **mas não rende mais água**: cooldown de 2h + teto de 10 limitam o
ganho ao de um jogador honesto. Sem exploit econômico. Validação real dos cliques
fica para um upgrade futuro.

## Página `/agua`

- Barra **vertical** 0–100%. Ícone de poço/balde: cada clique/toque soma
  `BAR_FILL_PER_CLICK`; a barra decai `BAR_DECAY_PER_TICK` a cada `BAR_TICK_MS`
  (exige cliques rápidos).
- 100% → `collect` → +1 água, barra reseta, entra em cooldown de 2h.
- Estados: coletável / cheio (10/10) / em cooldown (barra travada + contador).
- Mostra saldo `X/10` e o timer.
- Hooks: `useWaterStatus`, `useCollectWater` (React Query, padrão do projeto).

## Saldo exibido (apenas 2 lugares)

- **Regador do jardim** (`Garden.tsx`): badge = `water_balance`; desabilitado em 0
  ("Sem água — colete mais"). Ajustes em `useGardenData` (lê saldo) e
  `useGardenMutations` (invalida a query certa).
- **Página `/agua`**.
- Não entra nos chips de sidebar/bottomnav.

## Navegação

- **Desktop** (`Sidebar.tsx`): item "Coleta de Água" (ícone gota) → `/agua`.
- **Mobile** (`BottomNav.tsx`): fixos = Jardim + Loja. Novo **☰** abre um bottom
  sheet com Ranking, Missões e Coleta de Água. Mantém chip de moedas/herbo e Sair.

## Fora de escopo (futuro)

Upgrades de rendimento, mini-games alternativos, validação server-side dos cliques,
fontes de água / clima / social (Níveis 2 e 3).
