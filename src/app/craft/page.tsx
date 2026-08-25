'use client';

import Image from 'next/image';
import { AppShell } from '@/components/AppShell';
import { CraftBench } from '@/components/CraftBench';
import { useAuth } from '@/hooks/useAuth';

/**
 * OFICINA — a bancada de craft.
 *
 * O cenário é o fundo; tudo o que interage vive por cima dele no `CraftBench`.
 * `scrollable={false}`: a sala ocupa a tela inteira, como o jardim.
 */
export default function CraftPage() {
  const { user } = useAuth();

  return (
    <AppShell scrollable={false}>
      <div className="relative w-full h-full overflow-hidden">
        <Image
          src="/imgs/craft/bg-crafting-room.webp"
          alt=""
          fill
          priority
          className="object-cover"
          draggable={false}
        />

        {/* Véu: o fundo é ilustração cheia, e sem isto nada por cima se lê. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(180deg, rgba(5,8,3,0.30) 0%, rgba(5,8,3,0.10) 40%, rgba(5,8,3,0.55) 100%)' }}
        />

        <h1
          className="absolute top-4 left-4 z-20 text-2xl font-black"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-light)', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}
        >
          Oficina
        </h1>

        <CraftBench userId={user?.id} />
      </div>
    </AppShell>
  );
}
