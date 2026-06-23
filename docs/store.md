# Loja & Moedas

Base de conhecimento da economia de moedas e da Loja.

## Modelo

```
R$ → moedas → produtos (sementes)
```

- O usuário compra **moedas** com reais.
- Gasta moedas na **Loja** para adquirir produtos.
- Hoje o único produto é a **Semente** (5 moedas).

> **Pagamento é MOCK.** Ainda não há Stripe. Ao "comprar" um pacote, as moedas são
> creditadas direto. A integração real de pagamento fica para o fim do projeto.
> O ponto de entrada está marcado com `TODO(stripe)` em
> `src/app/api/coins/purchase/route.ts`.

---

## Pacotes de moedas

Definidos em `src/config/economy.ts` (`COIN_PACKAGES`):

| id        | Preço  | Moedas |
|-----------|--------|--------|
| `pkg_10`  | R$ 10  | 10     |
| `pkg_50`  | R$ 50  | 60     |
| `pkg_100` | R$ 100 | 140    |

---

## Produtos da Loja

Definidos em `src/config/economy.ts` (`STORE_PRODUCTS`):

| id     | Nome     | Custo     |
|--------|----------|-----------|
| `seed` | Semente  | 5 moedas  |

`src/config/economy.ts` é a **fonte única de verdade** — importada tanto pela UI
quanto pelas rotas de API. O servidor **nunca** confia em preço/quantidade
enviados pelo client: ele busca o pacote/produto por `id` e usa os valores da config.

---

## Data model

Saldo de moedas: coluna `coins INTEGER NOT NULL DEFAULT 0` em `profiles`.

Mutações de saldo são **somente server-side** (`supabaseAdmin`) e **atômicas**, via
funções SQL (migration `supabase/migrations/20260621010000_coins_store.sql`):

- `add_coins(p_user_id, p_amount)` → credita e retorna o novo saldo.
- `spend_coins(p_user_id, p_amount)` → debita com guarda `coins >= p_amount`;
  levanta `INSUFFICIENT_COINS` se o saldo não cobrir. Evita saldo negativo / double-spend.

---

## Rotas de API

### `POST /api/coins/purchase`
Body: `{ userId, packageId }`.
- Valida `packageId` em `COIN_PACKAGES` (400 se inválido).
- **MOCK**: credita via `add_coins` sem passar por gateway de pagamento.
- Registra `transactions` (`item_type='coins'`, `amount=price_brl`, `status='completed'`).
- Retorna `{ success, coins, granted }`.

### `POST /api/store/buy`
Body: `{ userId, productId }`.
- Valida `productId` em `STORE_PRODUCTS`.
- Debita com `spend_coins`; se insuficiente → `400 { code: 'INSUFFICIENT_COINS' }`.
- Para `seed`: insere linha em `seeds`. Se o insert falhar após o débito, faz
  **refund** com `add_coins`.
- Retorna `{ success, coins, product }`.

### `POST /api/plants/plant` (relacionado)
- Sem semente no inventário → `400 { code: 'NO_SEEDS' }` (antes era 500).
  A UI usa esse código para abrir o popup de moedas.

---

## Fluxo do popup "sem semente"

Componente: `src/components/CoinPurchaseModal.tsx`.

1. Usuário clica para plantar num vaso vazio sem ter sementes.
2. `Garden` recebe `NO_SEEDS` da API e abre o `CoinPurchaseModal` com o `potId`.
3. O popup mostra o saldo + os 3 pacotes de moedas.
4. Ao comprar um pacote, as moedas são creditadas (mock) e o saldo atualiza.
5. Com saldo ≥ 5, aparece o CTA **"Comprar semente e plantar (5 moedas)"**.
6. Ao clicar: compra a semente (`/api/store/buy`) e, como há `potId`, planta no
   vaso (`/api/plants/plant`) e fecha.

Quando aberto pela **Loja** (sem `potId`), comprar a semente apenas a adiciona ao
inventário (não planta).

---

## Estado compartilhado (carteira)

`src/hooks/useWallet.tsx` (`WalletProvider` em `layout.tsx`) centraliza saldo de
moedas + contagem de sementes. Sidebar, Inventário, Loja e o modal consomem o
mesmo estado, então qualquer compra reflete em todos os pontos via `refresh()` /
`setCoins()` — sem `window.location.reload()`.

---

## UI

- **Sidebar** (`src/components/Sidebar.tsx`): chip de moedas no topo + item de menu
  **Loja** (`/loja`). Compartilhada entre Home e Loja.
- **Página da Loja** (`src/app/loja/page.tsx`): saldo em destaque, botão "comprar
  moedas" (abre o modal) e grade de produtos.
- **Inventário** (`src/components/Inventory.tsx`): só exibe a contagem de sementes
  (sem mais botão de compra direta).
