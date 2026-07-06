'use client';

import { useState } from 'react';
import { Target, Loader2, Check } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { LeafConfetti } from '@/components/LeafConfetti';
import { useMissions, useClaimMission, MissionView } from '@/hooks/useMissions';

function MissionCard({ mission }: { mission: MissionView }) {
  const claim = useClaimMission();
  const [error, setError] = useState<string | null>(null);
  const [burstId, setBurstId] = useState(0);
  const pct = Math.round((mission.progress / mission.goal) * 100);

  const onClaim = async () => {
    setError(null);
    try {
      await claim.mutateAsync(mission.key);
      setBurstId((b) => b + 1); // confetti de folhas saindo do botão
    } catch (e) {
      setError((e as { message?: string }).message ?? 'Erro ao resgatar.');
    }
  };

  return (
    <div
      className="relative rounded-2xl p-5"
      style={{
        background: 'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)',
        border: '1.5px solid var(--color-wood-light)',
        boxShadow: '0 6px 20px rgba(0,0,0,0.3), inset 0 1px 1px rgba(242,232,213,0.7)',
      }}
    >
      {/* Acento dourado */}
      <div
        className="absolute top-0 left-8 right-8 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)' }}
      />

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="text-base font-black" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}>
            {mission.title}
          </h3>
          <p className="text-xs" style={{ fontFamily: 'var(--font-caption)', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
            {mission.description}
          </p>
        </div>
        <span
          className="flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full flex-shrink-0"
          style={{ background: 'rgba(42,90,30,0.12)', color: '#2a5a1e', border: '1px solid rgba(42,90,30,0.25)', fontFamily: 'var(--font-display)' }}
        >
          🌱 1 semente
        </span>
      </div>

      {/* Barra: verde (progresso) → azul brilhando (pode resgatar) → dourada (resgatada) */}
      <div className="h-2 rounded-full overflow-hidden mb-1.5" style={{ background: 'rgba(92,58,30,0.15)' }}>
        <div
          className={`h-full rounded-full transition-all duration-700 ${mission.claimable ? 'mission-bar-ready' : ''}`}
          style={{
            width: mission.claimed || mission.claimable ? '100%' : `${pct}%`,
            background: mission.claimed
              ? 'linear-gradient(90deg, #c9a227, #f0d060)'
              : mission.claimable
                ? 'linear-gradient(90deg, #1d4ed8, #60a5fa)'
                : 'linear-gradient(90deg, #2a7a2a, #4ade80)',
          }}
        />
      </div>
      <div className="flex items-center justify-between mb-4">
        <span
          className="text-[10px] font-bold"
          style={{
            color: mission.claimed ? '#a07a12' : mission.claimable ? '#2563eb' : 'var(--color-text-muted)',
            fontFamily: 'var(--font-display)',
          }}
        >
          {mission.claimed ? 'Concluída' : mission.claimable ? 'Pronta para resgatar! ✨' : `${mission.progress}/${mission.goal}`}
        </span>
      </div>

      {/* Ação */}
      {mission.claimed ? (
        <div
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm"
          style={{ background: 'rgba(42,90,30,0.1)', color: '#2a5a1e', border: '1px solid rgba(42,90,30,0.2)', fontFamily: 'var(--font-display)' }}
        >
          <Check className="w-4 h-4" /> Concluída
        </div>
      ) : mission.claimable ? (
        <div className="relative">
          <button
            onClick={onClaim}
            disabled={claim.isPending}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
            style={{
              fontFamily: 'var(--font-display)',
              background: 'linear-gradient(135deg, #2a5a1e, #1e4014)',
              color: '#d9f0c8',
              border: '1px solid rgba(74,222,128,0.25)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            }}
          >
            {claim.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Resgatar recompensa'}
          </button>
          <LeafConfetti burstId={burstId} />
        </div>
      ) : (
        <div
          className="text-center py-2.5 rounded-xl text-sm font-bold"
          style={{ background: 'rgba(92,58,30,0.07)', color: 'var(--color-text-muted)', border: '1px solid rgba(92,58,30,0.15)', fontFamily: 'var(--font-display)' }}
        >
          Em progresso
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-center" style={{ color: '#8b2828' }}>{error}</p>
      )}
    </div>
  );
}

export default function MissoesPage() {
  const { data: missions = [], isPending } = useMissions();

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Target className="w-8 h-8" style={{ color: 'var(--color-gold)' }} />
          <div>
            <h1 className="text-3xl font-black" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-light)' }}>Missões</h1>
            <p className="text-sm" style={{ color: 'rgba(232,213,160,0.45)', fontFamily: 'var(--font-caption)', fontStyle: 'italic' }}>Jogue e ganhe sementes grátis</p>
          </div>
        </div>

        {isPending ? (
          <div className="flex flex-col gap-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-40 rounded-2xl animate-pulse" style={{ background: 'rgba(242,232,213,0.15)' }} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {missions.map((m) => <MissionCard key={m.key} mission={m} />)}
          </div>
        )}
      </div>
    </AppShell>
  );
}
