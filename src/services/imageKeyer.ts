/**
 * Remoção de fundo branco para sprites cartoon (fundo branco + contorno escuro).
 *
 * Opera diretamente sobre um buffer RGBA cru (canais = 4), sem dependências de
 * imagem — por isso é facilmente testável e reutilizável.
 *
 * Técnica: flood-fill a partir das bordas (remove só o fundo conectado, preservando
 * branco interno como flores/olhos/brilho/plantas brancas) + feather na borda
 * (anti-serrilhado) + despill (remove o halo branco).
 */

// Classificador de "cor de fundo" para o flood-fill: claro e pouco saturado
// (branco, off-white, cinza-claro, gradiente leve). Folhas/cores têm croma alto.
export const BG_MIN_LUMA = 210; // menor canal precisa ser >= isso
export const BG_MAX_CHROMA = 28; // (max - min) precisa ser <= isso

// Rampa de feather na borda: pixels de primeiro plano vizinhos do fundo recebem
// alpha proporcional à "brancura" (min dos canais), suavizando o serrilhado.
export const FEATHER_WHITE_HI = 244; // >= isso na borda -> totalmente transparente
export const FEATHER_WHITE_LO = 200; // <= isso na borda -> totalmente opaco

export function clamp8(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

/**
 * Chroma key por COR (green-screen). Remove globalmente todos os pixels próximos
 * de uma cor alvo (ex.: magenta puro #FF00FF) — não usa flood-fill, então também
 * apaga bolsões de fundo cercados pela planta (vãos entre galhos/folhas).
 *
 * - dist <= near  -> fundo (alpha 0)
 * - dist >= far   -> primeiro plano (intacto)
 * - entre os dois -> borda: alpha proporcional + despill (desfaz a mistura com a
 *   cor de fundo, removendo o halo colorido).
 *
 * A planta NUNCA deve usar a cor chroma nas suas próprias cores.
 */
export function keyChromaColor(
  data: Uint8Array,
  width: number,
  height: number,
  target: [number, number, number] = [255, 0, 255],
  near = 70,
  far = 130
): void {
  const N = width * height;
  const [tr, tg, tb] = target;
  const span = far - near;

  for (let p = 0; p < N; p++) {
    const i4 = p * 4;
    const r = data[i4], g = data[i4 + 1], b = data[i4 + 2];

    const dr = r - tr, dg = g - tg, db = b - tb;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);

    if (dist <= near) {
      data[i4 + 3] = 0;
      continue;
    }
    if (dist >= far) {
      // Primeiro plano puro: mantém opaco (preserva alpha existente se já houver).
      continue;
    }

    // Borda anti-serrilhada: alpha proporcional à distância da cor chroma.
    const a = (dist - near) / span; // 0..1
    const inv = 1 - a;
    // Despill: un-premultiply sobre a cor de fundo.
    data[i4] = clamp8((r - tr * inv) / a);
    data[i4 + 1] = clamp8((g - tg * inv) / a);
    data[i4 + 2] = clamp8((b - tb * inv) / a);
    data[i4 + 3] = Math.round(a * 255);
  }
}

/**
 * Remove SÓ o fundo branco conectado às bordas. Muta o buffer RGBA in-place.
 * @param data   buffer RGBA (4 bytes por pixel)
 * @param width  largura em pixels
 * @param height altura em pixels
 */
export function keyWhiteBackground(data: Uint8Array, width: number, height: number): void {
  const N = width * height;

  const isBg = (p: number): boolean => {
    const i4 = p * 4;
    const r = data[i4], g = data[i4 + 1], b = data[i4 + 2];
    const mn = Math.min(r, g, b);
    const mx = Math.max(r, g, b);
    return mn >= BG_MIN_LUMA && mx - mn <= BG_MAX_CHROMA;
  };

  // 1) Flood-fill (BFS 4-conectado) a partir das 4 bordas.
  const bg = new Uint8Array(N);
  const queue = new Int32Array(N);
  let qh = 0, qt = 0;
  const seed = (p: number) => {
    if (!bg[p] && isBg(p)) { bg[p] = 1; queue[qt++] = p; }
  };
  for (let x = 0; x < width; x++) { seed(x); seed((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { seed(y * width); seed(y * width + width - 1); }
  while (qh < qt) {
    const p = queue[qh++];
    const x = p % width;
    const y = (p / width) | 0;
    if (x > 0) seed(p - 1);
    if (x < width - 1) seed(p + 1);
    if (y > 0) seed(p - width);
    if (y < height - 1) seed(p + width);
  }

  // 2) Alpha + feather + despill.
  for (let p = 0; p < N; p++) {
    const i4 = p * 4;
    if (bg[p]) { data[i4 + 3] = 0; continue; }

    // Primeiro plano: só suaviza se for vizinho do fundo (preserva o miolo).
    const x = p % width;
    const y = (p / width) | 0;
    let nearBg = false;
    for (let dy = -1; dy <= 1 && !nearBg; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        if (bg[ny * width + nx]) { nearBg = true; break; }
      }
    }
    if (!nearBg) { data[i4 + 3] = 255; continue; }

    const r = data[i4], g = data[i4 + 1], b = data[i4 + 2];
    const m = Math.min(r, g, b);
    let a = (FEATHER_WHITE_HI - m) / (FEATHER_WHITE_HI - FEATHER_WHITE_LO);
    a = a < 0 ? 0 : a > 1 ? 1 : a;

    if (a <= 0) { data[i4 + 3] = 0; continue; }
    if (a < 1) {
      // Despill: desfaz a mistura com o branco do fundo (un-premultiply over white).
      const inv = 1 - a;
      data[i4] = clamp8((r - 255 * inv) / a);
      data[i4 + 1] = clamp8((g - 255 * inv) / a);
      data[i4 + 2] = clamp8((b - 255 * inv) / a);
    }
    data[i4 + 3] = Math.round(a * 255);
  }
}
