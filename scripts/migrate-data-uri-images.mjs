// Move imagens de planta guardadas como data-URI base64 DENTRO de
// plant_versions.image_url para o storage, e troca a coluna pela URL pública.
//
// Por que existe: no começo do projeto o pipeline de IA gravava o base64 direto
// na coluna — o upload para o bucket veio depois. Sobrou 1 linha assim, de
// 2026-06-05 (a versão mais antiga da tabela, única sem model_used). Meio mega
// de texto que entra em toda query que lê a tabela, inclusive no histórico da
// planta e no acervo de artes.
//
// O convert-plant-images.mjs não pega esse caso: ele só sabe converter o que já
// está no bucket (deriva o caminho da URL), então data-URI passa batido.
//
// Idempotente: rodar de novo não acha nada. Resiliente por item.
// Uso: node scripts/migrate-data-uri-images.mjs [--dry]
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const clean = (v) => (v ?? '').replace(/^﻿/, '').trim();
const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
const key = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
if (!url || !key) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY em .env.local');
  process.exit(1);
}

const supabase = createClient(url, key);
const BUCKET = 'plants';
const DRY = process.argv.includes('--dry');

const { data: linhas, error } = await supabase
  .from('plant_versions')
  .select('id, plant_id, image_url, created_at')
  .like('image_url', 'data:%');

if (error) {
  console.error('Falha ao listar:', error.message);
  process.exit(1);
}

if (!linhas?.length) {
  console.log('Nada a fazer: nenhuma imagem em data-URI.');
  process.exit(0);
}

console.log(`${linhas.length} imagem(ns) em data-URI${DRY ? ' (simulação)' : ''}.`);

let ok = 0;
let falhou = 0;

for (const linha of linhas) {
  const rotulo = `${linha.id.slice(0, 8)} (planta ${linha.plant_id?.slice(0, 8)})`;
  try {
    const base64 = linha.image_url.split(',')[1];
    if (!base64) throw new Error('data-URI sem payload depois da vírgula');

    const original = Buffer.from(base64, 'base64');
    // Mesmo formato canônico do pipeline (lib/imageProcessing.encodeWebp).
    const webp = await sharp(original).webp({ quality: 82 }).toBuffer();

    const economia = (((original.length - webp.length) / original.length) * 100).toFixed(0);
    console.log(
      `  ${rotulo}: ${(linha.image_url.length / 1024).toFixed(0)}kB de texto ` +
      `→ ${(webp.length / 1024).toFixed(0)}kB de WebP (-${economia}%)`,
    );

    if (DRY) { ok++; continue; }

    // Mesma convenção de nome do uploadToSupabase.
    const fileName = `plant_${Date.parse(linha.created_at) || Date.now()}_${linha.id.slice(0, 6)}.webp`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, webp, { contentType: 'image/webp', upsert: true });
    if (upErr) throw upErr;

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(fileName);

    // A coluna só troca DEPOIS do upload dar certo: se algo falhar no meio, a
    // imagem continua no base64 em vez de virar uma URL que não existe.
    const { error: updErr } = await supabase
      .from('plant_versions')
      .update({ image_url: pub.publicUrl })
      .eq('id', linha.id);
    if (updErr) throw updErr;

    console.log(`  ${rotulo}: ok → ${fileName}`);
    ok++;
  } catch (err) {
    console.error(`  ${rotulo}: FALHOU — ${err.message}`);
    falhou++;
  }
}

console.log(`\n${ok} migrada(s), ${falhou} falha(s).`);
process.exit(falhou ? 1 : 0);
