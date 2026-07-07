'use client';

import Image from 'next/image';

interface LoaderProps {
  /** `fullscreen` cobre a tela com overlay; `inline` renderiza só a logo animada. */
  variant?: 'fullscreen' | 'inline';
  /** Tamanho da logo em px. */
  size?: number;
  /** Se true, a própria logo gira (sem anel). Senão, logo "respira" dentro do anel. */
  spin?: boolean;
}

/**
 * Feedback de carregamento da Brotaria. Dois modos:
 * - padrão: a logo "respira" dentro de um anel girando.
 * - `spin`: a logo gira no próprio eixo (usado no lugar da planta enquanto a IA gera).
 */
export default function Loader({ variant = 'fullscreen', size = 72, spin = false }: LoaderProps) {
  const logo = (
    <div className="brota-loader" style={{ width: size, height: size }}>
      {!spin && <span className="brota-loader__ring" />}
      <Image
        src="/imgs/brotaria.webp"
        alt=""
        aria-hidden
        width={size}
        height={size}
        priority
        className={`brota-loader__logo ${spin ? 'brota-loader__logo--spin' : ''}`}
      />
    </div>
  );

  if (variant === 'inline') {
    return logo;
  }

  return (
    <div className="brota-overlay" role="status" aria-label="Carregando">
      {logo}
    </div>
  );
}
