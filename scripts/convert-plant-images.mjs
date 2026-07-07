// Converte as imagens de plantas já geradas (bucket `plants`) de PNG → WebP,
// re-sobe e atualiza plant_versions.image_url. Idempotente e por-item resiliente.
// Uso: node scripts/convert-plant-images.mjs
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY em .env.local');
  process.exit(1);
}

const supabase = createClient(url, key);
const BUCKET = 'plants';
const marker = `/storage/v1/object/public/${BUCKET}/`;

function pathFromUrl(u) {
  const i = u.indexOf(marker);
  if (i === -1) return null;
  return decodeURIComponent(u.slice(i + marker.length).split('?')[0]);
}

const { data: rows, error } = await supabase
  .from('plant_versions')
  .select('id, image_url')
  .ilike('image_url', '%.png');
if (error) throw error;

const targets = (rows ?? []).filter((r) => r.image_url.includes(marker));
console.log(`${targets.length} imagens PNG no bucket "${BUCKET}" para converter\n`);

let ok = 0;
for (const row of targets) {
  const oldPath = pathFromUrl(row.image_url);
  if (!oldPath) { console.warn(`skip (path inválido) ${row.id}`); continue; }
  try {
    const { data: file, error: dErr } = await supabase.storage.from(BUCKET).download(oldPath);
    if (dErr) throw dErr;
    const inBuf = Buffer.from(await file.arrayBuffer());
    const outBuf = await sharp(inBuf).webp({ quality: 82 }).toBuffer();

    const newPath = oldPath.replace(/\.png$/i, '.webp');
    const { error: uErr } = await supabase.storage.from(BUCKET)
      .upload(newPath, outBuf, { contentType: 'image/webp', upsert: true });
    if (uErr) throw uErr;

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(newPath);
    const { error: updErr } = await supabase.from('plant_versions')
      .update({ image_url: pub.publicUrl }).eq('id', row.id);
    if (updErr) throw updErr;

    if (newPath !== oldPath) await supabase.storage.from(BUCKET).remove([oldPath]);
    console.log(`✓ ${oldPath}  ${(inBuf.length / 1024).toFixed(0)}KB → ${(outBuf.length / 1024).toFixed(0)}KB`);
    ok++;
  } catch (e) {
    console.error(`✗ ${row.id}: ${e.message}`);
  }
}
console.log(`\nConcluído: ${ok}/${targets.length}`);
