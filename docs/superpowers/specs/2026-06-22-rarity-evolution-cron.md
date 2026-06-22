# Spec: Raridades, Histórico de Evolução, Cron e Produto Dev

**Data:** 2026-06-22  
**Status:** Aprovado para implementação

---

## Escopo

Quatro subsistemas independentes entregues em conjunto:

1. **Expansão de raridades** — adiciona `epico` e `brotaria` ao sistema de DNA
2. **Efeitos visuais de raridade** — partículas CSS + glow no hover (jardim) e sempre visíveis (modal)
3. **Modal de histórico de evolução** — coverflow 3D com backdrop blur, abre ao clicar na planta
4. **Cron do scheduler** — Vercel Cron horário protegido por secret
5. **Produto "Avançar Tempo"** — item de loja grátis (dev only) que chama `processGrowth()`

---

## 1. Expansão de Raridades

### Tipos (`src/types/index.ts`)

```ts
export type Rarity = 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario' | 'brotaria';
```

### Probabilidades (`src/services/dnaService.ts`)

Tabela ponderada — soma = 100:

| Raridade | Peso |
|----------|------|
| comum    | 60   |
| incomum  | 15   |
| raro     | 10   |
| epico    | 5    |
| lendario | 4    |
| brotaria | 1    |

Implementação: array de pares `[rarity, weight]`, sorteio por acumulado.

### Banco de dados

Nenhuma migration necessária. `rarity` é campo dentro do JSONB `dna`, sem constraint de CHECK no Postgres.

---

## 2. Efeitos Visuais de Raridade

### Componente `RarityEffect`

**Arquivo:** `src/components/RarityEffect.tsx`

**Props:**
```ts
interface RarityEffectProps {
  rarity: Rarity;
  alwaysVisible?: boolean; // false = só no hover (jardim); true = sempre (modal)
  children: React.ReactNode;
}
```

**Estrutura:**
```
<div className="rarity-wrapper relative group/rarity">
  {/* Aura de glow (lendario: conic-gradient rotativo; outros: drop-shadow) */}
  {rarity === 'lendario' && <div className="rarity-aura-lendario" />}
  {/* Imagem da planta */}
  <div className="rarity-image-wrapper [classe-da-raridade]">
    {children}
  </div>
  {/* Partículas (5–8 spans absolutos, posição e delay via inline style) */}
  <div className={`rarity-particles ${alwaysVisible ? 'visible' : 'hidden group-hover/rarity:visible'}`}>
    {particles.map((p, i) => <span key={i} className="particle" style={p} />)}
  </div>
</div>
```

### Variáveis CSS de raridade em `:root` (`src/app/globals.css`)

Todas as cores de raridade declaradas como CSS custom properties — **nunca hex bruto** no código de componente:

```css
:root {
  --rarity-comum:    rgba(255, 255, 255, 0.85);
  --rarity-incomum:  #06b6d4;   /* cyan-500   */
  --rarity-raro:     #1e3a8a;   /* blue-900   */
  --rarity-epico:    #7c3aed;   /* violet-600 */
  --rarity-lendario: #f97316;   /* orange-500 */
  --rarity-brotaria: #4ade80;   /* green-400  */

  --rarity-brotaria-dark:  #166534;   /* green-800 — para ciclo de borda */
  --rarity-brotaria-mid:   #16a34a;   /* green-600 */
  --rarity-brotaria-light: #86efac;   /* green-300 */
}
```

### Keyframes em `src/app/globals.css`

```css
@keyframes particle-float {
  0%   { transform: translate(0, 0) scale(1); opacity: 1; }
  100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
}

@keyframes rarity-pulse-glow {
  0%, 100% { filter: var(--glow-min); }
  50%       { filter: var(--glow-max); }
}

@keyframes lendario-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

@keyframes brotaria-border {
  0%   { outline-color: var(--rarity-brotaria-mid);   }
  25%  { outline-color: var(--rarity-brotaria);       }
  50%  { outline-color: var(--rarity-brotaria-dark);  }
  75%  { outline-color: var(--rarity-brotaria-light); }
  100% { outline-color: var(--rarity-brotaria-mid);   }
}
```

### Mapeamento de efeitos por raridade

