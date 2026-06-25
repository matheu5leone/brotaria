'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Trophy, Coins } from 'lucide-react';
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
    current_stage: { id: '', name: entry.stage_name, order_index: 0, waters_required: 3 },
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
      className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border"
      style={{ color: `var(--rarity-${rarity})`, borderColor: `var(--rarity-${rarity})` }}
    >
      {labels[rarity]}
    </span>
  );
}

function RankingCard({ entry, onOpen }: { entry: RankingEntry; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="w-full flex items-center gap-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 transition-all text-left active:scale-[0.99]"
    >
      {/* Posição */}
      <span className={`text-3xl font-black w-10 text-center flex-shrink-0 ${RANK_COLORS[entry.rank - 1]}`}>
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
          <div className="w-16 h-16 rounded-full bg-stone-700/40 animate-pulse" />
        )}
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {entry.nickname ? (
            <Link
              href={`/jardim/${entry.nickname}`}
              onClick={(e) => e.stopPropagation()}
              className="font-bold text-amber-400 hover:text-amber-300 hover:underline truncate transition-colors"
            >
              @{entry.nickname}
            </Link>
          ) : (
            <span className="font-bold text-white truncate">{entry.owner_name}</span>
          )}
          <RarityBadge rarity={entry.rarity} />
        </div>
        <p className="text-white/50 text-sm mt-0.5">{entry.stage_name}</p>
      </div>

      {/* Score */}
      <div className="flex items-center gap-1.5 text-amber-400 font-black text-lg flex-shrink-0">
        <Coins className="w-4 h-4" />
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
      <div className="max-w-2xl mx-auto px-6 py-8 text-white">
        <div className="flex items-center gap-3 mb-8">
          <Trophy className="w-8 h-8 text-amber-400" />
          <div>
            <h1 className="text-3xl font-black">Ranking</h1>
            <p className="text-white/40 text-sm">As 5 plantas mais valiosas do jardim</p>
          </div>
        </div>

        {isPending ? (
          <div className="flex flex-col gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : ranking.length === 0 ? (
          <p className="text-white/30 text-center py-20">Nenhuma planta evoluída ainda.</p>
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
