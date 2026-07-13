/* eslint-disable @next/next/no-img-element -- next/og (Satori) só aceita <img>; next/image não funciona aqui */
import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { supabaseAdmin } from '@/lib/supabaseServer';

export const alt = 'Jardim virtual no Brotaria';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
// Cacheia a imagem gerada por 1h (jardins não mudam a cada segundo; evita
// re-buscar do Supabase + reprocessar no sharp a cada crawl de link).
export const revalidate = 3600;

const MAX_PLANTS_SHOWN = 4;

/**
 * Normaliza QUALQUER imagem remota (webp das plantas, avatar em qualquer
 * formato, até SVG do mock) para um data-URI PNG que o Satori consegue renderizar.
 * Blindado: se uma imagem falhar/estiver corrompida, retorna null e é apenas
 * omitida — nunca derruba a geração do card inteiro.
 */
async function loadAsPng(url: string | null, maxHeight: number): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const input = Buffer.from(await res.arrayBuffer());
    const png = await sharp(input)
      .resize({ height: maxHeight, withoutEnlargement: true })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString('base64')}`;
  } catch {
    return null;
  }
}

async function loadLogo(): Promise<string | null> {
  try {
    const buf = await readFile(join(process.cwd(), 'public/imgs/brotaria.png'));
    const png = await sharp(buf).resize({ height: 64, withoutEnlargement: true }).png().toBuffer();
    return `data:image/png;base64,${png.toString('base64')}`;
  } catch {
    return null;
  }
}

type GardenData = {
  nickname: string;
  avatar: string | null;
  plantCount: number;
  plantImages: string[];
};

async function fetchGarden(rawNickname: string): Promise<GardenData | null> {
  const nickname = rawNickname.replace(/^@/, '').trim().toLowerCase();
  if (!nickname) return null;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, nickname, avatar_url')
    .ilike('nickname', nickname)
    .single();
  if (!profile) return null;

  const { data: pots } = await supabaseAdmin
    .from('pots')
    .select('plant_id, created_at')
    .eq('user_id', profile.id)
    .not('plant_id', 'is', null)
    .order('created_at', { ascending: true });

  const plantIds = (pots ?? []).map((p) => p.plant_id as string);
  const plantCount = plantIds.length;

  // Última versão (imagem mais recente) de cada planta, em uma query só.
  let plantImages: string[] = [];
  if (plantIds.length > 0) {
    const { data: versions } = await supabaseAdmin
      .from('plant_versions')
      .select('plant_id, image_url, created_at')
      .in('plant_id', plantIds)
      .order('created_at', { ascending: false });

    const latestByPlant = new Map<string, string>();
    for (const v of versions ?? []) {
      if (v.image_url && !latestByPlant.has(v.plant_id)) {
        latestByPlant.set(v.plant_id, v.image_url);
      }
    }
    // Preserva a ordem dos canteiros; pega só as primeiras que têm imagem.
    const urls = plantIds
      .map((id) => latestByPlant.get(id))
      .filter((u): u is string => !!u)
      .slice(0, MAX_PLANTS_SHOWN);

    const loaded = await Promise.all(urls.map((u) => loadAsPng(u, 400)));
    plantImages = loaded.filter((u): u is string => !!u);
  }

  const avatar = await loadAsPng(profile.avatar_url, 240);

  return { nickname: profile.nickname, avatar, plantCount, plantImages };
}

export default async function Image({ params }: { params: Promise<{ nickname: string }> }) {
  const { nickname: rawNickname } = await params;
  const decoded = decodeURIComponent(rawNickname);
  const [garden, logo] = await Promise.all([fetchGarden(decoded), loadLogo()]);

  const nickname = garden?.nickname ?? decoded.replace(/^@/, '');
  const plantCount = garden?.plantCount ?? 0;
  const plantImages = garden?.plantImages ?? [];
  const avatar = garden?.avatar ?? null;
  const initial = (nickname[0] ?? '?').toUpperCase();

  const countLabel =
    plantCount === 0 ? 'Jardim recém-plantado'
    : plantCount === 1 ? '1 planta cultivada'
    : `${plantCount} plantas cultivadas`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          backgroundColor: '#0a1508',
          backgroundImage: 'radial-gradient(120% 95% at 50% 12%, #22461a 0%, #12280d 48%, #0a1508 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Cabeçalho: avatar + apelido + contagem */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '64px 72px 0' }}>
          <div
            style={{
              display: 'flex',
              width: 132,
              height: 132,
              borderRadius: 132,
              overflow: 'hidden',
              border: '5px solid #c9a227',
              backgroundColor: '#2a5a1e',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
            }}
          >
            {avatar ? (
              <img src={avatar} alt="" width={132} height={132} style={{ objectFit: 'cover' }} />
            ) : (
              <div style={{ display: 'flex', fontSize: 68, fontWeight: 700, color: '#d9f0c8' }}>{initial}</div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 32 }}>
            <div style={{ display: 'flex', fontSize: 76, fontWeight: 800, color: '#f2f7ea', lineHeight: 1 }}>
              Jardim de @{nickname}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 16 }}>
              <div style={{ display: 'flex', fontSize: 34, color: '#9fc48a' }}>🌱 {countLabel}</div>
            </div>
          </div>
        </div>

        {/* Faixa de terra que "assenta" as plantas */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 96,
            height: 130,
            display: 'flex',
            backgroundImage: 'linear-gradient(180deg, #4a2e18 0%, #2e1c0e 100%)',
            borderTop: '4px solid #5c3a1e',
          }}
        />

        {/* Plantas reais do jardim, alinhadas na terra */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            gap: 52,
            padding: '0 80px 150px',
          }}
        >
          {plantImages.length > 0 ? (
            plantImages.map((src, i) => (
              <img key={i} src={src} alt="" height={238} style={{ objectFit: 'contain' }} />
            ))
          ) : (
            <div
              style={{
                display: 'flex',
                fontSize: 40,
                color: '#d9f0c8',
                padding: '18px 34px',
                borderRadius: 20,
                backgroundColor: 'rgba(8,20,8,0.6)',
                border: '2px solid rgba(92,58,30,0.5)',
                marginBottom: 30,
              }}
            >
              🌿 Um jardim novinho esperando pra florescer
            </div>
          )}
        </div>

        {/* Rodapé: chamada + wordmark Brotaria */}
        <div
          style={{
            position: 'absolute',
            bottom: 34,
            left: 72,
            right: 72,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', fontSize: 30, color: '#c8b48a' }}>
            Cultive o seu jardim virtual gerado por IA
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {logo ? <img src={logo} alt="" height={52} style={{ objectFit: 'contain' }} /> : null}
            <div style={{ display: 'flex', fontSize: 40, fontWeight: 800, color: '#f2f7ea', marginLeft: 14 }}>
              Brotaria
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
