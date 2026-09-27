# Brotaria nas lojas — Capacitor (Android + iOS)

**Data:** 2026-09-13 · substitui a versão de 2026-08-25, que recomendava TWA
**Status:** Plano — decisões tomadas em 2026-09-13 (§9). Lançamento **só Android**; iOS fica para depois.

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
que já existe.

**Feito em 2026-09-13.** Detalhe que quase passou: o `getSiteUrl()` lê
`VERCEL_PROJECT_PRODUCTION_URL`, que só existe no servidor — num client component
ele caía no fallback de `localhost`. O `next.config.ts` agora resolve o valor no
build e o embute como `NEXT_PUBLIC_SITE_URL`. No build **app**, a env var
precisa estar presente na máquina que gera o pacote.

### 2.4 Redirects de autenticação

Três `redirectTo` usam `window.location.origin` e apontariam para o app:

- login com Google (`login/page.tsx`)
- confirmação de e-mail (`signup/page.tsx`)
- redefinir senha (`esqueci-senha/page.tsx`)

Tratados na Fase 3.

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

**Decidido:** OTA desde o lançamento (Fase 2), integrado antes do primeiro envio
à loja.

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

### Lançamento — Android

| Fase | O quê | Resultado |
|---|---|---|
| **0 · Spike** (1–2 dias) | Capacitor apontando para a URL ao vivo → jogo no seu celular em 1 hora. Depois, um export estático mínimo com a API de fora. | Prova que arrastes, realtime e o export funcionam **antes** de investir no resto. |
| **1 · Dois alvos de build** | Base de API no `authFetch` + as 7 chamadas cruas; CORS no proxy; `next.config` bifurcado; rotas dinâmicas lidas no cliente; ~~links de convite via `getSiteUrl()`~~ (feito). | O app abre de verdade, com arquivos locais. |
| **2 · Live updates (OTA)** | Capgo ou Appflow integrado **antes** do primeiro envio à loja. | Mudança de tela continua saindo sem revisão da Play — o ritmo de hoje se mantém. |
| **3 · Auth nativa** | Navegador do sistema para o Google; App Links (`assetlinks.json`); allowlist de redirect no Supabase. | Login funcionando no Android. |
| **4 · Pagamento** | Play Billing (via RevenueCat) → webhook → `add_coins`. Stripe **mantido** no web. | Loja de moedas dentro da regra da Play. |
| **5 · Google Play** | Conta (US$25), assinatura, página `/privacidade`, formulário de segurança de dados, classificação, faixa de teste interno. | App Android publicado. |

**Por que o OTA vem antes da loja:** o primeiro build enviado precisa já conter o
cliente de live update. Se ele entrar depois, todo jogador que instalou a versão
antiga fica preso nela até atualizar pela loja.

### Depois do lançamento

| Fase | O quê | Por quê esperar |
|---|---|---|
| **6 · Push** | `@capacitor/push-notifications` (FCM), tabela de tokens, gatilhos: abelha apareceu, planta com sede, presente recebido, obra terminou. | Decidido para depois do lançamento. É ganho de retenção, não requisito da loja. |
| **7 · iOS** | Mac com Xcode, Apple Developer (US$99/ano), Universal Links, APNs, **Sign in with Apple**, Apple IAP, TestFlight, cuidados com a 4.2. | Sem Mac disponível hoje. Como o Capacitor já gera o projeto iOS, isso vira configuração, não migração. |

> **RevenueCat mesmo só com Android?** Dá para integrar o Play Billing direto por
> plugin. O RevenueCat se paga pela validação do recibo no servidor, que ninguém
> precisa escrever — e quando o iOS chegar, o Apple IAP entra no mesmo SDK, sem
> uma segunda integração.

---

## 8. Pré-requisitos que não são código

- **Conta:** Google Play Console (US$25, uma vez). A Apple Developer (US$99/ano)
  só entra com o iOS.
- **Um Mac** — só para a fase do iOS, não para o lançamento. Xcode só roda em
  macOS; dá para alugar (MacinCloud, runners de CI em macOS) quando chegar a hora.
- **Página de política de privacidade** pública — hoje não existe.

---

## 9. Decisões

| # | Decisão | Resposta |
|---|---|---|
| 1 | Live updates (OTA) desde o lançamento? | **Sim** — entra como Fase 2, antes do primeiro envio à loja. |
| 2 | Taxa da Play: absorver ou repassar? | **Absorver** — mesmo preço no app e no web (ver abaixo). |
| 3 | Stripe continua no web? | **Sim.** |
| 4 | iOS no lançamento? | **Não** — sem Mac hoje. Fica como Fase 7. |
| 5 | Push no lançamento? | **Depois** — Fase 6. |

### Sobre a taxa (decisão 2)

A Play fica com **15%** de cada compra feita dentro do app (até US$1 milhão/ano).
Só vale para compra no app — quem compra pelo navegador continua no Stripe.

| Pacote | Jogador paga | Play fica com | Você recebe |
|---|---|---|---|
| Saco (10) | R$10 | R$1,50 | R$8,50 |
| Cesta (65) | R$50 | R$7,50 | R$42,50 |
| Baú (150) | R$100 | R$15,00 | R$85,00 |

