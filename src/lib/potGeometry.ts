/**
 * Geometria do canteiro (hexpot) para colisão ao cavar.
 *
 * O footprint é a silhueta OPACA do empty-pot.png (não a borda transparente),
 * medida pelo alpha: um hexágono alongado que, na caixa do .hex-pot
 * (aspectRatio 1/1.65, imagem em height:80% object-bottom), ocupa
 * y ≈ 0.586–0.988 e x ≈ 0.026–0.974. Coordenadas em fração da caixa
 * (0,0 = topo-esquerda; 1,1 = base-direita).
 *
 * Puro (sem DOM): usável no cliente e, se preciso, no servidor.
 */

export type Pt = { x: number; y: number };

/** Vértices do footprint em fração da caixa do hex-pot. */
export const POT_FOOTPRINT: ReadonlyArray<readonly [number, number]> = [
  [0.50, 0.586],
  [0.974, 0.686],
  [0.974, 0.887],
  [0.50, 0.988],
  [0.026, 0.887],
  [0.026, 0.686],
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
