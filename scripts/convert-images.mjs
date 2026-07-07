// Converte os assets estáticos de public/imgs de PNG → WebP (mantém transparência).
// Uso: node scripts/convert-images.mjs
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'public/imgs');
const QUALITY = 82;
// Assets a redimensionar (largura=altura, cover). O default é gigante (1024²).
const RESIZE = { 'avatar-default.png': 256 };

const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.png'));
let totalBefore = 0;
let totalAfter = 0;

for (const f of files) {
  const input = path.join(dir, f);
  const output = path.join(dir, f.replace(/\.png$/i, '.webp'));
  let img = sharp(input);
  if (RESIZE[f]) img = img.resize(RESIZE[f], RESIZE[f], { fit: 'cover' });
  const buf = await img.webp({ quality: QUALITY }).toBuffer();
  fs.writeFileSync(output, buf);

  const before = fs.statSync(input).size;
  const after = buf.length;
  totalBefore += before;
  totalAfter += after;
  console.log(
    `${f.padEnd(24)} ${(before / 1024).toFixed(0).padStart(6)} KB → ${(after / 1024).toFixed(0).padStart(6)} KB  (-${(100 - (after / before) * 100).toFixed(0)}%)`,
  );
}

console.log(
  `\nTOTAL: ${(totalBefore / 1024 / 1024).toFixed(1)} MB → ${(totalAfter / 1024 / 1024).toFixed(1)} MB  (-${(100 - (totalAfter / totalBefore) * 100).toFixed(0)}%)`,
);
