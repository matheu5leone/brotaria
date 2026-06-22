# Spec: Inventário + Embrulho de Presente

**Data:** 2026-06-22
**Status:** Aprovado para implementação

---

## Escopo

Dois planos executados em sequência:

- **Plano A — Inventário:** tabela `inventory_items`, migração de seeds, painel flutuante, Kit de Embrulho na loja
- **Plano B — Embrulho:** fluxo de embrulhar planta, planta embrulhada no inventário, label editável, animação de abertura

---

## 1. DB — `inventory_items`

### Migration SQL

```sql
-- Tabela principal do inventário
CREATE TABLE inventory_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  slot_index INTEGER NOT NULL CHECK (slot_index BETWEEN 0 AND 9),
  item_type  TEXT NOT NULL CHECK (item_type IN ('seed', 'wrapping_kit', 'wrapped_plant', 'plant')),
  plant_id   UUID REFERENCES plants(id) ON DELETE CASCADE,
  quantity   INTEGER NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 10),
  label      TEXT CHECK (char_length(label) <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, slot_index)
);

-- Índice para buscar inventário de um usuário
CREATE INDEX idx_inventory_items_user ON inventory_items(user_id);

-- Migrar seeds existentes para inventory_items (slot 0, agrupados por usuário)
WITH seed_counts AS (
  SELECT user_id,
         COUNT(*) AS total,
         ROW_NUMBER() OVER (PARTITION BY user_id) - 1 AS slot_offset
  FROM (
    SELECT user_id, id,
           ((ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) - 1) / 10) AS grp
    FROM seeds
  ) sub
  GROUP BY user_id, grp
)
INSERT INTO inventory_items (user_id, slot_index, item_type, quantity)
SELECT user_id,
       LEAST(slot_offset::INTEGER, 9),
       'seed',
       LEAST(total::INTEGER, 10)
FROM seed_counts
WHERE total > 0
ON CONFLICT (user_id, slot_index) DO NOTHING;
```

### Semântica dos tipos

| `item_type`     | `plant_id` | `quantity`    | `label` | Empilhável |
|----------------|-----------|--------------|---------|-----------|
| `seed`          | NULL      | 1–10         | NULL    | Sim       |
| `wrapping_kit`  | NULL      | 1–10         | NULL    | Sim       |
| `wrapped_plant` | plant UUID| 1 (fixo)     | Livre   | Não       |
| `plant`         | plant UUID| 1 (fixo)     | NULL    | Não       |

### Mudanças em tabelas existentes

A tabela `seeds` é **deprecada** no código — as rotas de API que inserem/removem seeds passam a usar `inventory_items`. A tabela `seeds` permanece no banco por segurança durante a transição.

---

## 2. Tipo TypeScript

```ts
// src/types/index.ts — adicionar:
export type InventoryItemType = 'seed' | 'wrapping_kit' | 'wrapped_plant' | 'plant';

export interface InventoryItem {
  id: string;
  user_id: string;
  slot_index: number;
  item_type: InventoryItemType;
  plant_id: string | null;
  quantity: number;
  label: string | null;
  created_at: string;
}
```

---

## 3. API Routes

### `GET /api/inventory` — lê os 10 slots do usuário

Returns `InventoryItem[]` (slots vazios não retornados — client preenche).

### `POST /api/inventory/use-kit` — embrulha uma planta

Body: `{ userId, plantId }`

1. Verificar que o usuário tem ≥1 slot `wrapping_kit`
2. Verificar que `plantId` pertence ao usuário e está num pot
3. Verificar que há slot livre no inventário (< 10 itens não-seed, contando todos os slots)
4. Em transação atômica:
   - Remove planta do pot (`pots.plant_id = NULL`)
   - Cria `inventory_items` row: `item_type='wrapped_plant', plant_id=plantId, quantity=1`
   - Decrementa quantity do kit (remove row se quantity chega a 0)
5. Return: novo inventory item

### `POST /api/inventory/open-gift` — abre um presente embrulhado

Body: `{ userId, itemId }`

1. Busca `inventory_items` row com `id=itemId`, `item_type='wrapped_plant'`, `user_id=userId`
2. Verifica que há slot livre para o `plant`
3. Atualiza o row: `item_type='plant'` (plant_id permanece, label limpo)
4. Return: item atualizado + plant data (dna para raridade da animação)

### `PATCH /api/inventory/label` — edita etiqueta

Body: `{ userId, itemId, label }`

Valida `label.length <= 100`, atualiza o row.

### `POST /api/inventory/plant-from-inventory` — planta no jardim (futuro)

