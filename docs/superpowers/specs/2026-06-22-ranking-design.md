# Spec: Ranking de Plantas por Valor

**Data:** 2026-06-22
**Status:** Aprovado para implementação

---

## Escopo

Três subsistemas entregues juntos:

1. **Fórmula de score** — função pura TypeScript que valoriza cada planta
2. **Página `/ranking`** — top 5 plantas globais, pública, sem autenticação
3. **PlantHistoryModal com valor por fase** — cada card da evolução exibe o score daquela fase

---

## 1. Fórmula de Score

### Arquivo: `src/lib/scoring.ts`

Função pura exportada, sem efeitos colaterais, sem dependências de rede.

```ts
export function calcPlantScore(dna: PlantDNA, stageOrderIndex: number): number
```

**Componentes:**

| Fator | Descrição | Valor |
|-------|-----------|-------|
| `rarity_weight` | Peso por raridade | comum=1, incomum=3, raro=8, epico=20, lendario=50, brotaria=100 |
| `stage_factor` | `order_index` do estágio atual | 1 a 13 |
| `perk_bonus` | `1 + traits.length × 0.2` | mínimo 1.2 (1 trait) |

**Fórmula:** `Math.round(rarity_weight × stage_factor × perk_bonus)`

**Exemplos:**
- brotaria · stage 13 · 4 traits → `100 × 13 × 1.8 = 2340`
- lendario · stage 7 · 2 traits → `50 × 7 × 1.4 = 490`
- comum · stage 1 · 1 trait → `1 × 1 × 1.2 = 1`

**Extensibilidade:** novos fatores (flores, tamanho, bioma) são adicionados como multiplicadores opcionais dentro desta função sem quebrar consumidores existentes.

### Integração no PlantHistoryModal

Cada versão do histórico exibe seu próprio score calculado com `calcPlantScore(version.dna_snapshot, version.stage.order_index)`. Computado no cliente, sem chamada extra ao banco.

---

## 2. API `GET /api/ranking`

### Arquivo: `src/app/api/ranking/route.ts`

**Rota pública** — sem verificação de autenticação.

**Lógica:**
1. Busca todas as plantas com `supabase.from('plants').select('id, user_id, dna, current_stage:plant_stages(order_index, name, code), pot:pots(id)')`
2. Busca a última `plant_version` de cada planta (image_url)
3. Busca o `email` do dono em `profiles` para display
4. Computa `score = calcPlantScore(plant.dna, stage.order_index)` para cada planta
5. Ordena por score DESC, retorna top 5

**Response type:**
```ts
type RankingEntry = {
  rank: number;           // 1-5
  plant_id: string;
  owner_email: string;    // só o prefixo antes do @
  image_url: string | null;
  rarity: Rarity;
  stage_name: string;
  stage_order: number;
  trait_count: number;
  score: number;
  dna: PlantDNA;          // para o modal de histórico
}
```

**Cache:** `Cache-Control: public, max-age=60` — ranking atualiza a cada minuto.

---

## 3. Hook `useRanking`

### Arquivo: `src/hooks/useRanking.ts`

```ts
export function useRanking(): UseQueryResult<RankingEntry[]>
// queryKey: ['ranking']
// staleTime: 60_000
// refetchInterval: 60_000
```

Busca `GET /api/ranking`. Usado na página de ranking.

---

## 4. Página `/ranking`

### Arquivo: `src/app/ranking/page.tsx`

**Pública** — sem redirect para login, sem `useAuth()` bloqueante.

**Layout próprio** (não usa o `<Sidebar>`):
```
┌────────────────────────────────────────┐
│  [🌱 Brotaria]          [← Jardim]     │
│                                        │
│  🏆 Ranking de Plantas                 │
│  "As 5 plantas mais valiosas"          │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ #1  [imagem]  Nome do dono       │  │
│  │     Raridade · Estágio · Score   │  │
│  └──────────────────────────────────┘  │
│  ... (5 cards no total)                │
└────────────────────────────────────────┘
```

Cada card:
- Posição (#1–#5) com destaque dourado para #1
- Imagem da planta (usando `<Image>` do next/image)
- Efeito `<RarityEffect alwaysVisible>` ao redor da imagem
- Nome do dono (prefixo do email antes do `@`)
- Badge de raridade colorido com `var(--rarity-*)`
- Nome do estágio
- Score formatado com ícone de moeda: `🌿 2.340`

**Clique no card** abre `PlantHistoryModal`. Para o modal funcionar sem `PlantRow` completo, o `RankingEntry` inclui `dna` e o modal recebe um objeto compatível com `PlantRow`.

---

## 5. PlantHistoryModal — score por fase

### Arquivo: `src/components/PlantHistoryModal.tsx` (modificar)

No painel de infos (parte inferior do modal), adicionar abaixo da data/bioma:

```
🌿 {score} moedas
```

O score é calculado inline: `calcPlantScore(version.dna_snapshot, version.stage?.order_index ?? 1)`.

---

## 6. Sidebar — link para o ranking

### Arquivo: `src/components/Sidebar.tsx` (modificar)

Novo `NavLink` com ícone `Trophy` de lucide-react:

```tsx
<NavLink href="/ranking" title="Ranking" className={navItemClass('/ranking')}>
  <Trophy className="w-5 h-5 min-w-[20px]" />
  {!isSidebarCollapsed && <span>Ranking</span>}
</NavLink>
```

Colocado após "Loja" na seção de navegação principal. Funciona tanto para usuários logados quanto não logados.

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `src/lib/scoring.ts` | Criar | Função `calcPlantScore` — fonte única da fórmula |
| `src/app/api/ranking/route.ts` | Criar | Top 5 plantas por score, público |
| `src/hooks/useRanking.ts` | Criar | React Query hook para o ranking |
| `src/app/ranking/page.tsx` | Criar | Página pública com os 5 cards |
| `src/components/PlantHistoryModal.tsx` | Modificar | Score por fase no painel de infos |
| `src/components/Sidebar.tsx` | Modificar | Link "Ranking" com ícone Trophy |

---

## Self-review

### Placeholder scan
Nenhum TBD ou TODO — todos os campos e valores estão especificados.

### Consistência interna
- `calcPlantScore` usa `dna.traits.length` — `PlantDNA.traits` é `TraitInstance[]` (sempre presente, mínimo 1). ✓
- `RankingEntry.dna` permite ao `PlantHistoryModal` calcular scores por fase sem nova prop. ✓
- `PlantHistoryModal` recebe `plant: PlantRow` — ao abrir pelo ranking, passamos um objeto com pelo menos `{ id, dna }`. A prop `plant.id` é usada em `usePlantHistory(open ? plant.id : null)`. ✓

### Ambiguidades resolvidas
- "Prefixo do email" = `email.split('@')[0]`. Não expõe o domínio.
- `order_index` de versões históricas vem de `version.stage?.order_index` — pode ser null para versões antigas sem stage. Fallback: `?? 1`.
- A página pública não usa o `WalletProvider` ou `AuthProvider` — esses providers continuam no `layout.tsx` global e não causam erro em páginas públicas (eles apenas retornam valores padrão quando não há usuário).
