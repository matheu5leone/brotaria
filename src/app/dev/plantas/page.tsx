'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X, Search, Leaf, Droplets, Star, Zap, Flame, Sprout, Images, Loader2, Copy, Check,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { PlantImage } from '@/components/PlantImage';
import { RarityEffect } from '@/components/RarityEffect';
import { HerboIcon } from '@/components/HerboIcon';
import { useAuth } from '@/hooks/useAuth';
import { authFetch } from '@/lib/authFetch';
import { isDevUser } from '@/lib/devUser';
import { BIOME_LABELS } from '@/config/biomes';
import { ARCHETYPES } from '@/config/genome/archetypes';
import { LIFECYCLE } from '@/config/lifecycle';
import type { Rarity } from '@/types';
import type { DevPlant, DevPlantVersion } from '@/app/api/dev/plants/route';

/**
 * TEMPORÁRIO (dev) — acervo de todas as artes do servidor, para acompanhar o
 * que a IA está gerando. Restrito à conta de desenvolvimento (a rota valida no
 * servidor; esconder a página não bastaria).
 *
 * Fora do changelog de propósito: é ferramenta de desenvolvimento, o jogador
 * nunca vê. REMOVER junto de /api/dev/plants quando não for mais preciso.
 */

const RARITY_CONFIG: Record<Rarity, { Icon: React.ElementType; color: string; label: string }> = {
  comum:    { Icon: Leaf,     color: '#8a8f98', label: 'Comum'    },
  incomum:  { Icon: Droplets, color: '#0e7490', label: 'Incomum'  },
  raro:     { Icon: Star,     color: '#2563eb', label: 'Raro'     },
  epico:    { Icon: Zap,      color: '#7e22ce', label: 'Épico'    },
  lendario: { Icon: Flame,    color: '#c2410c', label: 'Lendário' },
  brotaria: { Icon: Sprout,   color: '#15803d', label: 'Brotaria' },
};

const RARITY_ORDER: Rarity[] = ['comum', 'incomum', 'raro', 'epico', 'lendario', 'brotaria'];

const HYDRATION_OPTIONS = [
  { key: 'all',           label: 'Toda sede' },
  { key: 'hydrated',      label: 'Hidratada' },
  { key: 'waiting_water', label: 'Com sede' },
  { key: 'paused',        label: 'Pausada' },
  { key: 'due',           label: 'Rega vencida' },
] as const;

const ART_OPTIONS = [
  { key: 'all',  label: 'Com e sem arte' },
  { key: 'with', label: 'Só com arte' },
  { key: 'none', label: 'Sem arte' },
] as const;

const SORT_OPTIONS = [
  { key: 'recent',  label: 'Mais nova' },
  { key: 'oldest',  label: 'Mais antiga' },
  { key: 'rarity',  label: 'Raridade' },
  { key: 'stage',   label: 'Estágio' },
  { key: 'score',   label: 'Valor' },
] as const;

type HydrationKey = (typeof HYDRATION_OPTIONS)[number]['key'];
type ArtKey = (typeof ART_OPTIONS)[number]['key'];
type SortKey = (typeof SORT_OPTIONS)[number]['key'];

/** Chip de filtro — ativo = madeira preenchida. */
function Chip({
  active,
  onClick,
  color,
  children,
}: {
  active: boolean;
  onClick: () => void;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 inline-flex items-center gap-1 whitespace-nowrap"
      style={{
        fontFamily: 'var(--font-display)',
        background: active ? 'rgba(92,58,30,0.85)' : 'rgba(242,232,213,0.08)',
        color: active ? 'var(--color-parch-light)' : color ?? 'rgba(232,213,160,0.7)',
        border: `1px solid ${active ? 'var(--color-gold)' : 'rgba(232,213,160,0.2)'}`,
      }}
    >
      {children}
    </button>
  );
}

/** Select no tema escuro do jardim. */
function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider outline-none"
      style={{
        fontFamily: 'var(--font-display)',
        background: 'rgba(20,32,14,0.9)',
        color: 'rgba(232,213,160,0.85)',
        border: '1px solid rgba(232,213,160,0.2)',
      }}
    >
      {children}
    </select>
  );
}

