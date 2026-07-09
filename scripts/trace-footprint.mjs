// Traça a silhueta OPACA (alpha) de um asset e gera o POT_FOOTPRINT em frações
// da caixa .hex-pot, replicando o contrato de render do HexPot:
//   caixa portrait (aspect = BOX_ASPECT), imagem em height=IMG_HEIGHT_PCT,
//   object-contain object-bottom.
//
// Uso: node scripts/trace-footprint.mjs public/imgs/hexpot.png
import sharp from 'sharp';

const SRC = process.argv[2] ?? 'public/imgs/hexpot.png';
const BOX_ASPECT = Number(process.argv[3] ?? 1.65);     // altura/largura da caixa
const IMG_HEIGHT_PCT = Number(process.argv[4] ?? 0.80); // altura da imagem na caixa
const ALPHA_MIN = 10; // limiar de opacidade

const img = sharp(SRC);
const meta = await img.metadata();
const { width: W, height: H } = meta;
const { data } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const alphaAt = (x, y) => data[(y * W + x) * 4 + 3];

// 1) Por linha: xMin/xMax do alpha opaco (px do PNG)
const rows = [];
let top = -1, bottom = -1;
for (let y = 0; y < H; y++) {
  let xMin = -1, xMax = -1;
  for (let x = 0; x < W; x++) {
    if (alphaAt(x, y) >= ALPHA_MIN) { if (xMin < 0) xMin = x; xMax = x; }
  }
  rows[y] = xMin < 0 ? null : { xMin, xMax };
  if (xMin >= 0) { if (top < 0) top = y; bottom = y; }
}

// 2) Colunas: yMin/yMax (px do PNG)
let left = -1, right = -1;
const cols = [];
for (let x = 0; x < W; x++) {
  let yMin = -1, yMax = -1;
  for (let y = top; y <= bottom; y++) {
    if (alphaAt(x, y) >= ALPHA_MIN) { if (yMin < 0) yMin = y; yMax = y; }
  }
  cols[x] = yMin < 0 ? null : { yMin, yMax };
  if (yMin >= 0) { if (left < 0) left = x; right = x; }
}

// 3) Centróide (média dos pixels opacos)
let sx = 0, sy = 0, n = 0;
for (let y = top; y <= bottom; y++) {
  const r = rows[y]; if (!r) continue;
  for (let x = r.xMin; x <= r.xMax; x++) {
    if (alphaAt(x, y) >= ALPHA_MIN) { sx += x; sy += y; n++; }
  }
}
const cx = sx / n, cy = sy / n;

// 4) Convex hull da silhueta (contorno esq/dir de cada linha).
//    SAT (polygonsOverlap) exige convexo → o hull é a colisão correta e tight.
const boundary = [];
for (let y = top; y <= bottom; y++) {
  const r = rows[y]; if (!r) continue;
  boundary.push({ x: r.xMin, y }, { x: r.xMax, y });
}
function convexHull(pts) {
  const p = [...pts].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower = [];
  for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
  const upper = [];
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}
// Douglas-Peucker: reduz o hull aos cantos dominantes (epsilon em px).
function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  let dmax = 0, idx = 0;
  const a = pts[0], b = pts[pts.length - 1];
  const dl = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs((b.x - a.x) * (a.y - pts[i].y) - (a.x - pts[i].x) * (b.y - a.y)) / dl;
    if (d > dmax) { dmax = d; idx = i; }
  }
  if (dmax > eps) return [...rdp(pts.slice(0, idx + 1), eps).slice(0, -1), ...rdp(pts.slice(idx), eps)];
  return [a, b];
}
const EPS = Number(process.argv[5] ?? 22);
const hull = convexHull(boundary);
// Divide o anel convexo em duas cadeias (topo→base e base→topo) e RDP em cada.
const iTop = hull.reduce((mi, p, i, a) => (p.y < a[mi].y ? i : mi), 0);
const iBot = hull.reduce((mi, p, i, a) => (p.y > a[mi].y ? i : mi), 0);
const chain = (from, to) => { const out = []; for (let i = from; ; i = (i + 1) % hull.length) { out.push(hull[i]); if (i === to) break; } return out; };
const c1 = rdp(chain(iTop, iBot), EPS);
const c2 = rdp(chain(iBot, iTop), EPS);
const hexPx = [...c1.slice(0, -1), ...c2.slice(0, -1)];