Fora do escopo deste spec — placeholder documentado.

---

## 4. Loja — Kit de Embrulho

### `src/config/economy.ts`

Adicionar ao `STORE_PRODUCTS`:
```ts
{
  id: 'wrapping_kit',
  name: '🎁 Kit de Embrulho',
  description: 'Embrulha uma planta como presente misterioso. A surpresa fica no inventário.',
  cost_coins: 20,
}
```

### `src/app/api/store/buy/route.ts`

Handler para `wrapping_kit`:
```ts
if (product.id === 'wrapping_kit') {
  // Verificar capacidade do inventário (< 10 slots usados)
  // Encontrar próximo slot livre ou empilhar em kit existente
  // Inserir/atualizar inventory_items
}
```

---

## 5. Inventário UI — Painel Flutuante

### Posição

Botão flutuante no **canto inferior esquerdo** do `Garden` (shovel fica no direito). Ícone: `Package` do lucide-react com badge de contagem total de itens.

### Layout do painel

```
┌────────────────────────────┐
│  🎒 Inventário   [✕]       │
│                            │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ │
│  │🌱│ │🎁│ │  │ │  │ │  │ │
│  │×3│ │×1│ │  │ │  │ │  │ │
│  └──┘ └──┘ └──┘ └──┘ └──┘ │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ │
│  │  │ │  │ │  │ │  │ │  │ │
│  └──┘ └──┘ └──┘ └──┘ └──┘ │
│                            │
│  [Embrulhar planta]  (se   │
│   tem wrapping_kit)        │
└────────────────────────────┘
```

- Grade 5×2 de slots (10 total)
- Slot de `seed`: ícone de semente verde + `×N`
- Slot de `wrapping_kit`: ícone de caixa embrulhada + `×N`
- Slot de `wrapped_plant`: caixa com laço colorido + ícone "ⓘ" no canto (hover mostra label)
- Slot de `plant`: imagem da planta (miniatura) + badge de raridade
- Slot vazio: borda pontilhada cinza

### Botão "Embrulhar planta"

Aparece no rodapé do painel quando o usuário tem ≥1 `wrapping_kit`. Ao clicar:
- Painel fecha
- Jardim entra em modo seleção (`wrappingMode=true`)
- Plantas no jardim mostram anel pulsante verde; hover escurece o fundo
- Clicar numa planta → confirm dialog → API `use-kit`

---

## 6. Fluxo de embrulhar (modo seleção no jardim)

1. Usuário clica "Embrulhar planta" no painel do inventário
2. Painel fecha, `wrappingMode=true` no Garden state
3. Plantas plantadas (`state === 'planted'`) recebem `ring-2 ring-green-400 cursor-pointer`
4. Hover: overlay semitransparente com "🎁 Embrulhar"
5. Click: `confirm("Embrulhar esta planta? 1 kit de embrulho será consumido.")`
6. `POST /api/inventory/use-kit` → planta some do pot, vai ao inventário
7. `wrappingMode=false`, inventário atualiza, React Query invalida `['inventory', userId]` e `['garden', 'pots', userId]`
8. Cancela: botão "Cancelar" no toolbar ou tecla `Escape`

---

## 7. Slot `wrapped_plant` — label editável

- Ícone "ⓘ" no canto superior direito do slot
- Hover sobre ⓘ: tooltip com o texto da label (ou "Sem etiqueta" se vazio)
- Click no ⓘ: abre um `<input>` inline no slot com o texto atual
- Blur/Enter: `PATCH /api/inventory/label`
- Máximo 100 caracteres

---

## 8. Animação de abertura (`wrapped_plant` → `plant`)

Ao clicar num slot `wrapped_plant`:

1. **Confirmar**: "Abrir o presente?"
2. **Fase 1 — Balançar** (0–0.8s): ícone da caixa anima com `@keyframes gift-shake` (rotate ±12°, acelerando)
3. **Fase 2 — Flash** (0.6–0.9s): fundo do slot vai de transparente a branco e volta
4. **Fase 3 — Explosão** (0.8–1.4s): partículas da cor da raridade da planta explodem para fora (reutiliza o sistema de partículas do `RarityEffect`, mas em modo "single burst" — não loop)
5. **Fase 4 — Reveal** (1.2–1.8s): caixa escala para 0 com fade out; imagem da planta surge com `scale-in zoom` + `RarityEffect alwaysVisible`
6. API `POST /api/inventory/open-gift` é chamada no início da Fase 3 (não aguarda para não cortar a animação)

### Novos keyframes em `globals.css`

