'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Sprout } from 'lucide-react';

/**
 * Imagem de planta com fallback gracioso.
 *
 * Se a URL falhar (404 no storage, SVG remoto bloqueado pelo next/image,
 * rede fora do ar, etc.) NUNCA mostramos o ícone de imagem quebrada com o
 * alt-text — em vez disso, um broto estilizado. Assim a evolução nunca
 * "quebra" visualmente, mesmo quando algo dá errado na geração da imagem.
 */
export function PlantImage({
  src,
  alt,
  className,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Sprout
          className="w-1/3 h-1/3"
          style={{ color: 'rgba(134,180,90,0.55)' }}
          strokeWidth={1.5}
        />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={className}
      draggable={false}
      onError={() => setErrored(true)}
    />
  );
}