// 5) Mapa PNG-px → caixa .hex-pot (fração), pelo contrato object-contain object-bottom.
//    A caixa: largura = 1 (unidade), altura = BOX_ASPECT.
//    Área da imagem: bottom-0, height = IMG_HEIGHT_PCT * BOX_ASPECT (em unidades de largura).
//    object-contain do PNG (aspect W/H) nessa área:
const pngAspect = W / H;
const areaH = IMG_HEIGHT_PCT * BOX_ASPECT; // em unidades de largura da caixa
// contain: cabe por largura se pngAspect >= (1/areaH)... calcula render size:
let renderW, renderH;
if (pngAspect >= 1 / areaH) { renderW = 1; renderH = 1 / pngAspect; }   // limitado por largura
else { renderH = areaH; renderW = areaH * pngAspect; }                   // limitado por altura
// posição da imagem renderizada dentro da caixa (object-bottom, centralizado em x):
const renderLeft = (1 - renderW) / 2;               // fração da largura
const renderTop  = BOX_ASPECT - renderH;            // topo da imagem (unidades de largura)
// px do PNG → fração da caixa:
const toBox = ({ x, y }) => ({
  x: renderLeft + (x / W) * renderW,
  y: (renderTop + (y / H) * renderH) / BOX_ASPECT,  // normaliza para fração 0..1 da altura da caixa
});

const hexBox = hexPx.map(toBox);
const centroidBox = toBox({ x: cx, y: cy });

// DEBUG: contorno denso (silhueta exata) + polígono escolhido + centróide, sobre a imagem
const densePts = [];
for (let y = top; y <= bottom; y += 6) { const r = rows[y]; if (r) densePts.push(`${r.xMax},${y}`); }
for (let y = bottom; y >= top; y -= 6) { const r = rows[y]; if (r) densePts.push(`${r.xMin},${y}`); }
const hexPtsStr = hexPx.map(v => `${Math.round(v.x)},${Math.round(v.y)}`).join(' ');
const overlay = Buffer.from(
  `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
     <polygon points="${densePts.join(' ')}" fill="none" stroke="#00e5ff" stroke-width="4"/>
     <polygon points="${hexPtsStr}" fill="rgba(255,0,128,0.18)" stroke="#ff0080" stroke-width="6"/>
     <circle cx="${Math.round(cx)}" cy="${Math.round(cy)}" r="14" fill="#ffea00"/>
   </svg>`);
await sharp(SRC).composite([{ input: overlay, top: 0, left: 0 }])
  .png().toFile('scripts/_footprint-debug.png');

const f = (v) => Number(v.toFixed(3));
console.log('── PNG:', `${W}×${H}`, 'aspect', f(pngAspect));
console.log('── Vértices px:', hexPx.map(v => `(${Math.round(v.x)},${Math.round(v.y)})`).join(' '));
console.log('── Opaco bbox px: x', left, '→', right, '| y', top, '→', bottom,
            '| aspect', f((right - left) / (bottom - top)));
console.log('── Render na caixa: W', f(renderW), 'H', f(renderH),
            '| left', f(renderLeft), 'topY(box-frac)', f(renderTop / BOX_ASPECT));
console.log('\nexport const POT_FOOTPRINT: ReadonlyArray<readonly [number, number]> = [');
for (const v of hexBox) console.log(`  [${f(v.x)}, ${f(v.y)}],`);
console.log('];');
console.log('\n// Centróide (âncora da planta) box-frac: x', f(centroidBox.x), 'y', f(centroidBox.y));
console.log('// → PLANT_ANCHOR_PCT (bottom fraction) =', f(1 - centroidBox.y));