Na receita histórica (R$120), a taxa teria sido **R$18**. Repassar para o preço
criaria diferença visível entre app e web para proteger quase nada — daí a
decisão de absorver agora e rever quando a receita crescer.

**Não fazer:** mensagem ou link dentro do app dizendo "compre mais barato no
site". É regra própria das lojas e motivo clássico de reprovação.

---

## 10. Estrutura de código — um repositório só

**Não é preciso outro repositório.** O app não é outro produto: são as mesmas 15
páginas, os mesmos componentes e os mesmos hooks, falando com as mesmas 65 rotas
de API. Repositório separado significaria ou duplicar tudo, ou publicar um pacote
compartilhado e versioná-lo — com um desenvolvedor só, isso custa dois rituais de
release, dois `changelog.json` (que é a fonte da verdade da versão do jogo) e a
chance permanente de o app ficar falando com uma API que já mudou. No mesmo
repositório, a mudança na API e o ajuste no cliente entram no mesmo commit.

O que o Capacitor acrescenta são pastas na raiz (`android/`, e `ios/` quando
chegar a hora) — geradas por ele e commitadas como qualquer outro código. A
Vercel continua compilando só o alvo web e ignora o resto.

```
brotaria/
├─ src/app/                    15 páginas + 65 rotas de API (as duas coisas)
├─ src/config/runtime.ts       NOVO — de onde vem a API e como se endereça o jardim
├─ scripts/build-app.mjs       NOVO — build do alvo app
├─ next.config.ts              bifurcado por BUILD_TARGET
├─ capacitor.config.ts         a criar
├─ android/                    a criar (gerado, commitado)
└─ out/                        saída do alvo app (fora do git)
```

| Comando | Faz |
|---|---|
| `npm run dev` | o de sempre |
| `npm run build` | alvo **web** na Vercel — nada mudou |
| `npm run build:app` | export estático em `out/`, pronto para o Capacitor |

### A regra que organiza tudo: o alvo app não tem servidor

No alvo app o Next roda em `output: 'export'` — HTML, CSS e JS, sem processo
nenhum. Então nada que precise de servidor pode estar lá dentro. A seleção é por
**extensão de arquivo**, sem mover nada de lugar nem manter duas árvores de rotas:

| Arquivo | Alvo web | Alvo app | Por quê |
|---|---|---|---|
| `route.ts` | entra | **fora** | as 65 rotas de API são `.ts`; página e layout são `.tsx` |
| `*.web.tsx` | entra | **fora** | rota que só o site tem (`pageExtensions`) |
| `page.tsx` / `layout.tsx` | entra | entra | a tela do jogo, igual nos dois |

### As duas coisas que essa regra obrigou a mudar

**1. A tela do jardim ganhou um segundo endereço.** `/jardim/[nickname]` não é só
a visita ao vizinho — é a tela principal do jogo, onde a home joga todo mundo
depois do login. E o export estático não gera rota dinâmica sem uma lista finita
de valores, que apelido nunca vai ter. Então a tela virou componente
(`GardenVisit`) servido por duas rotas: a URL bonita no site, e `/jardim?u=lele`
dentro do app. Link interno passa por `gardenPath()`, que escolhe conforme o
alvo; link que sai do jogo continua usando a forma bonita. **Dentro da WebView
não existe barra de endereço**, então a URL feia ali não custa nada.

**2. O card de compartilhamento virou rota de API.** A convenção
`opengraph-image.tsx` dentro de rota dinâmica não sobrevive ao export, e — testado
— o sufixo `.web.tsx` também não resolve: o Next descobre o arquivo pelo
`pageExtensions` mas resolve o módulo com uma lista fixa de extensões, e o build
do **site** quebra. O desenho do card foi para `@/lib/og/jardimCard` (módulo
comum) e é servido por `/api/og/jardim?u=<apelido>`, arquivo `.ts` que o build do
app já ignora junto com o resto da API. O `layout.web.tsx` do jardim aponta
`og:image` para lá.

### O que já está no main

| Commit | O quê |
|---|---|
| `9217349` | link de convite e de jardim pelo domínio canônico, não pela origem da página |
| `0ea19e3` | `authFetch` com base de API resolvida no build + os 7 `fetch` crus no funil; `next.config` bifurcado |
| `28f9f32` | rota `/jardim?u=`, `gardenPath()`, sufixo `.web.tsx`, card de OG na API |

Provado com build: o alvo web mantém as 4 rotas de servidor
(`/jardim/[nickname]`, `/convite/[code]`, `/api/og/jardim`, `/opengraph-image`) e
o alvo app gera 20 páginas estáticas, com `https://brotaria.online` gravado como
endereço da API.

### O que falta na estrutura, em ordem

1. **CORS** no proxy para `https://localhost` e `capacitor://localhost` — sem
   isso o app compila mas nenhuma chamada passa.
2. **Capacitor**: `capacitor.config.ts`, `npx cap add android`, `cap sync` no fim
   do `build:app`.
3. **Turnstile no cadastro** — o widget é amarrado a hostname, e dentro do app o
   hostname é `localhost`. Precisa liberar o hostname ou tratar o cadastro do app
   por outro caminho.
4. **Auth pelo navegador do sistema** (Fase 3) e **Play Billing** (Fase 4).
