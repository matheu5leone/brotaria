'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { usePlantVersion } from '@/hooks/usePlantData';
import { PlantImage } from '@/components/PlantImage';
import { RarityEffect } from '@/components/RarityEffect';
import { Rarity } from '@/types';

const RARITY_LABELS: Record<string, string> = {
  comum: 'Comum', incomum: 'Incomum', raro: 'Rara',
  epico: 'Épica', lendario: 'Lendária', brotaria: 'Brotaria',
};

// Posições iniciais das 3 plantas no círculo (raio ~92px, 120° entre si).
const ORBIT_POS = [
  { x: 92, y: 0 },
  { x: -46, y: 80 },
  { x: -46, y: -80 },
];

const ORBIT_MS = 2200;
const FLASH_MS = 380;

function OrbitSprite({ plantId, pos }: { plantId: string; pos: { x: number; y: number } }) {
  const { data: version } = usePlantVersion(plantId);
  return (
    <div
      className="recycle-sprite absolute"
      style={{ left: 0, top: 0, width: 72, height: 72, ['--sx' as string]: `${pos.x}px`, ['--sy' as string]: `${pos.y}px` }}
    >
      <div className="relative w-full h-full" style={{ filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.5))' }}>
        <PlantImage src={version?.image_url} alt="" className="object-contain" />
      </div>
    </div>
  );
}

/**
 * Overlay da reciclagem: reusa os raios solares do EvolutionLoader, mas no lugar
 * da logo as 3 plantas orbitam e convergem ao centro; um flash branco cobre a
 * junção e revela o pop-up "Semente [raridade]" (com partículas da raridade).
 *
 * `seedRarity` chega null (pendente) e é preenchido quando a API responde — o
 * flash/resultado só acontecem depois que o giro terminou E a raridade chegou.
 */
export function RecycleLoader({
  plantIds,
  seedRarity,
  onDone,
}: {
  plantIds: string[];
  seedRarity: Rarity | null;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<'spin' | 'flash' | 'result'>('spin');
  const startedAt = useRef(0);

  useEffect(() => { startedAt.current = Date.now(); }, []);

  // Espera o giro terminar E a API responder (seedRarity) → flash → resultado.
  useEffect(() => {
    if (!seedRarity) return;
    const elapsed = startedAt.current ? Date.now() - startedAt.current : 0;
    const wait = Math.max(0, ORBIT_MS - elapsed);
    let t2: ReturnType<typeof setTimeout> | undefined;
    const t1 = setTimeout(() => {
      setPhase('flash');
      t2 = setTimeout(() => setPhase('result'), FLASH_MS);
    }, wait);
    return () => { clearTimeout(t1); if (t2) clearTimeout(t2); };
  }, [seedRarity]);

  return (
    <div
      className="fixed inset-0 z-[10060] flex items-center justify-center overflow-hidden select-none"
      style={{ background: 'radial-gradient(ellipse at center, #2b4a17 0%, #16290c 55%, #0a1606 100%)' }}
    >
      {/* Raios solares girando (mesma linguagem do EvolutionLoader) */}
      {phase !== 'result' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="evo-rays absolute"
            style={{
              width: '180vmax', height: '180vmax',
              background: 'repeating-conic-gradient(from 0deg, rgba(255,224,140,0.16) 0deg 5deg, transparent 5deg 17deg)',
              WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.55) 35%, transparent 70%)',
              maskImage: 'radial-gradient(circle, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.55) 35%, transparent 70%)',
            }}
          />
          <div
            className="evo-rays--rev absolute"
            style={{
              width: '180vmax', height: '180vmax',
              background: 'repeating-conic-gradient(from 8deg, rgba(255,200,90,0.10) 0deg 3deg, transparent 3deg 22deg)',
              WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,0.8) 0%, transparent 60%)',
              maskImage: 'radial-gradient(circle, rgba(0,0,0,0.8) 0%, transparent 60%)',
            }}
          />
        </div>
      )}

      {/* 3 plantas orbitando + convergindo */}
      {phase !== 'result' && (
        <div className="recycle-orbit absolute" style={{ left: '50%', top: '50%', width: 0, height: 0 }}>
          {plantIds.slice(0, 3).map((id, i) => (
            <OrbitSprite key={id} plantId={id} pos={ORBIT_POS[i]} />
          ))}
        </div>
      )}

      {/* Flash branco cobrindo a junção */}
      {phase === 'flash' && <div className="recycle-flash-in absolute inset-0" style={{ background: '#fff' }} />}
      {phase === 'result' && <div className="recycle-flash-out absolute inset-0 pointer-events-none" style={{ background: '#fff' }} />}

      {/* Resultado — pop-up da semente */}
      {phase === 'result' && seedRarity && (
        <div
          className="recycle-result-in relative flex flex-col items-center gap-4 px-8 py-8 rounded-3xl"
          style={{
            background: 'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)',
            border: '1.5px solid var(--color-wood-light)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.5), inset 0 1px 1px rgba(242,232,213,0.9)',
            width: 'min(88vw, 320px)',
          }}
        >
          <span
            className="text-[10px] font-black uppercase tracking-widest"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}
          >
            Nova semente
          </span>

          <div style={{ width: 128, height: 128 }}>
            <RarityEffect rarity={seedRarity} alwaysVisible>
              <div className="relative w-full h-full">
                <Image src="/imgs/seed.webp" alt="semente" fill className="object-contain" draggable={false} />
              </div>
            </RarityEffect>
          </div>

          <p className="text-xl font-black" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}>
            Semente {RARITY_LABELS[seedRarity] ?? seedRarity}
          </p>

          <button
            onClick={onDone}
            className="mt-1 px-8 py-2.5 rounded-xl text-sm font-black transition-all active:scale-95"
            style={{
              fontFamily: 'var(--font-display)',
              background: 'linear-gradient(135deg, #2a5a1e, #1e4014)',
              color: '#d9f0c8',
              border: '1.5px solid rgba(74,222,128,0.35)',
            }}
          >
            OK
          </button>
        </div>
      )}
    </div>
  );
}
