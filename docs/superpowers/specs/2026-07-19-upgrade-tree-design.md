# Árvore de habilidades — rework do modal de upgrades

**Data:** 2026-07-19
**Escopo desta entrega:** Fase 1 (categoria `well` / coleta de água). Categoria `garden` e o ramo "Eficiência Natural" ficam para depois, mas a arquitetura já os acomoda.

## Objetivo

Substituir o `WaterUpgradesModal` atual (lista de cards) por uma **árvore de habilidades** dirigida por config, genérica o bastante para que o poço (coleta de água) seja apenas **uma categoria** de upgrades — no futuro entra a categoria `garden` sem reescrever nada.

Requisitos de UX:
- Cada upgrade é **apenas um hexágono** (HexButton), sem card explicativo.
  - Desktop: `:hover` → popover com título, descrição, efeito e custo.
  - Mobile: toque → **bottom sheet** de informações com os mesmos dados + botão comprar.
- **Revelação progressiva (fog of war):** só o próximo nó comprável fica visível; o resto da trilha é névoa (uma "tampa" com `?`, sem revelar quantos faltam).
- Estados do próximo nó por saldo: **glow verde** se dá pra pagar, **filtro escuro** se não dá.
- Muito feedback visual/animação: compra, conector enchendo de água, glow, shake sem saldo, celebração de ramo completo.
- Experiência boa em **desktop e mobile**.

## Estado atual (o que já existe e é reaproveitado)

- **Backend genérico (não muda):**
  - Tabela `user_upgrades (user_id, upgrade_id, level)` — ausência de linha = nível 0. RLS: select do próprio usuário; escrita só via service role.
  - RPC `buy_water_upgrade(p_user_id, p_upgrade_id, p_cost, p_max_level)` — débito de herbo + subida de nível atômicos. **Aceita qualquer `upgrade_id`.** (Rename cosmético para `buy_upgrade` é opcional e adiado.)
  - API: `GET /api/water/upgrades` (view), `POST /api/water/upgrade` (compra).
  - Hooks: `useWaterUpgrades` (query), `useBuyWaterUpgrade` (mutation, sincroniza view + invalida wallet/water).
- **Config atual** (`src/config/economy.ts`): `WATER_UPGRADES` com `water_capacity` (maxLevel 1, +5, 50 herbo) e `water_bonus` (maxLevel 2, 20%/40%, 50/100). `waterMaxFor` hoje só lê o nível 1 do capacity.
- **Assets/padrões:** `HexButton`, `hex-button.webp`; partículas em `WaterOverflowFx`, `HerboFly`, `LeafConfetti`; convenção de `prefers-reduced-motion` no `globals.css`; `HerboIcon` para custo em herbo.

## Arquitetura: motor de upgrades genérico

### Config (fonte da verdade)

Novo `src/config/upgrades.ts` (ou seção nova em `economy.ts`), organizado por **categoria → trilha → níveis**:

```ts
type UpgradeCategoryId = 'well' | 'garden'; // garden = futuro

interface UpgradeNodeLevel {
  cost_herbo: number;
  effect: Record<string, number>; // ex.: { capacity_bonus: 5 } | { bonus_chance: 0.2 }
  label: string;                  // "Capacidade I"
  effectLine: (prev, next) => string; // "Teto 5 → 10"
}

interface UpgradeTrack {
  id: string;          // = upgrade_id em user_upgrades (ex.: 'water_capacity')
  name: string;        // "Capacidade"
  description: string;
  icon: string;        // asset/ícone do ramo
  levels: UpgradeNodeLevel[];
  // requires?: { trackId: string; level: number }[]; // pré-requisito cruzado (fase 2)
}

interface UpgradeCategory {
  id: UpgradeCategoryId;
  name: string;        // "Poço"
  rootIcon: string;    // ícone do hub (poço)
  tracks: UpgradeTrack[];
}

export const UPGRADE_TREE: Record<UpgradeCategoryId, UpgradeCategory>;
```

- `upgrade_id` de cada track continua sendo a chave em `user_upgrades` (compatível com o que já está gravado: `water_capacity`, `water_bonus`).
- Custo/efeito/nível-máximo derivam da config; o servidor valida contra ela (como hoje).

### Efeitos derivados

- `waterMaxFor(level)` passa a **somar todos os níveis comprados** do track `water_capacity` (hoje trava no nível 1). Idem qualquer função que derive efeito de nível.
- Nova função genérica `effectiveEffect(categoryId, trackId, level)` opcional para somar efeitos; para a Fase 1 basta ajustar `waterMaxFor` e `waterBonusChanceFor` (esta já indexa por nível).

### Componentes (nada menciona "água")

- `UpgradeHub` — modal/casca. Recebe `categoryId` (default `well`). Renderiza **abas por categoria só quando houver >1 categoria** (hoje: sem barra de abas visível, abre direto em Poço).
- `UpgradeTree` — recebe uma `UpgradeCategory` + níveis atuais + herbo; faz o layout (desktop tree / mobile lanes) e a lógica de reveal.
- `UpgradeTrack` (lane) — uma trilha: cabeçalho (ícone + nome + nível X/N) + nós + conectores.
- `UpgradeNode` — o hexágono e seus estados; dispara hover-popover (desktop) / tap-sheet (mobile).
- `UpgradeInfo` — conteúdo compartilhado (título, descrição, efeito antes→depois, custo, botão comprar) usado tanto no popover quanto no sheet.

