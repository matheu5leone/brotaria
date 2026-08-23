# Descoberta social — como um jogador encontra o jardim de outro

**Data:** 2026-08-23
**Status:** Design — leque de ideias para escolher, nada fechado.

---

## 1. O diagnóstico (medido, não achismo)

Números do banco de produção hoje:

| | |
|---|---|
| Contas | 54 (23 criadas nos últimos 30 dias) |
| Contas com planta | 40 |
| **Plantas visíveis no jogo** | **67** |
| **Plantas que o ranking mostra** | **5** |
| Regas de vizinho — **desde que a feature existe** | **12** |
| Contas com reputação > 0 | 6 |
| Curtidas totais | 60 |
| Jogadores ativos (regaram nos últimos 7 dias) | **12** |

Duas leituras saltam daí.

**93% da arte do jogo é inalcançável.** São 62 plantas que nenhum jogador tem como
ver, porque `/api/ranking` corta em `slice(0, 5)`. Você paga IA para gerar arte
que ninguém além do dono olha.

**O problema não é falta de mecânica social — é falta de porta de entrada.** O
jogo já tem rega de vizinho, curtida, reputação, presente e página pública de
jardim. Mas *todas* exigem que você **já saiba o @apelido de alguém**: a busca
(`/api/users/search`) faz `ilike` exato com `.single()`, ou seja, só acha quem
você já conhece. O resultado está no número: **12 regas de vizinho em toda a
história da feature**. Ela não falhou — ela nunca teve porta.

E a **reputação é um stat morto**: acumula (+1 por rega), não aparece em lugar
nenhum e não compra nada.

> **Consequência para o plano:** antes de criar mecânica social nova, vale abrir
> as portas da que já está construída e parada. É onde o retorno por hora de
> trabalho é maior.

---

## 2. Sobre a ideia do concurso semanal

A ideia é boa e eu a manteria — **mas não como primeiro passo.**

Com **12 ativos por semana**, um concurso de sábado teria talvez 5–8 inscritos e
uma dúzia de votos. O risco não é dar errado: é **parecer vazio**, e evento vazio
queima a ideia — depois de duas semanas fracas fica difícil relançar.

O concurso precisa de plateia. As ideias da §3 constroem essa plateia; o concurso
(§5) entra depois, e aí encontra gente.

Quando entrar, três decisões fazem ele funcionar em escala pequena:

- **Galeria de todos os participantes, não um pódio.** Com 6 inscritos, "galeria
  de 6" parece cheia; "top 3 de 6" parece vazia. Mesma informação, leitura oposta.
- **Tema por semana** — "a mais sombria", "a melhor do deserto", "a mais
  colorida". Tema deixa campo pequeno interessante e **abre espaço para planta
  comum ganhar**: sem tema, ganha sempre a raridade mais alta e os outros param
  de participar.
- **O vencedor vira a vitrine da semana seguinte.** O evento alimenta a
  descoberta em vez de ser um beco sem saída.

---

## 3. Abrir as portas do que já existe (maior retorno, funciona com 12 ou 12.000)

### 3.1 Página "Vizinhança" — a lista de jardins

A peça que falta. Uma página navegável de jardins, **não ordenada por score** (o
score mostra sempre os mesmos 5), e sim por faixas que rotacionam:

- **Pedindo água hoje** — o jogo **já calcula** isto: a spec da rega de vizinho
  sorteia 1 planta por jardim por dia, de forma determinística por hash
  `(dono + dia)`, sem estado no banco. Listar esses jardins é quase só expor o
  que já é computado.
- **Novatos** — jardins criados nesta semana, que nunca receberam visita.
- **Mexeram hoje** — quem regou nas últimas 24h (jardim vivo, dono provavelmente
  online).
- **Sorte** — embaralhado por dia.

É o item de maior alavancagem da lista: transforma as 2 regas diárias (hoje sem
destino) num loop real, e dá vazão às 62 plantas invisíveis.

### 3.2 Descoberta dentro da tela de água

O jogador vai à `/agua` justamente quando **tem água no bolso**. É o momento
psicológico exato para "gaste 1 água ajudando um vizinho → [jardim]". Um botão
ali provavelmente move mais o ponteiro que uma página nova, porque não depende de
o jogador procurar nada.

### 3.3 Ranking em categorias, não só o top 5 geral

O ranking geral premia acúmulo, então trava nos mesmos donos. Categorias criam
várias portas, e cada uma deixa um perfil diferente de jogador aparecer:

| Categoria | Quem ganha |
|---|---|
| Mais valiosa (atual) | veterano |
| **Mais generoso** (reputação) | quem rega os outros — **e finalmente dá função à reputação** |
| Jardim mais cheio | quem cava e planta |
| Novato da semana | conta com < 7 dias |
| Mais curtida | quem faz jardim bonito |

