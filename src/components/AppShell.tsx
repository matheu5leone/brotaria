'use client';

import Sidebar from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';

/**
 * Shell compartilhado para todas as páginas autenticadas.
 * - Desktop (md+): Sidebar à esquerda + conteúdo à direita
 * - Mobile  (<md): conteúdo em cima + BottomNav fixo embaixo
 *
 * scrollable=false para o jardim (Garden preenche exatamente o espaço)
 * scrollable=true  para loja, ranking e outras páginas com conteúdo longo
 */
export function AppShell({
  children,
  scrollable = true,
}: {
  children: React.ReactNode;
  scrollable?: boolean;
}) {
  return (
    <div
      className="flex flex-col md:flex-row overflow-hidden"
      style={{ height: '100dvh', background: 'var(--color-garden-deep)' }}
    >
      {/* Sidebar — somente desktop */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Conteúdo principal */}
      <main className={`flex-1 min-h-0 ${scrollable ? 'overflow-y-auto' : 'overflow-hidden'}`}>
        {children}
      </main>

      {/* BottomNav — somente mobile */}
      <div className="flex-shrink-0 md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