O `WaterUpgradesModal` atual vira uma casca fina que abre `UpgradeHub categoryId="well"` (ou é substituído pela chamada direta em `/agua`).

### Backend / hooks

- Sem mudança de schema na Fase 1. `useWaterUpgrades`/`useBuyWaterUpgrade` continuam; podem ser generalizados para `useUpgrades(categoryId)`/`useBuyUpgrade` como refactor leve (opcional nesta fase, obrigatório quando `garden` existir).

## Lógica de revelação (fog of war)

Por trilha, dado `level` comprado e `L` níveis totais:
- Nós `1..level`: **comprados**, visíveis.
- Nó `level+1` (se existir): **próximo**, visível, interativo, com info. Estado por saldo:
  - `herbo >= custo` → **glow verde** (pulsando).
  - `herbo < custo` → **filtro escuro** (dimmed), info ainda acessível.
- Nós `level+2 .. L`: **névoa** — não renderizados individualmente; a trilha mostra uma única **tampa `?`** não-interativa indicando "há mais", sem revelar quantos.
- Se `level == L`: trilha **completa** → tratamento especial (coroa/estrela no cabeçalho), sem tampa.

**Lookahead = 1** (revela só o próximo). Constante configurável (`REVEAL_LOOKAHEAD`) caso se queira revelar mais adiante.

## Layout

### Desktop (≥ 640px)
Árvore ramificada: **poço (root) no topo-centro**, trilhas abrindo em leque (uma por track). Nós = hexágonos (motivo hex do jogo). Conectores do poço para cada trilha e entre nós. Modal largo (~720–800px). Hover no nó → popover ancorado (`UpgradeInfo`).

### Mobile (< 640px)
Mesma árvore **reflowada**: poço no topo; cada track vira uma **faixa vertical empilhada** (scroll). Faixa = cabeçalho (ícone + nome + nível X/N) + nós numa mini-trilha vertical com conectores. Alvos de toque ≥44px. Tap no nó → **bottom sheet** (`UpgradeInfo` + comprar).

Mesmo `UpgradeNode` e mesma lógica de estado; muda a direção do container via breakpoint (CSS grid/flex).

## Animações e feedback (`globals.css`, gated por `prefers-reduced-motion`)

- **Abrir:** árvore "cresce" — nós entram escalonados do poço pra fora; conectores já possuídos enchem de água rápido.
- **Compra bem-sucedida:** nó dá *pop* (bounce) e faz transição próximo→comprado (varredura de cor + carimbo de check) → conector para o próximo **enche de água** → o novo "próximo" (antes névoa) **se revela** com pulso de brilho. Em paralelo: herbo desce com count-up, "−custo" voa (estilo `HerboFly`), pequeno burst de gotas no nó (padrão `WaterOverflowFx`). Opcional: ripple/"borbulhar" no poço-root.
- **Sem saldo:** toque → shake + custo pisca vermelho + dica "herbo insuficiente".
- **Ramo completo:** celebração maior (coroa no cabeçalho + confete).

## Fases

- **Fase 1 (esta entrega):** motor genérico + categoria `well` com `water_capacity` e `water_bonus` **expandidos para 3 níveis**; `waterMaxFor` multi-nível; reveal progressivo; hover-popover / tap-sheet; todas as animações; substituição do modal atual. Sem mudança de schema.
- **Fase 2 (adiada):** ramo `water_cooldown` ("Eficiência Natural", reduz cooldown de coleta — exige tocar `waterService`) + pré-requisitos cruzados (`requires`) + categoria `garden`.

### Níveis da Fase 1 (defaults, ajustáveis)
- `water_capacity` (Capacidade): 3 níveis — teto +5 / +10 / +15 acumulado; custo 50 / 100 / 200.
- `water_bonus` (Coleta Farta): 3 níveis — chance 20% / 40% / 60%; custo 50 / 100 / 200.

## Arquivos afetados

- `src/config/economy.ts` (ou novo `src/config/upgrades.ts`): estrutura `UPGRADE_TREE`, níveis, `waterMaxFor` multi-nível, `REVEAL_LOOKAHEAD`.
- `src/components/UpgradeHub.tsx`, `UpgradeTree.tsx`, `UpgradeTrack.tsx`, `UpgradeNode.tsx`, `UpgradeInfo.tsx` (novos).
- `src/components/WaterUpgradesModal.tsx`: vira casca de `UpgradeHub categoryId="well"` (ou removido e `/agua` chama o hub direto).
- `src/app/globals.css`: keyframes (crescer, encher conector, pop, glow, shake, celebração).
- `src/hooks/useWaterUpgrades.ts`: mantém; refactor opcional para `useUpgrades(categoryId)`.
- Backend/DB: **sem mudança** na Fase 1.

## Decisões assumidas (defaults)

- Lookahead = 1 (revela só o próximo).
- Mobile = faixas verticais empilhadas por trilha.
- Motor genérico multi-categoria desde já; abas aparecem só com >1 categoria.
- Backend intacto; sem rename de RPC/tabela agora.
- 3 níveis por trilha, custos 50/100/200.
