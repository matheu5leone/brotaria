'use client';

import Link, { useLinkStatus } from 'next/link';
import { type ComponentProps } from 'react';
import { createPortal } from 'react-dom';
import Loader from './Loader';

/**
 * `useLinkStatus` só funciona dentro de um descendente de <Link>. Este componente
 * lê o estado pendente e mostra o overlay da logo enquanto a navegação acontece.
 *
 * O overlay é renderizado via portal em document.body para cobrir a tela INTEIRA —
 * se ficasse aninhado dentro da sidebar, um ancestral com containing block (ex.:
 * transform/filter) poderia confiná-lo àquele trecho da tela.
 */
function PendingOverlay() {
  const { pending } = useLinkStatus();
  // `pending` é sempre false durante SSR/hidratação, então não há mismatch.
  if (!pending || typeof document === 'undefined') return null;
  return createPortal(<Loader variant="fullscreen" />, document.body);
}

/**
 * Drop-in para <Link> que exibe o loader de marca em tela cheia durante o delay
 * de troca de rota. Quando a rota já está prefetchada, o estado pendente é
 * pulado e nada aparece.
 */
export default function NavLink({ children, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link {...props}>
      {children}
      <PendingOverlay />
    </Link>
  );
}
