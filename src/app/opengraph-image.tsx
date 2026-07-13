/* eslint-disable @next/next/no-img-element -- next/og (Satori) só aceita <img>; next/image não funciona aqui */
import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

export const alt = 'Brotaria — Seu Jardim Virtual';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

async function loadLogo(): Promise<string | null> {
  try {
    const buf = await readFile(join(process.cwd(), 'public/imgs/brotaria.png'));
    const png = await sharp(buf).resize({ height: 220, withoutEnlargement: true }).png().toBuffer();
    return `data:image/png;base64,${png.toString('base64')}`;
  } catch {
    return null;
  }
}

export default async function Image() {
  const logo = await loadLogo();

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a1508',
          backgroundImage: 'radial-gradient(120% 95% at 50% 20%, #22461a 0%, #12280d 50%, #0a1508 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        {logo ? <img src={logo} alt="" height={200} style={{ objectFit: 'contain' }} /> : null}
        <div style={{ display: 'flex', fontSize: 96, fontWeight: 800, color: '#f2f7ea', marginTop: 20 }}>
          Brotaria
        </div>
        <div style={{ display: 'flex', fontSize: 40, color: '#9fc48a', marginTop: 8 }}>
          Cultive plantas únicas geradas por IA 🌱
        </div>
      </div>
    ),
    { ...size },
  );
}
