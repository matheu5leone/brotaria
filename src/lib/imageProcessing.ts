import sharp from 'sharp';

/**
 * Encoda um buffer de imagem em WebP mantendo transparência (alpha).
 * Rota canônica de saída do pipeline de IA e ponto único de compressão —
 * qualquer imagem que vá para o storage passa por aqui.
 */
export async function encodeWebp(buffer: Buffer, quality = 82): Promise<Buffer> {
  return sharp(buffer).webp({ quality }).toBuffer();
}