Um novato pode liderar "Novato da semana" na primeira semana. Isso é o que faz
alguém voltar.

### 3.4 Botão "Retribuir" no rastro de rega

O rastro já existe e **já sabe o apelido de quem regou** (`gardenSocial.waterings`
carrega `nickname`, usado hoje só para o brilho dourado de 24h em
`Garden.tsx:1388`). Falta um botão: **"@fulano regou seu jardim → Retribuir"**,
que leva direto ao jardim dele.

É provavelmente a menor quantidade de código com efeito social real de toda esta
lista: transforma notificação passiva em visita, usando dado que já está na tela.

### 3.5 Reputação visível — e com sink

Dar duas coisas à reputação:
- **Cara**: um título no seu jardim que o visitante vê ("Jardineiro Generoso",
  "Regador de Aurora"), por faixa de reputação.
- **Uso**: trocar por algo — semente, água, ou uma moldura cosmética no jardim.

Sem sink, reputação é um número que ninguém persegue. Com sink, ajudar
desconhecido vira estratégia.

---

## 4. Estruturas que fazem o mundo parecer pequeno

### 4.1 Vizinhos fixos — "sua rua"

Cada jogador recebe **3–5 vizinhos**, rotacionando por semana. Não é uma lista
infinita de estranhos: é uma vizinhança pequena e conhecível, com nome e cara.

Esta é, na minha leitura, a ideia mais forte do documento a médio prazo. Ranking
é anônimo e intimidador; **rua é familiar**. Você aprende que @maycon tem um
cacto e que @lalael sempre esquece de regar. Funciona igual com 40 ou 4.000
jogadores — e a rotação semanal impede que uma rua morta prenda alguém.

### 4.2 Jardim do Dia

Um jardim em destaque por dia, escolhido em rodízio determinístico (mesmo truque
de hash da planta que pede água — zero estado, zero moderação). Garante que
**todo mundo tem a sua vez**, inclusive quem nunca apareceria num ranking.

### 4.3 Apadrinhamento de novato

Veterano é pareado com um novato; regar o jardim dele rende reputação em dobro
por uma semana. Ataca de frente o pior momento do jogo — o novato que planta,
rega e não tem ninguém.

### 4.4 Polinização cruzada com a abelha

Amarrar descoberta na cadeia abelha→pólen→elixir que já existe, em vez de criar
sistema paralelo: visitar o jardim de um vizinho dá chance de a abelha aparecer
lá para você, ou a abelha do seu jardim traz pólen "da variedade" de um jardim
que você visitou. Dá motivo mecânico — não só social — para explorar.

---

## 5. Concurso semanal (a ideia original, posicionada)

**Ciclo:** inscrição seg–sex (1 planta por jogador) → votação no sábado (3 votos,
não pode votar em si) → resultado no domingo.

**Prêmio:** herbo + um selo permanente no jardim do vencedor + virar a vitrine da
semana seguinte.

**Requisitos de design** (ver §2): galeria de todos, tema semanal, voto de um
toque a partir da vizinhança.

**Pré-requisito honesto:** precisa da §3.1 no ar antes, senão não há de onde
votar nem para onde levar o vencedor.

---

## 6. Ordem sugerida

| # | O quê | Por quê agora |
|---|---|---|
| 1 | **Vizinhança (§3.1)** + entrada na `/agua` (§3.2) | Destrava a rega de vizinho e as 62 plantas invisíveis. Funciona com 12 ativos. |
| 2 | **Retribuir (§3.4)** + reputação visível (§3.5) | Muito barato; fecha o ciclo de reciprocidade e ressuscita um stat morto. |
| 3 | **Ranking por categorias (§3.3)** | Várias portas; novato consegue liderar algo na 1ª semana. |
| 4 | **Vizinhos fixos (§4.1)** | Estrutural. Depois que visitar já é hábito. |
| 5 | **Concurso semanal (§5)** | Quando houver plateia. |

Os itens 1 e 2 são os que eu faria primeiro — não por serem os mais bonitos, mas
porque o jogo já pagou o custo de construir a mecânica embaixo deles e ela está
parada por falta de uma lista e de um botão.

---

## 7. Como medir se funcionou

Os números de hoje viram linha de base:

- **Regas de vizinho por semana** — hoje ~0 (12 em toda a história). É a métrica
  principal.
- **Jardins distintos visitados por jogador/semana** — hoje essencialmente 0.
- **Plantas distintas vistas por alguém que não o dono** — hoje ≤ 5.
- **Contas com reputação > 0** — hoje 6 de 54.
- **Retenção D7 do novato** — a hipótese de fundo é que quem recebe visita na
  primeira semana volta mais.
