# Estágios de Crescimento

## Princípio

Estágios existem no banco de dados na tabela `plant_stages`.

Não utilizar ENUM fixo no código. A fonte de verdade é o banco.

---

## Lista de Estágios

| order_index | code        | name       | waters_required | generate_image |
|-------------|-------------|------------|-----------------|----------------|
| 1           | enterrada   | Enterrada  | 3               | false          |
| 2           | broto_1     | Broto 1    | 3               | **true**       |
| 3           | broto_2     | Broto 2    | 3               | false          |
| 4           | broto_3     | Broto 3    | 3               | false          |
| 5           | pequena_1   | Pequena 1  | 3               | **true**       |
| 6           | pequena_2   | Pequena 2  | 3               | false          |
| 7           | pequena_3   | Pequena 3  | 3               | false          |
| 8           | media_1     | Média 1    | 3               | **true**       |
| 9           | media_2     | Média 2    | 3               | false          |
| 10          | media_3     | Média 3    | 3               | false          |
| 11          | grande_1    | Grande 1   | 3               | **true**       |
| 12          | grande_2    | Grande 2   | 3               | false          |
| 13          | grande_3    | Grande 3   | 3               | false          |

---

## Estratégia de Imagem por Estágio

A IA gera imagem apenas nos checkpoints (`generate_image = true`):

```
broto_1   → IA gera
broto_2   → reutiliza imagem de broto_1
broto_3   → reutiliza imagem de broto_1

pequena_1 → IA gera nova versão
pequena_2 → reutiliza imagem de pequena_1
pequena_3 → reutiliza imagem de pequena_1

media_1   → IA gera nova versão
media_2   → reutiliza imagem de media_1
media_3   → reutiliza imagem de media_1

grande_1  → IA gera nova versão
grande_2  → reutiliza imagem de grande_1
grande_3  → reutiliza imagem de grande_1
```

Estágio `enterrada`: sem imagem IA. Exibe asset estático `buried-pot.png`.

---

## Assets Estáticos

```
public/imgs/empty-pot.png   — vaso sem semente
public/imgs/buried-pot.png  — semente recém plantada (estágio enterrada)
```

No estágio `enterrada` nenhuma IA deve ser chamada.

---

## Sistema de Rega

### Timer

- Cada planta precisa de 1 rega a cada **8 horas**
- Após regar: `last_watered_at` atualizado, novo timer de 8h iniciado

### Status de Hidratação

| Status          | Significado                          |
|-----------------|--------------------------------------|
| `hydrated`      | regada, crescendo normalmente        |
| `waiting_water` | timer vencido, crescimento pausado   |
| `paused`        | pausada manualmente                  |

Campos na tabela `plants`:
- `last_watered_at`
- `next_water_needed_at`
- `hydration_status`

### Regras

- Quando `next_water_needed_at < now()` → status vira `waiting_water`
- Planta em `waiting_water` **não avança de estágio**
- Regas em `waiting_water` não contam para o progresso

---

## Crescimento por Regas

A planta avança de estágio ao atingir `waters_required` regas válidas (com status `hydrated`).

Cada estágio tem seu próprio `waters_required` configurável no banco.

Fluxo:

```
enterrada (3 regas) → broto_1 (3 regas) → broto_2 → ... → grande_3
```

Ao avançar de estágio:
1. `current_stage_id` atualizado
2. `current_stage_waters` zerado
3. Verificar mutação no DNA
4. Se `generate_image = true` → disparar pipeline de IA

---

## Scheduler

Job executado a cada **5 minutos**.

Responsabilidades:

1. Encontrar plantas vencidas (`next_water_needed_at < now()`)
2. Alterar status para `waiting_water`
3. Impedir crescimento das plantas vencidas
4. Processar evoluções pendentes
5. Disparar geração de IA quando `generate_image = true`

A geração de IA **nunca** deve ocorrer diretamente na requisição HTTP do usuário.

Fluxo:

```
Usuário rega
↓
Sistema detecta avanço de estágio
↓
Cria job assíncrono
↓
Worker processa
↓
Gera imagem
↓
Upload Supabase Storage
↓
Atualiza banco
↓
Frontend atualiza
```
