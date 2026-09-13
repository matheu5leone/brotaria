# Brotaria nas lojas — Capacitor (Android + iOS)

**Data:** 2026-09-13 · substitui a versão de 2026-08-25, que recomendava TWA
**Status:** Plano — decisões em aberto marcadas.

---

## Context

O jogo precisa ir para a Google Play e, de preferência, para a App Store. A
versão anterior deste plano recomendava TWA, que é **exclusiva de Android** —
com iOS no escopo, ela sai.

A recomendação agora é **Capacitor, sem trocar de linguagem**: continua
TypeScript + React + Next.js, e o Capacitor gera os projetos nativos Android e iOS
a partir do mesmo código.

**Por que não reescrever em React Native ou Flutter:** o jogo é DOM do começo ao
fim — `setPointerCapture` nos 8 arrastes, `document.elementsFromPoint` para achar
o canteiro, hitbox de canteiro por `clip-path`, animações em `@keyframes`, SVG no
HexButton. Nada disso existe fora do navegador. Reescrever seria refazer o jogo.

**O que viabiliza o Capacitor aqui:** todas as 15 páginas do jogo já são client
components. O front já é, na prática, um SPA — dá para empacotar os arquivos
**dentro do app**, e só as 65 rotas de `/api/*` continuam na Vercel.

**O que não muda:** Supabase (banco, RLS, auth), a Vercel servindo a API, toda a
lógica do jogo e o ritual de release.

---

## 1. A decisão de arquitetura: dois alvos de build

| Alvo | Onde roda | O que contém |
|---|---|---|
| **web** (o de hoje) | Vercel | Next.js completo: páginas + API + proxy + headers + redirects |
| **app** (novo) | dentro do Capacitor | Só as páginas, exportadas como estático (`output: 'export'`) |

O app chama a API da Vercel por HTTPS. É uma bifurcação no `next.config.ts`
controlada por uma env var (`BUILD_TARGET=app`).

### Por que não "app que abre a URL do site"

