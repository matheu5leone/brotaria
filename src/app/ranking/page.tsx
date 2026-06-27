'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Trophy } from 'lucide-react';
import { CoinIcon } from '@/components/CoinIcon';
import { AppShell } from '@/components/AppShell';
import { useRanking, RankingEntry } from '@/hooks/useRanking';
import { RarityEffect } from '@/components/RarityEffect';
import { PlantHistoryModal } from '@/components/PlantHistoryModal';
import { PlantRow } from '@/hooks/usePlantData';
import { Rarity } from '@/types';

const RANK_COLORS = ['text-amber-400', 'text-slate-300', 'text-amber-600', 'text-stone-400', 'text-stone-400'];

function rankingEntryToPlantRow(entry: RankingEntry): PlantRow {
  return {
    id: entry.plant_id,
    hydration_status: 'hydrated',
    current_stage_waters: 0,
    current_stage: { id: '', code: '', name: entry.stage_name, order_index: 0, waters_required: 3 },
    dna: entry.dna,
    created_at: '',
    next_water_needed_at: '',
    satisfacao: 0,
  };
}

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
        border: `1px solid color-mix(in srgb, var(--rarity-${rarity}) 45%, transparent)`,
        background: 'rgba(0,0,0,0.3)',
        fontFamily: 'var(--font-display)',
      }}
    >
      {labels[rarity]}
    </span>
  );
}

function RankingCard({ entry, onOpen }: { entry: RankingEntry; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="w-full flex items-center gap-4 rounded-2xl p-4 transition-all text-left active:scale-[0.99] hover:brightness-110"
      style={{
        background: 'linear-gradient(160deg, rgba(28,45,16,0.75), rgba(15,26,8,0.75))',
        border: '1px solid rgba(201,162,39,0.25)',
        boxShadow: 'inset 0 1px 0 rgba(201,162,39,0.1)',
      }}
    >
      {/* Posição */}
      <span
        className={`text-3xl font-black w-10 text-center flex-shrink-0 ${RANK_COLORS[entry.rank - 1]}`}
        style={{ fontFamily: 'var(--font-display)' }}
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
          <div className="w-16 h-16 rounded-full animate-pulse" style={{ background: 'rgba(92,58,30,0.3)' }} />
        )}
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {entry.nickname ? (
            <Link
              href={`/jardim/${entry.nickname}`}
              onClick={(e) => e.stopPropagation()}
              className="font-bold hover:underline truncate transition-colors"
              style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-display)' }}
            >
              @{entry.nickname}
            </Link>
          ) : (
            <span className="font-bold truncate" style={{ color: 'var(--color-text-light)', fontFamily: 'var(--font-display)' }}>{entry.owner_name}</span>
          )}
          <RarityBadge rarity={entry.rarity} />
        </div>
        <p className="text-sm mt-0.5" style={{ color: 'rgba(232,213,160,0.5)', fontFamily: 'var(--font-caption)' }}>{entry.stage_name}</p>
      </div>

      {/* Score */}
      <div className="flex items-center gap-1.5 font-black text-lg flex-shrink-0" style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-display)' }}>
        <CoinIcon size={16} />
        {entry.score.toLocaleString('pt-BR')}
      </div>
    </button>
  );
}

export default function RankingPage() {
  const { data: ranking = [], isPending } = useRanking();
  const [selectedEntry, setSelectedEntry] = useState<RankingEntry | null>(null);

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
              <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'rgba(28,45,16,0.5)' }} />
            ))}
          </div>
        ) : ranking.length === 0 ? (
          <p className="text-center py-20" style={{ color: 'rgba(232,213,160,0.35)', fontFamily: 'var(--font-caption)', fontStyle: 'italic' }}>Nenhuma planta evoluída ainda.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {ranking.map((entry) => (
              <RankingCard
                key={entry.plant_id}
                entry={entry}
                onOpen={() => setSelectedEntry(entry)}
              />
            ))}
          </div>
        )}
      </div>

      {selectedEntry && (
        <PlantHistoryModal
          key={selectedEntry.plant_id}
          plant={rankingEntryToPlantRow(selectedEntry)}
          open={selectedEntry !== null}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </AppShell>
  );
}
