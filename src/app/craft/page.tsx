'use client';

import Image from 'next/image';
import { Hammer } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { isDevUser } from '@/lib/devUser';

/**
 * OFICINA — tela de crafting. Ainda NÃO é uma feature: existe só para o fundo
 * ficar no lugar e a rota nascer pronta.
 *
 * Fechada de propósito. Não há link para cá em nenhum menu, e quem não é a conta
 * de desenvolvimento vê o aviso de "em obras" — nada de mecânica, nada de rota
 * de API. Quando a feature existir, é aqui que ela nasce: troque o bloco do
 * `!liberado` pelo conteúdo e ligue um item de menu.
 */
export default function CraftPage() {
  const { user, isLoading } = useAuth();
  const liberado = isDevUser(user?.id);

  return (
    <AppShell scrollable={false}>
      <div className="relative w-full h-full overflow-hidden">
        {/* Fundo da oficina */}
        <Image
          src="/imgs/craft/bg-crafting-room.webp"
          alt=""
          fill
          priority
          className="object-cover"
          draggable={false}
        />

        {/* Véu escuro: o fundo é ilustração cheia, e sem isto nenhum texto por
            cima dele se lê. */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(5,8,3,0.35) 0%, rgba(5,8,3,0.72) 100%)' }}
        />

        <div className="relative h-full flex flex-col items-center justify-center px-6 text-center">
          <div
            className="flex items-center justify-center rounded-full mb-4"
            style={{
              width: 72,
              height: 72,
              background: 'rgba(8,14,5,0.55)',
              border: '1.5px solid rgba(201,162,39,0.45)',
              backdropFilter: 'blur(4px)',
            }}
          >
            <Hammer className="w-8 h-8" style={{ color: 'var(--color-gold)' }} />
          </div>

          <h1
            className="text-3xl font-black mb-2"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-light)' }}
          >
            Oficina
          </h1>

          {!isLoading && !liberado && (
            <p
              className="text-sm max-w-xs"
              style={{ fontFamily: 'var(--font-caption)', fontStyle: 'italic', color: 'rgba(232,213,160,0.7)' }}
            >
              A bancada está montada, mas as ferramentas ainda não chegaram. Volte
              em outra atualização.
            </p>
          )}

          {liberado && (
            <p
              className="text-sm max-w-xs"
              style={{ fontFamily: 'var(--font-caption)', fontStyle: 'italic', color: 'rgba(232,213,160,0.7)' }}
            >
              [dev] Tela reservada para o crafting. Sem mecânica ainda — só o
              cenário no lugar.
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