| Raridade | Partículas | Glow | Extra |
|----------|-----------|------|-------|
| comum    | `var(--rarity-comum)`, 15% opacidade | `drop-shadow(0 0 4px var(--rarity-comum))` | — |
| incomum  | `var(--rarity-incomum)`, 30% | `drop-shadow(0 0 6px var(--rarity-incomum))` | — |
| raro     | `var(--rarity-raro)`, 40% | `drop-shadow(0 0 8px var(--rarity-raro))` | — |
| epico    | `var(--rarity-epico)`, 50% | `drop-shadow(0 0 10px var(--rarity-epico))` | — |
| lendario | `var(--rarity-lendario)`, 60% | `drop-shadow(0 0 14px var(--rarity-lendario))` | `<div>` absoluto com `conic-gradient(var(--rarity-lendario), transparent, var(--rarity-lendario))` + `lendario-spin 3s linear infinite`, `z-index: -1` |
| brotaria | `var(--rarity-brotaria)`, 50% | `drop-shadow(0 0 8px var(--rarity-brotaria-mid))` | `outline: 3px solid` com `brotaria-border 2s linear infinite` |

### Integração em `Garden.tsx`

No `PotSlot` (estado `planted`), o bloco que renderiza `<Image>` é envolvido por `<RarityEffect rarity={plant.dna.rarity}>`.

**Atenção:** `PlantRow` em `src/hooks/usePlantData.ts` precisa ganhar o campo `dna: PlantDNA`:

```ts
import { PlantDNA } from '@/types';

export type PlantRow = {
  id: string;
  hydration_status: string;
  current_stage_waters: number;
  current_stage: { id: string; name: string; waters_required: number };
  dna: PlantDNA; // ← novo
};
```

O select em `fetchPlant` já usa `'*'` (que inclui `dna` do banco), então nenhuma mudança de query necessária.

`alwaysVisible={false}` — efeito só no hover.

---

## 3. Modal de Histórico de Evolução

### Trigger

No `PotSlot` (estado `planted`), clicar na área da imagem da planta dispara `setHistoryOpen(true)`. O botão de regar/deletar continua no hover overlay; o clique na imagem abre o modal.

Estado local no `PotSlot`:
```ts
const [historyOpen, setHistoryOpen] = useState(false);
```

### Componente `PlantHistoryModal`

**Arquivo:** `src/components/PlantHistoryModal.tsx`

**Props:**
```ts
interface PlantHistoryModalProps {
  plant: PlantRow;
  pot: Pot;
  open: boolean;
  onClose: () => void;
}
```

### Layout

```
┌──────────────────────────────────────────────────────┐
│  backdrop: bg-black/40 backdrop-blur-md               │
│                                                       │
│  [X] fechar (top-right)                               │
│                                                       │
│  ←  [card-2] [CARD-1-DESTAQUE] [card-3]  →           │
│         (coverflow 3D, scroll horizontal)             │
│                                                       │
│  ┌───── infos da fase em foco ─────┐                  │
│  │  ● Nome da fase  [RARIDADE]     │  (texto branco)  │
│  │    Data · Bioma                 │                  │
│  └─────────────────────────────────┘                  │
│                                                       │
└──────────────────────────────────────────────────────┘
```

Cards ficam na metade superior do modal; infos na metade inferior.

### Coverflow 3D

Scroll do mouse (`onWheel`) incrementa/decrementa `activeIndex` (0…n-1). Transição via CSS `transition: transform 0.35s ease`.

Transforms por posição relativa `delta = i - activeIndex`:

| |delta| | translateZ | rotateY | scale | opacity |
|---------|-----------|---------|-------|---------|
| 0 (foco)| 0px | 0° | 1.0 | 1.0 |
| 1 | -120px | ±25° | 0.85 | 0.7 |
| 2 | -200px | ±40° | 0.7 | 0.4 |
| ≥3 | -260px | ±50° | 0.55 | 0 (hidden) |

Container com `perspective: 1000px`. Cards sólidos (`bg-stone-900/90 rounded-2xl`).

### Dados

Novo tipo **`PlantVersionHistoryRow`** em `src/hooks/usePlantData.ts` (diferente de `PlantVersionRow` que é usado no jardim):

```ts
import { PlantDNA } from '@/types';

export type PlantVersionHistoryRow = {
  id: string;
  image_url: string | null;
  created_at: string;
  dna_snapshot: PlantDNA;
  stage: { name: string; code: string };   // join inline via Supabase
};
```

