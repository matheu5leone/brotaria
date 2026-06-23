# Pipeline de IA

## Objetivo

A IA não deve inventar uma planta nova.

Ela deve evoluir a mesma planta.

A IA funciona como tradutora visual do DNA — não como geradora criativa.

---

## Etapas do Pipeline

### Etapa 1 — Receber DNA

```json
{
  "biome": "planicie",
  "rarity": "comum",
  "personality": "feliz",
  "color": { "name": "Verde Vivo", "primary_hex": "#4CAF50", "secondary_hex": "#81C784" },
  "form": { "leaf_style": "rounded", ... },
  "traits": [{ "name": "perigosa", "params": { "thorn_size": 3 } }]
}
```

### Etapa 2 — Gerar Descrição Visual (LLM)

O LLM recebe o DNA + blueprint do estágio e produz uma descrição textual detalhada da planta.

Input do LLM:
- DNA completo
- Estágio atual e sua diretiva de escala
- Tamanho alvo em cm (fração do max_height_cm)
- Descrição da versão anterior (para continuidade de identidade)

Output: descrição em prosa, usada como prompt para o modelo de imagem.

### Etapa 3 — Construir Prompt de Imagem

```text
[descrição gerada pelo LLM]

Style Rules:
[conteúdo de src/prompts/IMAGE_GENERATOR.md]
```

### Etapa 4 — Gerar Imagem

Enviar prompt para modelo de imagem via OpenRouter.

### Etapa 5 — Processar Imagem

- Se o modelo retornou PNG com canal alpha real → apenas normalizar para PNG
- Se a imagem é opaca (fundo branco/sólido) → aplicar chromakey branco → transparente

Variável de ambiente `BACKGROUND_REMOVER=true` ativa o processamento.

### Etapa 6 — Upload

Salvar PNG processado no Supabase Storage (bucket `plants`).

### Etapa 7 — Persistir Versão

Salvar na tabela `plant_versions`:
- `image_url`
- `prompt_used` (descrição visual do LLM)
- `dna_snapshot`
- `stage_id`
- `model_used`

---

## Estilo Visual Oficial

Toda geração deve obedecer rigorosamente:

```
Cartoon plant.
Centered.
Pure white background.
No shadows.
No floor.
No environment.
2D
Vibrant colors
Clean silhouette
No realism
No photography
No anime
No 3D
No realistic lighting
No realistic textures
```

Este estilo nunca deve mudar.

---

## Filosofia de Evolução

### Regra Absoluta

```
Adicionar ≠ Substituir
```

Características existentes nunca devem desaparecer.

Exemplo correto:

```
DNA: verde + feliz
Mutação: + perigosa

Resultado: verde + feliz + espinhos (mantendo forma e cores)
```

Exemplo errado:

```
Resultado: planta totalmente diferente
```

### Primeira Geração (broto_1)

Entrada: DNA + traits atuais

Saída: descrição visual + imagem

### Gerações Seguintes (pequena_1, media_1, grande_1)

Entrada: DNA + descrição anterior + novos traits (se houve mutação)

A IA deve preservar:
- forma
- identidade
- personalidade
- paleta de cores

E apenas adicionar novos elementos.

---

## Blueprints de Estágio

Cada estágio de geração tem uma diretiva de escala (`StageBlueprint`):

| Estágio    | height_fraction | Diretiva resumida                                              |
|------------|-----------------|----------------------------------------------------------------|
| broto_1    | 0.10            | Broto minúsculo, 2 folhinhas, sem caule real, traits apenas sugeridos |
| pequena_1  | 0.30            | Planta jovem, caule fino visível, 4-6 folhas, traits começando a aparecer |
| media_1    | 0.60            | Planta estabelecida, caule com galhos, 8-14 folhas, traits claramente visíveis |
| grande_1   | 1.00            | Planta adulta completa, copa densa, flores/frutos se aplicável, traits em força total |

O `height_fraction` é aplicado sobre `dna.form.max_height_cm` para determinar o tamanho alvo em cm.

---

## Modelos

### LLM (geração de descrição)

Via `https://openrouter.ai/api/v1/chat/completions`

Opções configuradas em `aiService.ts`:

| # | Modelo                          |
|---|---------------------------------|
| 1 | `google/gemini-2.5-flash`       |
| 2 | `openai/gpt-5-mini`             |
| 3 | `anthropic/claude-sonnet-4`     |

### Imagem (geração visual)

Via `https://openrouter.ai/api/v1/chat/completions` com `modalities: ["image"]`

Opções configuradas em `aiService.ts`:

| # | Modelo                                    |
|---|-------------------------------------------|
| 1 | `black-forest-labs/flux.2-pro`            |
| 2 | `black-forest-labs/flux-1-pro`            |
| 3 | `openai/dall-e-3`                         |
| 4 | `ideogram-ai/ideogram-v3`                 |
| 5 | `black-forest-labs/flux.2-klein-4b`       |

O modelo ativo é configurado via `CONFIG.SELECTED_LLM` e `CONFIG.SELECTED_IMAGE` no topo de `aiService.ts`.

---

## Modo Mock

`AI_MODE=MOCK` (variável de ambiente) substitui toda a geração de IA por:
- Descrição fake baseada no DNA
- Avatar aleatório via DiceBear (`api.dicebear.com`)
- Delay simulado de 800ms

Usar em desenvolvimento para não consumir tokens.

---

## Snapshot Visual

Toda geração salva em `plant_versions`:

```json
{
  "plant_id": "...",
  "stage_id": "...",
  "prompt_used": "descrição visual gerada pelo LLM",
  "image_url": "https://supabase.../plants/plant_xxx.png",
  "dna_snapshot": { ... },
  "model_used": "LLM: google/gemini-2.5-flash | IMG: flux.2-klein-4b"
}
```

A `prompt_used` (descrição do LLM) é passada como `previousDescription` na próxima geração para manter continuidade de identidade.
