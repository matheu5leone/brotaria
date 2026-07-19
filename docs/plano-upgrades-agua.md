# Plano — Upgrades da Coleta de Água (pagos em Herbo)

Status: **planejado** · Decisões travadas: capacidade = compra única (+5); persistência = tabela `user_upgrades`.

## 1. Objetivo

Adicionar melhorias compráveis com **herbo** na página de coleta de água (`/agua`):

| # | Upgrade | id | Custo | Efeito | Níveis |
|---|---------|-----|-------|--------|--------|
| 1 | **Poço Fundo** (capacidade) | `water_capacity` | 50 herbo | Teto de água **+5** (5 → 10) | 1 (único) |
| 2 | **Coleta Farta** (bônus) nível 1 | `water_bonus` | 50 herbo | **20%** de chance de coletar **+1** água por coleta | 1 |
| 3 | **Coleta Farta** nível 2 | `water_bonus` | 100 herbo | +20% (**40% no total**); exige nível 1 | 2 |

> #2 e #3 são o **mesmo upgrade** (`water_bonus`) em níveis diferentes.

UI: botão flutuante hexagonal (imagem `hex-button.webp`, ícone gota) no canto inferior direito de `/agua`, igual ao painel do jardim → abre um **modal de upgrades** com o **saldo de herbo numa faixa no topo**.

## 2. Como o sistema atual funciona (aterramento)

- **Teto de água** hoje é fixo: `GAME.WATER_MAX_BALANCE = 5`, usado em [`waterService.ts`](../src/services/waterService.ts) tanto no `getWaterStatus` quanto no `collectWater`.
- O `getWaterStatus` **já retorna `max`**, e o cliente (`/agua` e o regador do jardim) **já usa `status.max`**. Logo, basta tornar o `max` dinâmico no servidor que a UI inteira respeita sozinha. ✅
- **Coleta**: `collectWater` soma `GAME.WATER_PER_COLLECT = 1`, com CAS atômico (cooldown + teto) direto no `UPDATE`.
- **Herbo**: coluna `profiles.herbo` (lida no [`useWallet`](../src/hooks/useWallet.tsx)). Creditado hoje pela RPC de crescimento.
- **Gasto atômico**: já existe o padrão `spend_coins` / `add_coins` (RPC plpgsql) usado em [`store/buy`](../src/app/api/store/buy/route.ts). Vamos espelhar para herbo.
- **Painel de botões**: componente [`HexButton`](../src/components/HexButton.tsx) (usa `hex-button.webp`) dentro da classe CSS `.painel` / `.painel-btn` (ver `Garden.tsx` ~linha 1359). Reutilizável direto.
- **Migrations**: aplicar via MCP Supabase (`apply_migration`, projeto `cnsrpukgnsdxznhlyyvr`) **e** salvar cópia em `supabase/migrations/`.

## 3. Modelo de dados

### Nova tabela `user_upgrades`
```sql
create table if not exists public.user_upgrades (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  upgrade_id text not null,
  level      int  not null default 0 check (level >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, upgrade_id)
);

alter table public.user_upgrades enable row level security;
-- Leitura só do próprio; escrita apenas via service role (RPC no servidor).
create policy user_upgrades_select_own
  on public.user_upgrades for select using (auth.uid() = user_id);
```
`upgrade_id ∈ { 'water_capacity', 'water_bonus' }`. Nível 0 = não comprado (linha pode nem existir → tratamos ausência como 0).