O Capacitor também aceita apontar para `https://brotaria.online` (`server.url`),
e aí nada precisaria mudar. É ótimo **para prototipar em uma hora**, mas é o
caminho mais curto para ser reprovado na Apple (Guideline 4.2, "app que é só um
site"), e não abre sem internet. Serve para a Fase 0; não serve para publicar.

### O que o static export do Next 16 NÃO suporta — e onde isso bate no jogo

Conferido na doc local (`node_modules/next/dist/docs/01-app/02-guides/static-exports.md`),
não na memória:

| Recurso não suportado | Onde está no Brotaria | Saída |
|---|---|---|
| Route Handlers que usam `Request` | as 65 rotas de `/api` | ficam só no build **web** |
| Rotas dinâmicas sem `generateStaticParams` | `/jardim/[nickname]`, `/convite/[code]` | ler o parâmetro no cliente |
| `headers()` | a CSP inteira | não se aplica ao app (assets locais) |
| `redirects()` | `brotaria.vercel.app → .online` | só faz sentido no web |
| Proxy (antigo middleware) | rate limit de 6 rotas de API | fica na Vercel, junto da API |
| Image Optimization padrão | — | **já resolvido**: `images.unoptimized: true` |

---

## 2. O que quebra quando a origem vira `capacitor://localhost`

Dentro do app, a página não está mais em `brotaria.online`. Isso quebra coisas que
hoje funcionam por acaso:

### 2.1 Chamadas de API relativas — 66 em 29 arquivos

`authFetch('/api/craft')` passaria a buscar no próprio pacote do app, não na
Vercel. **A boa notícia:** quase tudo já passa pelo `authFetch`, que é um ponto
único. Ele ganha um prefixo de base (`''` no web, `https://brotaria.online` no
app).

Sobram **7 chamadas de `fetch` cru** que fogem desse funil e precisam entrar nele:
`completar-perfil` (2), `signup`, `useAuth`, `jardim/[nickname]`, `useGifts`,
`useRanking` — mais o `reportClientError` da telemetria.

### 2.2 CORS

Hoje a API só recebe chamada da mesma origem. O app é outra origem —
`capacitor://localhost` no iOS, `https://localhost` no Android. As rotas de
`/api` precisam responder com os cabeçalhos de CORS para essas origens. Um lugar
só: o proxy.

### 2.3 Links de convite e de jardim — **bug que já vale corrigir no web**

`BottomNav` e `Sidebar` copiam links com `window.location.origin`. No app isso
copiaria `capacitor://localhost/convite/X` — **um link de convite que ninguém mais
consegue abrir**, e sem erro visível. Os 4 pontos passam a usar `getSiteUrl()`,
que já existe. Vale fazer agora, independente do app.

### 2.4 Redirects de autenticação

Três `redirectTo` usam `window.location.origin` e apontariam para o app:

- login com Google (`login/page.tsx`)
- confirmação de e-mail (`signup/page.tsx`)
- redefinir senha (`esqueci-senha/page.tsx`)

Tratados na Fase 2.

---

## 3. Autenticação nativa

**Google bloqueia OAuth dentro de WebView** (`disallowed_useragent`). O login não
pode acontecer dentro do app — tem que abrir o navegador do sistema:

```
toque em "Entrar com Google"
  → @capacitor/browser abre o navegador do sistema
  → Google autentica
  → redireciona para https://brotaria.online/auth/callback
  → App Link / Universal Link devolve o controle ao app
  → App.addListener('appUrlOpen') entrega os tokens ao Supabase
```

E-mail de confirmação e de redefinição de senha passam a apontar para a URL web,
que abre o app pelo mesmo link universal. As URLs novas entram na allowlist de
redirect do Supabase.

> **Atenção ao hash do callback.** O projeto já teve dor com o formato do
> `#access_token=…` no callback do OAuth. É o primeiro teste em aparelho real,
> não o último.

### Sign in with Apple — obrigatório na prática para o iOS

As diretrizes da Apple (4.8) exigem que app com login social de terceiros ofereça
também uma opção de login com proteção de privacidade equivalente. O jogo tem
login com Google, então o caminho seguro é **adicionar Sign in with Apple** no
iOS. O Supabase suporta o provedor. Sem isso, a reprovação é provável.

---

## 4. Pagamento nas lojas

As duas lojas exigem o sistema delas para vender moeda de jogo: **Play Billing**
(15%) e **Apple IAP** (30%, ou 15% no Small Business Program). Vender por Stripe
dentro do app é motivo de reprovação.

**O tamanho do problema hoje:** 77 transações, só **3 com valor real, R$120 no
total**. Migrar agora é barato; com base instalada, seria cirurgia.

### Recomendação: RevenueCat

Um SDK para as duas lojas, com validação do recibo no servidor e webhook. Sem
ele, seriam duas integrações de loja e duas validações de recibo escritas à mão.
O plano gratuito cobre a escala atual do jogo com folga (confirmar os limites
vigentes antes de contratar).

```
loja
  └─ plataforma nativa?
       sim → RevenueCat → webhook → add_coins   (app)
       não → Stripe     → webhook → add_coins   (web, o de hoje)
```

O crédito continua no **mesmo RPC `add_coins`**. Muda quem avisa que o pagamento
aconteceu, não como a moeda entra.

---

## 5. A mudança que mais afeta o seu dia a dia: atualização

Hoje, `git push` = jogo atualizado para todo mundo em minutos. Com os arquivos
empacotados no app, **toda mudança de tela vira build novo e revisão da loja** —
horas na Play, até dias na Apple. Para quem publica várias vezes por semana, isso
é a maior mudança do projeto inteiro.

**Saída: live updates (OTA)** — Capgo ou Ionic Appflow. O app baixa o novo pacote
de HTML/CSS/JS sem passar pela loja. As duas lojas permitem isso para código web,
desde que a atualização não mude a finalidade do app. Mudança nativa (plugin
novo, permissão nova) continua exigindo build.

**Decisão em aberto:** adotar OTA desde o lançamento, ou aceitar o ritmo de loja
no começo.

---

## 6. Riscos a verificar no aparelho real

| Risco | Por quê |
|---|---|
| **Turnstile no cadastro** | O captcha valida o hostname, e `capacitor://localhost` não é um. No app, provavelmente trocar por atestado nativo (Play Integrity / App Attest) em vez de Turnstile. |
| **Patch de `new Headers()`** | `supabase.ts` já tem um conserto específico para Chrome Mobile Android. A WebView do Android é Chromium, então deve valer — conferir. |
| **Realtime dos presentes** | `useGifts` usa WebSocket do Supabase. Confirmar que conecta a partir da origem do app. |
| **Arrastes por `setPointerCapture`** | O coração do jogo. É o primeiro teste da Fase 0. |
| **`chunkReload.ts`** | A proteção contra chunk quebrado não faz sentido com arquivos locais. Inofensiva, mas a telemetria dela precisa da base de API. |

---

## 7. Fases

| Fase | O quê | Resultado |
|---|---|---|
| **0 · Spike** (1–2 dias) | Capacitor apontando para a URL ao vivo → jogo no seu celular em 1 hora. Depois, um export estático mínimo com a API de fora. | Prova que arrastes, realtime e o export funcionam **antes** de investir no resto. |
| **1 · Dois alvos de build** | Base de API no `authFetch` + as 7 chamadas cruas; CORS no proxy; `next.config` bifurcado; rotas dinâmicas lidas no cliente; **links de convite via `getSiteUrl()`**. | O app abre de verdade, com arquivos locais. |
| **2 · Auth nativa** | Navegador do sistema para o Google; App Links / Universal Links; allowlist no Supabase; Sign in with Apple. | Login funcionando nas duas plataformas. |
| **3 · Pagamento** | RevenueCat + webhook → `add_coins`; produtos nas duas lojas; Stripe mantido no web. | Loja de moedas dentro da regra das lojas. |
| **4 · Google Play** | Conta (US$25), assinatura, `assetlinks.json`, página `/privacidade`, formulário de segurança de dados, classificação, faixa de teste interno. | App Android publicado. |
| **5 · App Store** | **Mac com Xcode** (obrigatório), Apple Developer (US$99/ano), `apple-app-site-association`, APNs, TestFlight, cuidados com a 4.2. | App iOS publicado. |
| **6 · Push** | `@capacitor/push-notifications` (FCM + APNs), tabela de tokens, gatilhos: abelha apareceu, planta com sede, presente recebido, obra terminou. | O maior ganho de retenção que o app dá sobre o site. |

**Por que Android antes do iOS:** a Play revisa mais rápido e não tem a 4.2, então
valida todo o encanamento nativo (auth, pagamento, links) com menos atrito. Como
o Capacitor já gera os dois projetos, o iOS depois é configuração, não migração.

---

## 8. Pré-requisitos que não são código

- **Um Mac.** Xcode só roda em macOS. Sem Mac não existe build de iOS — dá para
  alugar (MacinCloud, runners de CI em macOS), mas não dá para contornar.
- **Contas:** Google Play Console (US$25, uma vez) e Apple Developer (US$99/ano).
- **Página de política de privacidade** pública — hoje não existe.

---

## 9. Decisões que dependem de você

1. **Live updates (OTA) desde o lançamento?** Recomendo sim — preserva o ritmo de
   publicar várias vezes por semana.
2. **Taxa das lojas: absorver ou repassar?** Com R$120 de receita histórica,
   recomendo absorver.
3. **Stripe continua no web?** Recomendo sim: preserva quem joga no desktop.
4. **Você tem acesso a um Mac?** Define quando a Fase 5 pode começar.
5. **Push no lançamento ou depois?** Recomendo depois.
