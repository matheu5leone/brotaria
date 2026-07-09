/**
 * Geometria do canteiro (hexpot) para colisão ao cavar.
 *
 * O footprint é a silhueta OPACA do tile de terra hexagonal `hexpot.webp`
 * (não a borda transparente), traçada pelo alpha via `scripts/trace-footprint.mjs`
 * (convex hull + Douglas-Peucker → 8 vértices convexos, exigência do SAT).
 * Na caixa do .hex-pot (aspect = POT_BOX_ASPECT, imagem em height:POT_IMG_HEIGHT_PCT
 * object-contain object-bottom) o tile ocupa y ≈ 0.62–0.97 e x ≈ 0.05–0.95.
 * Coordenadas em fração da caixa (0,0 = topo-esquerda; 1,1 = base-direita).
 *
 * Puro (sem DOM): usável no cliente e, se preciso, no servidor.
 */

export type Pt = { x: number; y: number };

/** Contrato de render do HexPot — fonte de verdade única (derivar aspectRatio, viewBox, boxH daqui). */
export const POT_BOX_ASPECT = 1.65;      // altura/largura da caixa .hex-pot (portrait)
export const POT_IMG_HEIGHT_PCT = 0.80;  // altura da imagem do tile na caixa
/** Centro visual do tile (fração a partir da BASE) — âncora da base da planta. */
export const PLANT_ANCHOR_PCT = 0.205;

/** Vértices do footprint em fração da caixa do hex-pot (silhueta opaca do tile). */
export const POT_FOOTPRINT: ReadonlyArray<readonly [number, number]> = [
  [0.491, 0.621],
  [0.904, 0.693],
  [0.953, 0.856],
  [0.868, 0.896],
  [0.500, 0.971],
  [0.101, 0.891],
  [0.051, 0.860],
  [0.092, 0.692],
];

/**
 * Polígono do footprint em px, dado o CENTRO da caixa do vaso e o tamanho da
 * caixa (boxW × boxH px; boxH normalmente = 1.65 · boxW).
 */
export function potPolygonPx(centerX: number, centerY: number, boxW: number, boxH: number): Pt[] {
  const left = centerX - boxW / 2;
  const top = centerY - boxH / 2;
  return POT_FOOTPRINT.map(([fx, fy]) => ({ x: left + fx * boxW, y: top + fy * boxH }));
}

/** Bounding box (px) de um polígono. */
export function footprintBounds(poly: Pt[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of poly) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

/** Ponto dentro de polígono convexo/qualquer (ray casting). */
export function pointInPolygon(pt: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    const intersect =
      (a.y > pt.y) !== (b.y > pt.y) &&
      pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Sobreposição de dois polígonos CONVEXOS via SAT (Separating Axis Theorem).
 * "Encostar" (tocar em uma aresta, sem área comum) NÃO conta como sobreposição.
 */
export function polygonsOverlap(a: Pt[], b: Pt[]): boolean {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const p1 = poly[i];
      const p2 = poly[(i + 1) % poly.length];
      // Normal da aresta (eixo de separação candidato)
      const axis = { x: -(p2.y - p1.y), y: p2.x - p1.x };
      let minA = Infinity, maxA = -Infinity, minB = Infinity, maxB = -Infinity;
      for (const p of a) { const d = p.x * axis.x + p.y * axis.y; if (d < minA) minA = d; if (d > maxA) maxA = d; }
      for (const p of b) { const d = p.x * axis.x + p.y * axis.y; if (d < minB) minB = d; if (d > maxB) maxB = d; }
      // Gap (>) → separados. >= trataria "encostar" como separado; usamos > para
      // permitir encostar sem colidir (tocar exatamente = ainda válido).
      if (maxA <= minB || maxB <= minA) return false;
    }
  }
  return true;
}