### RPC de compra atômica (sem necessidade de refund)
```sql
create or replace function buy_water_upgrade(
  p_user_id     uuid,
  p_upgrade_id  text,
  p_cost        int,
  p_max_level   int
) returns table (new_level int, new_herbo int)
language plpgsql as $$
declare
  cur_level int;
  bal       int;
begin
  -- Trava a linha do profile p/ evitar corrida de saldo.
  select herbo into bal from public.profiles where id = p_user_id for update;
  if bal is null then raise exception 'PROFILE_NOT_FOUND'; end if;

  select coalesce(level, 0) into cur_level
    from public.user_upgrades
    where user_id = p_user_id and upgrade_id = p_upgrade_id;
  cur_level := coalesce(cur_level, 0);

  if cur_level >= p_max_level then raise exception 'MAX_LEVEL'; end if;
  if bal < p_cost           then raise exception 'INSUFFICIENT_HERBO'; end if;

  update public.profiles set herbo = herbo - p_cost where id = p_user_id
    returning herbo into bal;

  insert into public.user_upgrades (user_id, upgrade_id, level, updated_at)
    values (p_user_id, p_upgrade_id, cur_level + 1, now())
    on conflict (user_id, upgrade_id)
      do update set level = excluded.level, updated_at = now();

  return query select cur_level + 1, bal;
end; $$;
```
Tudo numa transação: checa nível esperado + saldo, debita herbo, sobe o nível. Zero risco de double-spend / double-buy, sem lógica de estorno.

## 4. Configuração central (`src/config/economy.ts`)

Fonte única de verdade (o arquivo já centraliza toda a economia):
```ts
export const WATER_BASE_MAX = 5;               // (= WATER_MAX_BALANCE atual)

export const WATER_UPGRADES = {
  water_capacity: {
    id: 'water_capacity',
    name: 'Poço Fundo',
    description: 'Aumenta a capacidade máxima do regador em +5.',
    maxLevel: 1,
    levels: [ { cost_herbo: 50, capacity_bonus: 5 } ], // nível 1
  },
  water_bonus: {
    id: 'water_bonus',
    name: 'Coleta Farta',
    description: 'Chance de coletar +1 água extra a cada coleta.',
    maxLevel: 2,
    levels: [
      { cost_herbo: 50,  bonus_chance: 0.20 }, // nível 1
      { cost_herbo: 100, bonus_chance: 0.40 }, // nível 2 (total)
    ],
  },
} as const;

// Helpers (derivam efeito a partir do nível):
export function waterMaxFor(capacityLevel: number): number {
  return WATER_BASE_MAX + (capacityLevel > 0 ? WATER_UPGRADES.water_capacity.levels[0].capacity_bonus : 0);
}
export function waterBonusChanceFor(bonusLevel: number): number {
  return bonusLevel > 0 ? WATER_UPGRADES.water_bonus.levels[bonusLevel - 1].bonus_chance : 0;
}
export function nextWaterUpgradeCost(id, currentLevel): number | null { /* levels[currentLevel]?.cost_herbo ?? null */ }
```
> `GAME.WATER_MAX_BALANCE` deixa de ser o teto absoluto e vira o `WATER_BASE_MAX`.

## 5. Servidor

### 5.1 `services/waterService.ts` (max dinâmico + bônus na coleta)
- Novo helper interno `getUpgradeLevels(userId)` → `{ capacity, bonus }` (lê `user_upgrades`, default 0).
- `getWaterStatus`: `max = waterMaxFor(capacity)` em vez do fixo.
- `collectWater`:
  - usa `max` dinâmico no check de `FULL` e no cap.
  - rola o bônus: `const extra = Math.random() < waterBonusChanceFor(bonus) ? 1 : 0;`
  - `newBalance = min(balance + WATER_PER_COLLECT + extra, max)`.
  - retorna também `bonus: extra > 0` (pra UI comemorar — opcional).

### 5.2 Novo serviço `services/waterUpgradeService.ts`
- `getWaterUpgrades(userId)` → `{ capacityLevel, bonusLevel, max, bonusChance }` (pro modal).
- `buyWaterUpgrade(userId, upgradeId)`:
  - valida `upgradeId`, lê nível atual, deriva `cost` = `nextWaterUpgradeCost(...)` (nega se já no máximo),
  - chama a RPC `buy_water_upgrade`, mapeia exceções (`INSUFFICIENT_HERBO`, `MAX_LEVEL`).

