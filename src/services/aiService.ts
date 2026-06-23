import { PlantDNA } from '../types';
import { logAIRequest } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { blueprintForStage, TRAITS_BY_NAME } from '../config/genome';
import { keyWhiteBackground, keyChromaColor } from './imageKeyer';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

/**
 * CONFIGURAÇÃO DE MODELOS
 */
const CONFIG = {
  // 1 = Gemini 2.5 Flash
  // 2 = GPT-5 Mini
  // 3 = Claude Sonnet 4
  SELECTED_LLM: 1,

  // 1 = Flux 2 Pro (Referencial)
  // 2 = Flux 1 Pro
  // 3 = DALL-E 3
  // 4 = Ideogram v3
  // 5 = Flux 2 Klein (Fast/Cheap)
  // 6 = Recraft V4.1 Utility ← padrão atual (transparent PNG nativo, estilo ilustração)
  SELECTED_IMAGE: 6,
};

const LLM_OPTIONS: Record<number, string> = {
  1: 'google/gemini-2.5-flash',
  2: 'openai/gpt-5-mini',
  3: 'anthropic/claude-sonnet-4',
};

const IMAGE_OPTIONS: Record<number, string> = {
  1: 'black-forest-labs/flux.2-pro',
  2: 'black-forest-labs/flux-1-pro',
  3: 'openai/dall-e-3',
  4: 'ideogram-ai/ideogram-v3',
  5: 'black-forest-labs/flux.2-klein-4b',
  6: 'recraft/recraft-v4.1-utility',
};

// Carregamento de Prompts Externos
const PROMPTS_PATH = path.join(process.cwd(), 'src', 'prompts');

function getPromptFile(fileName: string): string {
  try {
    return fs.readFileSync(path.join(PROMPTS_PATH, fileName), 'utf8');
  } catch (err) {
    console.error(`Failed to read prompt file ${fileName}:`, err);
    return '';
  }
}

export interface AIResponse {
  visualDescription: string;
  imageUrl: string;
  modelUsed: string; // Para rastreabilidade
}

function getApiKey() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    console.error('[AI] CRITICAL: OPENROUTER_API_KEY is missing!');
    throw new Error('API Key configuration missing');
  }
  return key;
}

export async function generatePlantEvolution(
  dna: PlantDNA,
  stageCode: string,
  previousDescription?: string,
  imageModelOverride?: string
): Promise<AIResponse> {
  const llmModel = LLM_OPTIONS[CONFIG.SELECTED_LLM] || LLM_OPTIONS[1];
  const imgModel = imageModelOverride || IMAGE_OPTIONS[CONFIG.SELECTED_IMAGE] || IMAGE_OPTIONS[1];

  console.log(`[AI] Evolving plant | stage: ${stageCode} | LLM: ${llmModel} | IMG: ${imgModel}`);

  // Sem imagem de referência: a identidade vem inteiramente do DNA + descrição anterior.
  const visualDescription = await generateVisualDescription(dna, stageCode, llmModel, previousDescription);
  const imageUrl = await generatePlantImage(visualDescription, imgModel);

  return {
    visualDescription,
    imageUrl,
    modelUsed: `LLM: ${llmModel} | IMG: ${imgModel}`
  };
}

