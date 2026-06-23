# Database

## Tabelas

```
profiles
seeds
pots
plants
plant_stages
plant_versions
transactions
gifts
```

---

## Schema

### profiles
Extende o `auth.users` do Supabase.

| Coluna       | Tipo      | Observação                        |
|--------------|-----------|-----------------------------------|
| `id`         | UUID PK   | referencia auth.users             |
| `email`      | TEXT      | unique                            |
| `created_at` | TIMESTAMPZ| —                                 |

---

### seeds

| Coluna       | Tipo      | Observação                        |
|--------------|-----------|-----------------------------------|
| `id`         | UUID PK   | —                                 |
| `user_id`    | UUID FK   | → profiles                        |
| `created_at` | TIMESTAMPZ| —                                 |

---

### pots

| Coluna       | Tipo      | Observação                        |
|--------------|-----------|-----------------------------------|
| `id`         | UUID PK   | —                                 |
| `user_id`    | UUID FK   | → profiles                        |
| `plant_id`   | UUID FK   | → plants (nullable)               |
| `created_at` | TIMESTAMPZ| —                                 |

---

### plant_stages

| Coluna           | Tipo      | Observação                              |
|------------------|-----------|-----------------------------------------|
| `id`             | UUID PK   | —                                       |
| `code`           | TEXT      | unique (ex.: `broto_1`)                 |
| `name`           | TEXT      | nome legível (ex.: `Broto 1`)           |
| `order_index`    | INTEGER   | ordem de evolução (1–13)                |
| `waters_required`| INTEGER   | regas para avançar deste estágio        |
| `generate_image` | BOOLEAN   | se true, dispara pipeline de IA         |
| `prompt_context` | TEXT      | diretiva textual de escala (opcional)   |
| `created_at`     | TIMESTAMPZ| —                                       |

---

### plants

| Coluna                  | Tipo      | Observação                              |
|-------------------------|-----------|-----------------------------------------|
| `id`                    | UUID PK   | —                                       |
| `user_id`               | UUID FK   | → profiles                              |
| `pot_id`                | UUID FK   | → pots (nullable)                       |
| `dna`                   | JSONB     | DNA completo da planta                  |
| `current_stage_id`      | UUID FK   | → plant_stages                          |
| `current_stage_waters`  | INTEGER   | regas acumuladas no estágio atual       |
| `last_watered_at`       | TIMESTAMPZ| —                                       |
| `next_water_needed_at`  | TIMESTAMPZ| last_watered_at + 8h                   |
| `hydration_status`      | TEXT      | hydrated / waiting_water / paused       |
| `created_at`            | TIMESTAMPZ| —                                       |

---

### plant_versions

| Coluna         | Tipo      | Observação                              |
|----------------|-----------|-----------------------------------------|
| `id`           | UUID PK   | —                                       |
| `plant_id`     | UUID FK   | → plants                                |
| `image_url`    | TEXT      | URL pública no Supabase Storage         |
| `prompt_used`  | TEXT      | descrição visual gerada pelo LLM        |
| `dna_snapshot` | JSONB     | DNA no momento da geração               |
| `stage_id`     | UUID FK   | → plant_stages                          |
| `model_used`   | TEXT      | ex.: "LLM: gemini-2.5-flash / IMG: flux"|
| `created_at`   | TIMESTAMPZ| —                                       |

---

### transactions

| Coluna       | Tipo      | Observação                              |
|--------------|-----------|-----------------------------------------|
| `id`         | UUID PK   | —                                       |
| `user_id`    | UUID FK   | → profiles                              |
| `item_type`  | TEXT      | `seed` ou `pot`                         |
| `amount`     | DECIMAL   | valor em reais                          |
| `status`     | TEXT      | `completed` (MVP mock)                  |
| `created_at` | TIMESTAMPZ| —                                       |

---

### gifts

| Coluna         | Tipo      | Observação                              |
|----------------|-----------|-----------------------------------------|
| `id`           | UUID PK   | —                                       |
| `sender_id`    | UUID FK   | → profiles                              |
| `recipient_id` | UUID FK   | → profiles                              |
| `item_type`    | TEXT      | `seed`, `pot` ou `plant`               |
| `item_id`      | UUID      | id do item transferido                  |
| `status`       | TEXT      | pending / accepted / declined           |
| `created_at`   | TIMESTAMPZ| —                                       |

---

## Supabase Storage

Bucket: `plants`

Arquivos: `plant_{timestamp}_{random}.png`

Acesso: público (URLs diretas no `image_url` de `plant_versions`)

---

## Regras de Escalabilidade

Nunca executar geração de IA diretamente na requisição HTTP do usuário.

A geração de imagem deve sempre ocorrer de forma assíncrona via job/worker.

O frontend deve consultar o estado atual via polling ou Supabase Realtime, sem depender do retorno síncrono da geração.