```css
@keyframes gift-shake {
  0%  { transform: rotate(0deg); }
  15% { transform: rotate(-8deg); }
  30% { transform: rotate(8deg); }
  45% { transform: rotate(-12deg); }
  60% { transform: rotate(12deg); }
  75% { transform: rotate(-8deg); }
  90% { transform: rotate(8deg); }
  100%{ transform: rotate(0deg); }
}

@keyframes gift-explode {
  0%   { transform: scale(1); opacity: 1; }
  60%  { transform: scale(1.5); opacity: 0.6; }
  100% { transform: scale(0); opacity: 0; }
}

@keyframes gift-reveal {
  0%   { transform: scale(0.3) rotate(-5deg); opacity: 0; }
  60%  { transform: scale(1.1) rotate(2deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}
```

---

## 9. Hook React Query

```ts
// src/hooks/useInventory.ts
export function useInventory(userId: string | undefined)
// queryKey: ['inventory', userId]
// staleTime: 30_000

export function useOpenGift(userId: string)
// useMutation → onSuccess: invalidate ['inventory', userId]

export function useWrapPlant(userId: string)
// useMutation → onSuccess: invalidate ['inventory', userId] + ['garden', 'pots', userId]

export function usePatchLabel(userId: string)
// useMutation → onSuccess: invalidate ['inventory', userId]
```

---

## 10. Mapa de arquivos

### Plano A — Inventário

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/20260622010000_inventory.sql` | Criar — tabela + migração seeds |
| `src/types/index.ts` | Modificar — `InventoryItem`, `InventoryItemType` |
| `src/app/api/inventory/route.ts` | Criar — `GET /api/inventory` |
| `src/app/api/inventory/label/route.ts` | Criar — `PATCH /api/inventory/label` |
| `src/app/api/store/buy/route.ts` | Modificar — handler `wrapping_kit` |
| `src/config/economy.ts` | Modificar — produto `wrapping_kit` |
| `src/hooks/useInventory.ts` | Criar — hook React Query |
| `src/components/InventoryPanel.tsx` | Criar — painel flutuante 10 slots |
| `src/components/Garden.tsx` | Modificar — botão flutuante + `wrappingMode` |
| `src/hooks/useWallet.tsx` | Modificar — `seedCount` lê de `inventory_items` |
| `src/services/inventoryService.ts` | Modificar — `plantSeed` usa `inventory_items` |

### Plano B — Embrulho

| Arquivo | Ação |
|---------|------|
| `src/app/api/inventory/use-kit/route.ts` | Criar — `POST /api/inventory/use-kit` |
| `src/app/api/inventory/open-gift/route.ts` | Criar — `POST /api/inventory/open-gift` |
| `src/app/globals.css` | Modificar — keyframes `gift-shake`, `gift-explode`, `gift-reveal` |
| `src/components/InventoryPanel.tsx` | Modificar — slot `wrapped_plant` com label + animação de abertura |
| `src/components/Garden.tsx` | Modificar — modo seleção de embrulho |
| `src/hooks/useInventory.ts` | Modificar — adicionar `useOpenGift`, `useWrapPlant`, `usePatchLabel` |

---

## Self-review

### Placeholder scan
Nenhum TBD. Todos os campos, rotas e keyframes estão especificados.

### Consistência interna
- `plantSeed` em `inventoryService.ts` atualmente remove uma row da tabela `seeds`. Com a migração, deverá decrementar `quantity` em `inventory_items` (ou remover o row se `quantity=1`). ✓ capturado no mapa de arquivos.
- `useWallet.tsx` usa `supabase.from('seeds').select('*', {count: 'exact'})`. Com migração, deverá buscar `inventory_items` com `item_type='seed'` e somar `quantity`. ✓ capturado.
- A animação de abertura chama a API no início da Fase 3 (não aguarda para não cortar). O risco: API falha mas animação já tocou. Mitigação: se a API falhar, reverter o slot de volta para `wrapped_plant` com uma mensagem de erro toast.
- `plant` no inventário (após abertura) tem `pot_id=NULL`. Distinção de uma planta "sem pot" vs "em inventário": presença de row em `inventory_items` com `item_type='plant'`.

### Ambiguidades resolvidas
- Kits comprados em sequência empilham no mesmo slot (quantity++), não criam slots separados.
- Planta embrulhada "sem etiqueta" mostra "Sem etiqueta" no tooltip, não string vazia.
- Wrapping mode cancela automaticamente ao abrir o painel do inventário novamente ou pressionar Escape.
- A migração de seeds aplica LEAST(count, 10) por slot — usuários com >10 seeds perdem o excedente (improvável no estágio atual do jogo).
