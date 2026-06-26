# Integração Stripe — Pagamentos

Documenta o fluxo de compra de **moedas** com dinheiro real via Stripe Checkout.

> Somente os **pacotes de moedas** passam pela Stripe. Sementes e kits de
> embrulho são comprados com moedas in-game (ver [store.md](store.md)).

---

## 1. Visão geral

**Arquitetura:** Stripe Checkout *hosted* (redirect). O usuário sai do site,
paga na página do Stripe e volta. O crédito das moedas é garantido pelo
**webhook**, não pela página de retorno.

```
[Loja] usuário clica "Comprar"
  └─> POST /api/coins/create-checkout      (cria a Checkout Session)
        └─> redirect → checkout.stripe.com  (usuário paga)
              ├─> redirect de volta → /loja?success={SESSION_ID}   (UI otimista)
              └─> Stripe chama POST /api/webhooks/stripe           (FONTE DE VERDADE)
                    └─> add_coins(userId, coins) + registra transação
```

**Princípio de segurança:** o preço e a quantidade de moedas vêm SEMPRE do
servidor ([`economy.ts`](../src/config/economy.ts)). O cliente só envia o
`packageId`. Nunca se confia em valores do navegador.

---

## 2. Arquivos

| Arquivo | Papel |
|---------|-------|
| `src/lib/stripe.ts` | Cliente Stripe server-side (`null` se não configurado) |
| `src/app/api/coins/create-checkout/route.ts` | Cria a Checkout Session (requer JWT) |
| `src/app/api/webhooks/stripe/route.ts` | Recebe o evento de pagamento e credita moedas |
| `src/app/api/coins/purchase/route.ts` | **Desativado** (mock antigo) → retorna 410 |
| `src/config/economy.ts` | Fonte única dos preços (`COIN_PACKAGES`) |
| `src/components/CoinPurchaseModal.tsx` | Botão "Comprar" → redireciona ao Stripe |
| `src/app/loja/page.tsx` | Banner de retorno `?success` / `?canceled` |

---

## 3. Preços (fonte única)

Definidos em [`src/config/economy.ts`](../src/config/economy.ts) →
`COIN_PACKAGES`. O preço é enviado ao Stripe como `price_data` **inline**
(centavos = `price_brl × 100`), então **não é preciso criar produtos no
dashboard do Stripe**.

| ID | Nome | Moedas | Bônus | Preço |
|----|------|--------|-------|-------|
| `pkg_10` | Saco de moedas | 10 | — | R$ 10 |
| `pkg_50` | Cesta de moedas | 65 | +30% | R$ 50 |
| `pkg_100` | Baú de moedas | 150 | +50% | R$ 100 |

Para alterar qualquer valor, edite **apenas** `economy.ts`.

---

## 4. Variáveis de ambiente

No Vercel (Settings → Environment Variables) **e** em `.env.local`:

```
STRIPE_SECRET_KEY=sk_test_... | sk_live_...     # dashboard.stripe.com/apikeys
STRIPE_WEBHOOK_SECRET=whsec_...                 # gerado ao criar o webhook
```

- Não é necessária a publishable key — o redirect usa `session.url` direto,
  sem Stripe.js no cliente.
- Sem essas variáveis, a compra falha de forma controlada (rota retorna 500),
  sem quebrar o resto do app.

> Após adicionar/alterar variáveis no Vercel é preciso **redeploy** para aplicar.

---

## 5. Webhook

**Endpoint:** `https://brotaria.vercel.app/api/webhooks/stripe`
**Evento:** `checkout.session.completed`

Criar em [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
→ *Add endpoint* → copiar o *Signing secret* (`whsec_...`) para
`STRIPE_WEBHOOK_SECRET`.

O handler:
1. Verifica a assinatura com `STRIPE_WEBHOOK_SECRET` (rejeita 400 se inválida).
2. Confere `payment_status === 'paid'`.
3. Lê `userId` e `coins` da `metadata` da sessão.
4. **Idempotência:** se já existe `transactions.stripe_session_id = session.id`,
   ignora (evita crédito duplicado em retries do Stripe).
5. Credita via RPC `add_coins(p_user_id, p_amount)`.
6. Registra em `transactions` (`item_type='coins'`, `amount=R$`, `stripe_session_id`).

> Se o crédito falhar, o handler retorna 500 de propósito — o Stripe reenvia o
> evento automaticamente (retry).

---

## 6. Banco de dados

Tabela `transactions` (idempotência via coluna única):

```sql
ALTER TABLE transactions ADD COLUMN stripe_session_id text UNIQUE;
```

RPC usado: `add_coins(p_user_id uuid, p_amount integer)` — crédito atômico já
existente (ver migration `20260621010000_coins_store.sql`).

---

## 7. Testes

**Cartões de teste (modo TESTE):**

| Cenário | Número |
|---------|--------|
| Pagamento aprovado | `4242 4242 4242 4242` |
| Requer autenticação 3DS | `4000 0025 0000 3155` |
| Pagamento recusado | `4000 0000 0000 9995` |

Validade: qualquer data futura · CVC: qualquer 3 dígitos.

**Checklist end-to-end:**
1. Comprar pacote → redireciona ao Stripe → pagar com `4242...`
2. Voltar à loja → banner "Pagamento concluído" → saldo atualiza em ~2-12s
3. Conferir `transactions` com o `stripe_session_id` preenchido
4. Reenviar o mesmo evento no dashboard → não credita de novo (idempotência)
5. Cartão `4000...9995` → sem crédito

**Teste local do webhook (Stripe CLI):**
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# usar o whsec_... que o CLI imprime como STRIPE_WEBHOOK_SECRET local
stripe trigger checkout.session.completed
```

---

## 8. Ir ao vivo (produção)

1. Ativar a conta Stripe (dados bancários + verificação de identidade).
2. Trocar `STRIPE_SECRET_KEY` para `sk_live_...` no Vercel.
3. Criar um **novo webhook** no modo LIVE → novo `whsec_...` → atualizar
   `STRIPE_WEBHOOK_SECRET`.
4. Redeploy.
5. Fazer uma compra real de baixo valor para validar ponta a ponta.

---

## 9. Rate limiting

`/api/coins/create-checkout` é limitado a **8 req/min por IP**
([`src/middleware.ts`](../src/middleware.ts)). O webhook `/api/webhooks/stripe`
**não** é limitado — o Stripe precisa de acesso livre.