/** Serializa o DNA + blueprint do estágio em um prompt rico e determinístico. */
function buildLlmUserContent(dna: PlantDNA, stageCode: string, previousDescription?: string): string {
  const blueprint = blueprintForStage(stageCode);
  const fraction = blueprint?.height_fraction ?? 1;
  const targetCm = Math.round(dna.form.max_height_cm * fraction);

  // Substitui placeholders na diretiva (ex.: {stem_thickness_grown}).
  const directive = (blueprint?.directive ?? `Growth stage ${stageCode}.`)
    .replace('{stem_thickness_grown}', dna.form.stem_thickness_grown);

  const traitLines = dna.traits.length
    ? dna.traits
        .map((t) => {
          const def = TRAITS_BY_NAME[t.name];
          const text = def ? def.render(t.params, fraction) : t.name;
          return `  - ${t.name}: ${text}`;
        })
        .join('\n')
    : '  - (none)';

  const f = dna.form;
  return `
Plant DNA (source of truth — reproduce these exactly, identity has NO image reference):
- Biome: ${dna.biome}
- Personality: ${dna.personality}
- Rarity: ${dna.rarity}
- Colors: primary ${dna.color.primary_hex}, secondary ${dna.color.secondary_hex} (${dna.color.name})
- Leaf style: ${f.leaf_style}, density: ${f.leaf_density}
- Stem style: ${f.stem_style}, adult thickness: ${f.stem_thickness_grown}
- Growth pattern: ${f.growth_pattern}, adult height: ~${f.max_height_cm}cm
- Flowers: ${f.has_flowers ? `yes (color ${f.flower_color_hex})` : 'no'} | Fruit: ${f.has_fruit ? `yes (color ${f.fruit_color_hex})` : 'no'}
- Traits (expressed at THIS stage's strength):
${traitLines}

Current stage: ${stageCode}
Target size now: ~${targetCm}cm (${Math.round(fraction * 100)}% of its ${f.max_height_cm}cm adult height)
Stage growth directive: ${directive}

Previous stage description (for identity continuity, NOT for size): ${previousDescription || 'None / this is an early stage'}

Describe the WHOLE plant at this stage, applying the growth directive (much bigger and more mature than before) while keeping the DNA identity intact.
`.trim();
}

async function generateVisualDescription(dna: PlantDNA, stageCode: string, model: string, previousDescription?: string): Promise<string> {
  const apiKey = getApiKey();
  const systemPrompt = getPromptFile('DESCRIPTION_PLANT.md');

  const payload = {
    model,
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: buildLlmUserContent(dna, stageCode, previousDescription)
      }
    ],
    temperature: 0.6
  };

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://brotaria.vercel.app',
      'X-Title': 'Brotaria'
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();

  if (text.trim().startsWith('<!DOCTYPE html>') || text.trim().startsWith('<html')) {
    logAIRequest('LLM', model, payload, text, response.status);
    throw new Error(`OpenRouter returned HTML instead of JSON (Status ${response.status}).`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    logAIRequest('LLM', model, payload, text, response.status);
    throw new Error(`Failed to parse OpenRouter response (Status ${response.status})`);
  }

  logAIRequest('LLM', model, payload, data, response.status);

  if (!response.ok) {
    throw new Error(`OpenRouter LLM Error: ${data.error?.message || response.statusText}`);
  }

  return data.choices[0].message.content.trim();
}