/** Célula do grid — recebe os dados prontos (nada de fetch por planta). */
function PlantCell({ plant, onOpen }: { plant: DevPlant; onOpen: () => void }) {
  const cfg = RARITY_CONFIG[plant.rarity] ?? RARITY_CONFIG.comum;

  return (
    <button
      onClick={onOpen}
      className="relative flex flex-col rounded-2xl p-2 text-left transition-all duration-200 cursor-pointer hover:scale-[1.03] active:scale-95"
      style={{ background: 'rgba(92,58,30,0.07)', border: '1px solid rgba(92,58,30,0.15)' }}
      title={`${plant.stageName} — ${cfg.label} — @${plant.ownerNickname ?? '?'}`}
    >
      <div
        className="relative w-full rounded-xl overflow-hidden mb-2"
        style={{
          aspectRatio: '1',
          background: 'radial-gradient(ellipse at 40% 30%, rgba(30,50,15,0.5), rgba(8,14,5,0.8))',
          border: '1px solid rgba(92,58,30,0.25)',
        }}
      >
        {/* Aqui, ao contrário do jogo, a enterrada TAMBÉM mostra o glow: é
            ferramenta de revisão de arte, não tem surpresa a preservar. */}
        <RarityEffect rarity={plant.rarity} alwaysVisible>
          <PlantImage src={plant.imageUrl} alt={plant.stageName} className="object-contain p-1.5" />
        </RarityEffect>

        {plant.versions.length > 1 && (
          <span
            className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full text-[9px] font-black inline-flex items-center gap-0.5"
            style={{ background: 'rgba(8,14,5,0.7)', color: '#e8d5a0', fontFamily: 'var(--font-display)' }}
            title={`${plant.versions.length} versões de arte`}
          >
            <Images className="w-2.5 h-2.5" />{plant.versions.length}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 mb-0.5">
        <cfg.Icon className="w-3 h-3 flex-shrink-0" style={{ color: cfg.color }} />
        <span
          className="text-[9px] font-black uppercase tracking-wider truncate"
          style={{ color: cfg.color, fontFamily: 'var(--font-display)' }}
        >
          {cfg.label}
        </span>
      </div>

      <span
        className="text-[10px] font-bold truncate"
        style={{ color: 'var(--color-wood-mid)', fontFamily: 'var(--font-display)' }}
      >
        {plant.lifecycleName} · <HerboIcon size={10} /> {plant.score}
      </span>
      <span
        className="text-[9px] truncate"
        style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}
      >
        @{plant.ownerNickname ?? '—'}
      </span>
    </button>
  );
}

/** Linha rótulo/valor do painel de DNA. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-[11px]">
      <span
        className="flex-shrink-0 w-24 font-black uppercase tracking-wider"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}
      >
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-mid)' }}>{children}</span>
    </div>
  );
}

/** Detalhe: linha do tempo das artes + DNA + prompt de cada versão. */
function DetailModal({ plant, onClose }: { plant: DevPlant; onClose: () => void }) {
  const [openVersion, setOpenVersion] = useState<DevPlantVersion | null>(plant.versions.at(-1) ?? null);
  const [copied, setCopied] = useState(false);
  const cfg = RARITY_CONFIG[plant.rarity] ?? RARITY_CONFIG.comum;

  const copyPrompt = async () => {
    if (!openVersion?.prompt) return;
    try {
      await navigator.clipboard.writeText(openVersion.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard indisponível */ }
  };

  return (
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center"
      style={{ background: 'rgba(5,8,3,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="relative flex flex-col mx-4 p-5 rounded-3xl overflow-hidden"
        style={{
          width: 'min(96vw, 860px)',
          maxHeight: '88vh',
          background: 'linear-gradient(180deg, var(--color-parch-light) 0%, var(--color-parch-dark) 100%)',
          border: '1.5px solid var(--color-wood-light)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.55), inset 0 1px 1px rgba(242,232,213,0.9)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="absolute top-0 left-8 right-8 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)' }}
        />

        <div className="flex items-start justify-between gap-2 mb-3 flex-shrink-0">
          <div className="min-w-0">
            <h2
              className="text-lg font-black flex items-center gap-1.5"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-dark)' }}
            >
              <cfg.Icon className="w-4 h-4" style={{ color: cfg.color }} />
              {cfg.label} · {plant.stageName}
            </h2>
            <p className="text-[11px]" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-muted)' }}>
              @{plant.ownerNickname ?? '—'} · {plant.versions.length} {plant.versions.length === 1 ? 'arte' : 'artes'} · id {plant.id.slice(0, 8)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full transition-all hover:bg-black/10 active:scale-90 flex-shrink-0"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto overflow-x-hidden flex flex-col gap-4">
          {/* Linha do tempo das artes — é o coração da revisão visual */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {plant.versions.map((v) => (
              <button
                key={v.id}
                onClick={() => setOpenVersion(v)}
                className="flex-shrink-0 rounded-xl overflow-hidden transition-all active:scale-95"
                style={{
                  width: 88,
                  border: openVersion?.id === v.id ? '2px solid var(--color-gold)' : '1px solid rgba(92,58,30,0.25)',
                  background: 'radial-gradient(ellipse at 40% 30%, rgba(30,50,15,0.5), rgba(8,14,5,0.8))',
                }}
                title={`${v.stageName} · ${new Date(v.createdAt).toLocaleString('pt-BR')}`}
              >
                <div className="relative w-full" style={{ aspectRatio: '1' }}>
                  <PlantImage src={v.imageUrl} alt={v.stageName} className="object-contain p-1" />
                </div>
                <span
                  className="block text-[8px] font-black uppercase tracking-wider py-0.5 text-center truncate"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parch-light)', background: 'rgba(92,58,30,0.8)' }}
                >
                  {v.stageName}
                </span>
              </button>
            ))}
          </div>

          {/* Arte em tamanho grande */}
          {openVersion && (
            <div
              className="relative w-full rounded-2xl overflow-hidden"
              style={{
                height: 'min(46vh, 380px)',
                background: 'radial-gradient(ellipse at 40% 30%, rgba(30,50,15,0.55), rgba(8,14,5,0.85))',
                border: '1px solid rgba(92,58,30,0.3)',
              }}
            >
              <PlantImage src={openVersion.imageUrl} alt={openVersion.stageName} className="object-contain p-4" />
            </div>
          )}

          {/* DNA */}
          <div className="flex flex-col gap-1.5">
            <Row label="Arquétipo">
              {plant.archetype}{plant.isLegacyArchetype && ' (legado — sem campo no DNA)'}
            </Row>
            <Row label="Bioma">{BIOME_LABELS[plant.biome as keyof typeof BIOME_LABELS] ?? plant.biome}</Row>
            <Row label="Personalidade">{plant.personality}</Row>
            <Row label="Cor">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-full" style={{ background: plant.colorPrimary, border: '1px solid rgba(0,0,0,0.25)' }} />
                <span className="inline-block w-3 h-3 rounded-full" style={{ background: plant.colorSecondary, border: '1px solid rgba(0,0,0,0.25)' }} />
                {plant.colorName}
              </span>
            </Row>
            <Row label="Perks">{plant.traits.length ? plant.traits.join(', ') : '—'}</Row>
            <Row label="Sede">{plant.hydration}</Row>
            <Row label="Plantada em">{new Date(plant.createdAt).toLocaleString('pt-BR')}</Row>
            {plant.isCloned && <Row label="Origem">clone do acervo (1ª planta da conta)</Row>}
          </div>

          {/* Prompt da versão aberta */}
          {openVersion?.prompt && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span
                  className="text-[10px] font-black uppercase tracking-widest"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}
                >
                  Prompt · {openVersion.model ?? 'modelo não registrado'}
                </span>
                <button
                  onClick={copyPrompt}
                  className="px-2 py-1 rounded-lg text-[10px] font-black inline-flex items-center gap-1 transition-all active:scale-95"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--color-wood-dark)', background: 'rgba(201,162,39,0.16)', border: '1px solid rgba(201,162,39,0.4)' }}
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
              <pre
                className="text-[11px] whitespace-pre-wrap rounded-xl p-3 max-h-48 overflow-y-auto"
                style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-mid)', background: 'rgba(92,58,30,0.07)', border: '1px solid rgba(92,58,30,0.18)' }}
              >
                {openVersion.prompt}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DevPlantasPage() {
  const { user, isLoading: authLoading } = useAuth();
  const allowed = isDevUser(user?.id);

  const { data, isPending, error } = useQuery({
    queryKey: ['dev', 'plants'],
    queryFn: async () => {
      const res = await authFetch('/api/dev/plants');
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Falha ao carregar');
      return (await res.json()) as { plants: DevPlant[]; total: number; limit: number };
    },
    enabled: allowed,
    staleTime: 60_000,
  });

  const [rarity, setRarity] = useState<Rarity | 'all'>('all');
  const [lifecycle, setLifecycle] = useState<string>('all');
  const [hydration, setHydration] = useState<HydrationKey>('all');
  const [art, setArt] = useState<ArtKey>('all');
  const [biome, setBiome] = useState('all');
  const [archetype, setArchetype] = useState('all');
  const [model, setModel] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');
  const [selected, setSelected] = useState<DevPlant | null>(null);

  const plants = useMemo(() => data?.plants ?? [], [data]);

  /** Modelos realmente presentes no acervo — filtro não deve inventar opção. */
  const models = useMemo(() => {
    const set = new Set<string>();
    plants.forEach((p) => p.versions.forEach((v) => v.model && set.add(v.model)));
    return [...set].sort();
  }, [plants]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const q = search.trim().toLowerCase();

    const out = plants.filter((p) => {
      if (rarity !== 'all' && p.rarity !== rarity) return false;
      if (lifecycle !== 'all' && p.lifecycleKey !== lifecycle) return false;
      if (biome !== 'all' && p.biome !== biome) return false;
      if (archetype !== 'all' && p.archetype !== archetype) return false;
      if (art === 'with' && !p.imageUrl) return false;
      if (art === 'none' && p.imageUrl) return false;
      if (model !== 'all' && !p.versions.some((v) => v.model === model)) return false;

      if (hydration === 'due') {
        if (Date.parse(p.nextWaterAt) > now) return false;
      } else if (hydration !== 'all' && p.hydration !== hydration) return false;

      if (q) {
        const hay = `${p.ownerNickname ?? ''} ${p.id} ${p.personality} ${p.colorName} ${p.traits.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const byRarity = (p: DevPlant) => RARITY_ORDER.indexOf(p.rarity);
    out.sort((a, b) => {
      switch (sort) {
        case 'oldest': return Date.parse(a.createdAt) - Date.parse(b.createdAt);
        case 'rarity': return byRarity(b) - byRarity(a) || b.stageOrder - a.stageOrder;
        case 'stage':  return b.stageOrder - a.stageOrder || byRarity(b) - byRarity(a);
        case 'score':  return b.score - a.score;
        default:       return Date.parse(b.createdAt) - Date.parse(a.createdAt);
      }
    });
    return out;
  }, [plants, rarity, lifecycle, hydration, art, biome, archetype, model, search, sort]);

  const artesVisiveis = useMemo(
    () => filtered.reduce((n, p) => n + p.versions.filter((v) => v.imageUrl).length, 0),
    [filtered],
  );

  const limpar = () => {
    setRarity('all'); setLifecycle('all'); setHydration('all'); setArt('all');
    setBiome('all'); setArchetype('all'); setModel('all'); setSearch('');
  };

  if (!authLoading && !allowed) {
    return (
      <AppShell>
        <div className="max-w-md mx-auto px-6 py-20 text-center">
          <h1 className="text-2xl font-black mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-light)' }}>
            Área de desenvolvimento
          </h1>
          <p style={{ fontFamily: 'var(--font-caption)', fontStyle: 'italic', color: 'rgba(232,213,160,0.5)' }}>
            Esta página é restrita à conta de desenvolvimento.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center gap-3 mb-5">
          <Images className="w-7 h-7" style={{ color: 'var(--color-gold)' }} />
          <div>
            <h1 className="text-2xl font-black" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-light)' }}>
              Acervo de Artes
            </h1>
            <p className="text-xs" style={{ fontFamily: 'var(--font-caption)', fontStyle: 'italic', color: 'rgba(232,213,160,0.45)' }}>
              Todas as plantas do servidor — ferramenta de desenvolvimento
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip active={rarity === 'all'} onClick={() => setRarity('all')}>Toda raridade</Chip>
            {RARITY_ORDER.map((r) => {
              const c = RARITY_CONFIG[r];
              return (
                <Chip key={r} active={rarity === r} onClick={() => setRarity(r)} color={c.color}>
                  <c.Icon className="w-3 h-3" /> {c.label}
                </Chip>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Chip active={lifecycle === 'all'} onClick={() => setLifecycle('all')}>Todo estágio</Chip>
            {LIFECYCLE.map((s) => (
              <Chip key={s.key} active={lifecycle === s.key} onClick={() => setLifecycle(s.key)}>{s.name}</Chip>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {HYDRATION_OPTIONS.map((o) => (
              <Chip key={o.key} active={hydration === o.key} onClick={() => setHydration(o.key)}>{o.label}</Chip>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {ART_OPTIONS.map((o) => (
              <Chip key={o.key} active={art === o.key} onClick={() => setArt(o.key)}>{o.label}</Chip>
            ))}

            <Select value={biome} onChange={setBiome}>
              <option value="all">Todo bioma</option>
              {Object.entries(BIOME_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </Select>

            <Select value={archetype} onChange={setArchetype}>
              <option value="all">Todo arquétipo</option>
              {Object.keys(ARCHETYPES).map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </Select>

            {models.length > 1 && (
              <Select value={model} onChange={setModel}>
                <option value="all">Todo modelo</option>
                {models.map((m) => (
                  <option key={m} value={m}>{m.replace(/^LLM: .*\| IMG: /, '')}</option>
                ))}
              </Select>
            )}

            <Select value={sort} onChange={(v) => setSort(v as SortKey)}>
              {SORT_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </Select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(232,213,160,0.5)' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="@dono, perk, cor…"
                className="pl-7 pr-2 py-1 rounded-lg text-[11px] outline-none w-40"
                style={{
                  fontFamily: 'var(--font-body)',
                  background: 'rgba(20,32,14,0.9)',
                  color: 'rgba(232,213,160,0.9)',
                  border: '1px solid rgba(232,213,160,0.2)',
                }}
              />
            </div>

            <Chip active={false} onClick={limpar}>Limpar</Chip>
          </div>
        </div>

        {/* Contagem */}
        <p className="text-[11px] mb-3" style={{ fontFamily: 'var(--font-body)', color: 'rgba(232,213,160,0.5)' }}>
          {filtered.length} de {plants.length} plantas · {artesVisiveis} artes
          {data && data.total >= data.limit && ` · teto de ${data.limit} atingido`}
        </p>

        {error ? (
          <p className="text-sm py-10 text-center" style={{ fontFamily: 'var(--font-body)', color: '#e08a8a' }}>
            {(error as Error).message}
          </p>
        ) : isPending ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-gold)' }} />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm py-16 text-center" style={{ fontFamily: 'var(--font-caption)', fontStyle: 'italic', color: 'rgba(232,213,160,0.5)' }}>
            Nenhuma planta com esses filtros.
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2.5 p-1.5">
            {filtered.map((p) => (
              <PlantCell key={p.id} plant={p} onOpen={() => setSelected(p)} />
            ))}
          </div>
        )}
      </div>

      {selected && <DetailModal plant={selected} onClose={() => setSelected(null)} />}
    </AppShell>
  );
}