Novo hook **`usePlantHistory(plantId)`** em `src/hooks/usePlantData.ts`:

```ts
export function usePlantHistory(plantId: string | null | undefined) {
  return useQuery({
    queryKey: ['plant', plantId, 'history'],
    queryFn: () => fetchPlantHistory(plantId!),
    enabled: !!plantId,
    staleTime: Infinity,
    gcTime: 30 * 60_000,
  });
}
```

`fetchPlantHistory` faz select com join:
```ts
supabase
  .from('plant_versions')
  .select('id, image_url, created_at, dna_snapshot, stage:plant_stages(name, code)')
  .eq('plant_id', plantId)
  .order('created_at', { ascending: true })
```

Infos exibidas no painel **inferior** (derivadas da versão em foco):
- **Bolinha** `●` colorida com `color: var(--rarity-<raridade>)` + nome do estágio (`version.stage.name`)
- Nome da **raridade** em texto na cor da raridade: `color: var(--rarity-<raridade>)` — ex.: "LENDÁRIO" em laranja, "ÉPICO" em roxo
- Data formatada com `date-fns/format`
- Bioma (`version.dna_snapshot.biome`)

A cor é resolvida em runtime via `style={{ color: `var(--rarity-${rarity})` }}`.

### `RarityEffect` no modal

Cada card renderiza `<RarityEffect rarity={version.dna_snapshot.rarity} alwaysVisible={true}>` ao redor da imagem.

---

## 4. Vercel Cron

### Configuração

**Arquivo:** `vercel.json` (criar se não existir)

```json
{
  "crons": [
    {
      "path": "/api/scheduler",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

Executa a cada 15 minutos (ex.: 14:00, 14:15, 14:30, 14:45…).

### Proteção do endpoint

`/api/scheduler/route.ts` — adicionar verificação de secret antes de processar:

```ts
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  // ... processGrowth() existente
}
```

`CRON_SECRET` adicionado ao `.env.local` e documentado em `.env.example`. Vercel injeta o header automaticamente nas chamadas do cron.

---

## 5. Produto "Avançar Tempo" (Dev)

### `src/config/economy.ts`

Novo produto adicionado condicionalmente ao array `STORE_PRODUCTS`:

```ts
// Só exposto em não-produção
if (process.env.NODE_ENV !== 'production') {
  STORE_PRODUCTS.push({
    id: 'skip_time',
    name: '⏩ Avançar Tempo',
    description: '[DEV] Marca todas as plantas como aguardando rega agora.',
    cost_coins: 0,
  });
}
```

### `src/app/api/store/buy/route.ts`

Antes de chamar `spend_coins`, verificar se `product.cost_coins === 0` para pular o débito. Handler para `skip_time`:

```ts
// Produtos grátis não precisam de débito
if (product.cost_coins > 0) {
  // ... spend_coins existente
}

if (product.id === 'skip_time') {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }
  await processGrowth();
  return NextResponse.json({ success: true, product: 'skip_time' });
}
```

### UI na loja

O card do produto `skip_time` recebe um badge `DEV` vermelho no canto superior esquerdo, diferenciando visualmente dos produtos normais.

---

## Arquivos criados / modificados

| Arquivo | Ação |
|---------|------|
| `src/types/index.ts` | Modificar — adiciona `epico \| brotaria` ao tipo `Rarity` |
| `src/services/dnaService.ts` | Modificar — nova tabela de probabilidades |
| `src/app/globals.css` | Modificar — adiciona keyframes de raridade |
| `src/components/RarityEffect.tsx` | Criar |
| `src/components/PlantHistoryModal.tsx` | Criar |
| `src/hooks/usePlantData.ts` | Modificar — adiciona `usePlantHistory` |
| `src/components/Garden.tsx` | Modificar — integra RarityEffect + PlantHistoryModal |
| `src/app/api/scheduler/route.ts` | Modificar — adiciona proteção CRON_SECRET |
| `src/config/economy.ts` | Modificar — adiciona produto skip_time |
| `src/app/api/store/buy/route.ts` | Modificar — handler skip_time + bypass spend_coins para custo 0 |
| `src/app/loja/page.tsx` | Modificar — badge DEV no card skip_time |
| `vercel.json` | Criar — configuração do cron |
| `.env.example` | Criar/modificar — documenta CRON_SECRET |