/** Baixa os bytes de uma imagem (aceita URL http(s) ou data: base64). */
async function fetchImageBuffer(imageUrl: string): Promise<Buffer> {
  if (imageUrl.startsWith('data:')) {
    const base64Data = imageUrl.split(',')[1];
    return Buffer.from(base64Data, 'base64');
  }
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

/**
 * Garante fundo transparente.
 *
 * - Se o modelo JÁ devolveu uma imagem com canal alpha real (transparência),
 *   pula a remoção automaticamente — não toca nos pixels, só normaliza para PNG.
 * - Se a imagem é opaca (fundo branco/sólido), aplica o chromakey branco->transparente.
 *
 * A detecção usa sharp.stats().isOpaque: é `false` quando existe transparência de
 * verdade no alpha; é `true` quando a imagem não tem alpha ou o alpha é todo opaco.
 */
async function removeWhiteBackgroundIfNeeded(imageUrl: string): Promise<string> {
  try {
    const inputBuffer = await fetchImageBuffer(imageUrl);

    let alreadyTransparent = false;
    try {
      const stats = await sharp(inputBuffer).stats();
      alreadyTransparent = stats.isOpaque === false;
    } catch {
      // Se stats falhar, segue para a remoção por segurança.
    }

    if (alreadyTransparent) {
      console.log('[AI] Modelo já retornou imagem com alpha — pulando remoção de fundo.');
      const png = await sharp(inputBuffer).png().toBuffer();
      return `data:image/png;base64,${png.toString('base64')}`;
    }

    const { data, info } = await sharp(inputBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Método de remoção configurável:
    //  - 'magenta' (padrão): chroma key global (#FF00FF) — remove até bolsões
    //    de fundo cercados pela planta. Requer o prompt pedindo fundo magenta.
    //  - 'white': flood-fill do branco a partir das bordas (legado).
    const mode = (process.env.CHROMA_KEY || 'magenta').toLowerCase();
    if (mode === 'white') {
      console.log('[AI] Removendo fundo BRANCO (flood-fill + feather + despill)...');
      keyWhiteBackground(data, info.width, info.height);
    } else {
      console.log('[AI] Removendo fundo MAGENTA (chroma key global + despill)...');
      keyChromaColor(data, info.width, info.height, [255, 0, 255]);
    }

    const outputBuffer = await sharp(data, {
      raw: { width: info.width, height: info.height, channels: 4 }
    }).png().toBuffer();

    return `data:image/png;base64,${outputBuffer.toString('base64')}`;
  } catch (err) {
    console.error('[AI] Background removal failed, returning original image:', err);
    return imageUrl;
  }
}

async function uploadToSupabase(dataString: string, fileName: string): Promise<string> {
  console.log(`[AI] Uploading image to Supabase Storage: ${fileName}`);
  try {
    let buffer: Buffer;
    let contentType: string = 'image/png';

    if (dataString.startsWith('data:')) {
      // Base64 logic
      const base64Data = dataString.split(',')[1];
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      // URL logic (if background removal was skipped)
      const response = await fetch(dataString);
      if (!response.ok) {
        throw new Error(`Failed to fetch image from URL: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    const { data, error } = await supabaseAdmin.storage
      .from('plants')
      .upload(fileName, buffer, {
        contentType,
        upsert: true
      });

    if (error) throw error;

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('plants')
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error('[AI] Supabase Upload Error:', err);
    throw new Error('Failed to persist image to storage');
  }
}

async function generatePlantImage(description: string, model: string = IMAGE_OPTIONS[1]): Promise<string> {
  const apiKey = getApiKey();
  const stylePrompt = getPromptFile('IMAGE_GENERATOR.md');
  const prompt = `${description}\n\nStyle Rules:\n${stylePrompt}`;

  console.log(`[AI] Generating image with model ${model}`);

  // Geração pura text-to-image: sem imagem de referência, para permitir saltos
  // grandes de tamanho entre estágios. A identidade vem do DNA na descrição.
  //
  // background: "transparent" + output_format: "png" — parâmetros OpenRouter
  // para modelos que suportam alpha channel nativo (ex: recraft-v4.1-utility).
  // O removeWhiteBackgroundIfNeeded detecta alpha real via sharp.stats().isOpaque
  // e pula o chroma key automaticamente quando o modelo já entregou PNG transparente.
  const payload: Record<string, unknown> = {
    model,
    modalities: ["image"],
    background: "transparent",
    output_format: "png",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt }
        ]
      }
    ]
  };

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://brotaria.vercel.app',
      'X-Title': 'Brotaria'
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();

  if (text.trim().startsWith('<!DOCTYPE html>') || text.trim().startsWith('<html')) {
    logAIRequest('IMAGE', model, payload, text, response.status);
    throw new Error(`OpenRouter returned HTML instead of JSON (Status ${response.status}).`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    logAIRequest('IMAGE', model, payload, text, response.status);
    throw new Error(`Failed to parse OpenRouter image response (Status ${response.status})`);
  }

  logAIRequest('IMAGE', model, payload, data, response.status);

  if (!response.ok) {
    throw new Error(`OpenRouter Image Error: ${data.error?.message || response.statusText}`);
  }

  const rawImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url ||
    data.choices?.[0]?.message?.content ||
    data.choices?.[0]?.message?.attachments?.[0]?.url ||
    data.data?.[0]?.url;

  if (!rawImageUrl || typeof rawImageUrl !== 'string' || (!rawImageUrl.startsWith('http') && !rawImageUrl.startsWith('data:'))) {
    console.error('[AI] No valid image URL found in response:', data);
    throw new Error('Image URL not found in AI response');
  }

  // 1. Processamento de imagem (Opcional)
  //    Se ligado, a remoção só roda em imagens OPACAS — se o modelo já entregou
  //    PNG com alpha, removeWhiteBackgroundIfNeeded pula a remoção sozinho.
  const shouldRemoveBg = process.env.BACKGROUND_REMOVER === 'true';
  let processedImage = rawImageUrl;

  if (shouldRemoveBg) {
    processedImage = await removeWhiteBackgroundIfNeeded(rawImageUrl);
  }

  // 2. Upload para Supabase Storage
  const fileName = `plant_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
  const finalUrl = await uploadToSupabase(processedImage, fileName);

  return finalUrl;
}
