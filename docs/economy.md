# Economia do Jogo

## Cadastro

Ao criar conta o usuário recebe automaticamente:
- 1 semente gratuita
- 9 vasos gratuitos

Moedas começam em 0.

---

## Moedas (créditos do jogo)

A moeda do jogo são as **moedas**. O fluxo da economia é:

```
R$ → moedas → produtos (sementes)
```

O usuário compra moedas com dinheiro (pagamento **mockado** por enquanto — Stripe
no fim do projeto) e gasta moedas na **Loja** para adquirir produtos.

A lógica completa da Loja (pacotes, produtos, popup, APIs, data model) está em
**[store.md](store.md)**.

---

## Sistema de Sementes

### Preço

1 semente = **5 moedas** (comprada na Loja). Não há mais compra direta em reais.

### Fluxo ao plantar uma semente

1. Consumir 1 semente do inventário do usuário
2. Gerar DNA aleatório
3. Criar planta no estágio `enterrada`
4. Associar ao vaso selecionado

Se o usuário tentar plantar **sem semente**, a API retorna `400 { code: 'NO_SEEDS' }`
e a UI abre o popup de compra de moedas (ver [store.md](store.md)).

---

## Sistema de Vasos

- Cada vaso pode conter apenas uma planta
- Usuários podem comprar vasos adicionais
- Usuários podem receber vasos COM plantas de presente

---

## Sistema de Presentes

Usuários podem presentear outros usuários com:
- Sementes
- Vasos vazios
- Plantas em crescimento
- Plantas adultas

### Regras de transferência

A transferência deve preservar:
- DNA
- Estágio atual
- Histórico de versões
- Imagem atual

### Status do presente

| Status    | Significado                         |
|-----------|-------------------------------------|
| `pending` | Aguardando resposta do destinatário |
| `accepted`| Presente aceito                     |
| `declined`| Presente recusado                   |

---

## Transações

Toda compra gera um registro na tabela `transactions`:
- `item_type`: `coins` (compra de pacote de moedas), `seed` ou `pot`
- `amount`: valor em reais (0 para gastos internos em moedas)
- `status`: `completed` (MVP assume pagamento aprovado)