### 5.3 Rotas
- `GET  /api/water/upgrades` → `getWaterUpgrades` (auth). Alimenta o modal.
- `POST /api/water/upgrade` `{ upgradeId }` → `buyWaterUpgrade`. Retorna `{ herbo, capacityLevel, bonusLevel, max }`.
  - Erros: 400 `INSUFFICIENT_HERBO`, 409 `MAX_LEVEL`.

## 6. Cliente

### 6.1 Hooks (`hooks/useWaterUpgrades.ts`)
- `useWaterUpgrades()` — query `GET /api/water/upgrades`.
- `useBuyWaterUpgrade()` — mutation `POST /api/water/upgrade`; no `onSuccess` invalida `['wallet']`, `['water']` (status/max) e `['water','upgrades']`.

### 6.2 Botão flutuante em `/agua` ([`app/agua/page.tsx`](../src/app/agua/page.tsx))
- Reusar `HexButton` dentro de um wrapper `.painel` no canto inferior direito (mesma âncora do jardim).
- `icon={<Droplets />}` (lucide, já importado), `label="Melhorias"`, `onClick` abre o modal de upgrades.
- Mantém o botão do poço (centro) intacto.

### 6.3 Modal de upgrades (`components/WaterUpgradesModal.tsx`)
- **Faixa de saldo de herbo no topo** (full-width, destaque) — lê `herbo` do `useWallet`.
- Dois **cards** (catálogo de `WATER_UPGRADES`):
  - **Poço Fundo**: mostra "Comprado ✔" se `capacityLevel ≥ 1`, senão botão "50 herbo".
  - **Coleta Farta**: barra de nível (0/1/2), mostra chance atual (0% → 20% → 40%), botão com o custo do **próximo** nível; some/"Máximo" no nível 2. Nível 2 fica bloqueado até ter o nível 1.
  - Botão desabilitado quando `herbo < custo` (com dica "herbo insuficiente").
- Estética: mesmo pergaminho/madeira do modal do poço já existente (reaproveitar tokens `--color-parch-*`, `--color-wood-*`).

## 7. Ordem de execução (fases)

1. **Migration** `user_upgrades` + RPC `buy_water_upgrade` (via MCP + cópia em `supabase/migrations/AAAAMMDD...__water_upgrades.sql`).
2. **Config** em `economy.ts` (`WATER_UPGRADES`, `WATER_BASE_MAX`, helpers).
3. **Servidor**: `waterService` (max/bônus dinâmicos) + `waterUpgradeService` + 2 rotas.
4. **Hooks** cliente.
5. **UI**: botão flutuante + `WaterUpgradesModal`.
6. **Verificar**: comprar cada upgrade (saldo cai, nível sobe, teto muda no chip `x / max`), coleta com bônus, bloqueios (herbo insuficiente, nível máximo), e persistência após reload.

## 8. Pontos de atenção

- **Teto dinâmico se propaga sozinho**: como o `getWaterStatus` já devolve `max` e a coleta otimista usa `old.max`, subir a capacidade reflete no chip de `/agua` **e** no regador do jardim sem mudança extra no cliente.
- **Coleta otimista assume +1**: o `onSuccess` do `useCollectWater` sincroniza com o saldo do servidor, então o +1 do bônus aparece no sync (sem bug). Opcional: usar o campo `bonus` pra um "pop" de comemoração.
- **Herbo insuficiente / nível máximo**: tratados na RPC (fonte da verdade) + refletidos como botão desabilitado no modal (defesa em profundidade).
- **Sem estorno**: a compra é atômica e não tem "entrega" que possa falhar depois do débito (diferente de `store/buy`), então não precisa de `add_herbo` de refund.
- **RLS**: escrita em `user_upgrades` só via service role (RPC no servidor); cliente só lê o próprio.
