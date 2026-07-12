'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Trophy } from 'lucide-react';
import { CoinIcon } from '@/components/CoinIcon';
import { AppShell } from '@/components/AppShell';
import { useRanking, RankingEntry } from '@/hooks/useRanking';
import { RarityEffect } from '@/components/RarityEffect';
import { lifecycleFromOrder } from '@/config/lifecycle';
import { Rarity } from '@/types';

function RarityBadge({ rarity }: { rarity: Rarity }) {
  const labels: Record<Rarity, string> = {
    comum: 'Comum', incomum: 'Incomum', raro: 'Raro',
    epico: 'Épico', lendario: 'Lendário', brotaria: 'Brotaria',
  };
  return (
    <span
      className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
      style={{
        color: `var(--rarity-${rarity})`,
        border: `1px solid color-mix(in srgb, var(--rarity-${rarity}) 55%, transparent)`,
        background: 'rgba(255,255,255,0.4)',
        fontFamily: 'var(--font-display)',
      }}
    >
      {labels[rarity]}
    </span>
  );
}

function RankingCard({ entry }: { entry: RankingEntry }) {
  return (
    <div
      className="relative w-full flex items-center gap-4 rounded-2xl p-4 text-left"
      style={{
        background: 'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)',
        border: '1.5px solid var(--color-wood-light)',
        boxShadow: '0 6px 20px rgba(0,0,0,0.3), inset 0 1px 1px rgba(242,232,213,0.7)',
      }}
    >
      {/* Acento dourado no topo */}
      <div
        className="absolute top-0 left-5 right-5 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)' }}
      />

      {/* Posição */}
      <span
        className="text-3xl font-black w-10 text-center flex-shrink-0"
        style={{ fontFamily: 'var(--font-display)', color: entry.rank === 1 ? 'var(--color-gold)' : 'var(--color-wood-dark)' }}
      >
        #{entry.rank}
      </span>

      {/* Imagem */}
      <div className="relative w-16 h-16 flex-shrink-0">
        {entry.image_url ? (
          <RarityEffect rarity={entry.rarity} alwaysVisible>
            <div className="relative w-16 h-16">
              <Image src={entry.image_url} alt={entry.stage_name} fill className="object-contain" />
            </div>
          </RarityEffect>
        ) : (
          <div className="w-16 h-16 rounded-full animate-pulse" style={{ background: 'rgba(92,58,30,0.2)' }} />
        )}
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {entry.nickname ? (
            <Link
              href={`/jardim/${entry.nickname}`}
              className="font-bold hover:underline truncate transition-colors"
              style={{ color: 'var(--color-wood-mid)', fontFamily: 'var(--font-display)' }}
            >
              @{entry.nickname}
            </Link>
          ) : (
            <span className="font-bold truncate" style={{ color: 'var(--color-text-dark)', fontFamily: 'var(--font-display)' }}>{entry.owner_name}</span>
          )}
          <RarityBadge rarity={entry.rarity} />
        </div>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-caption)', fontStyle: 'italic' }}>{lifecycleFromOrder(entry.stage_order).name}</p>
      </div>

      {/* Score */}
      <div className="flex items-center gap-1.5 font-black text-lg flex-shrink-0" style={{ color: 'var(--color-wood-dark)', fontFamily: 'var(--font-display)' }}>
        <CoinIcon size={16} />
        {entry.score.toLocaleString('pt-BR')}
      </div>
    </div>
  );
}

export default function RankingPage() {
  const { data: ranking = [], isPending } = useRanking();

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Trophy className="w-8 h-8" style={{ color: 'var(--color-gold)' }} />
          <div>
            <h1 className="text-3xl font-black" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-light)' }}>Ranking</h1>
            <p className="text-sm" style={{ color: 'rgba(232,213,160,0.45)', fontFamily: 'var(--font-caption)', fontStyle: 'italic' }}>As 5 plantas mais valiosas do jardim</p>
          </div>
        </div>

        {isPending ? (
          <div className="flex flex-col gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'rgba(242,232,213,0.15)' }} />
            ))}
          </div>
        ) : ranking.length === 0 ? (
          <p className="text-center py-20" style={{ color: 'rgba(232,213,160,0.35)', fontFamily: 'var(--font-caption)', fontStyle: 'italic' }}>Nenhuma planta evoluída ainda.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {ranking.map((entry) => (
              <RankingCard key={entry.plant_id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
