import Image from 'next/image';

const ASPECT = 479 / 1156; // largura/altura do asset já cortado (herbo.webp)

/**
 * Ícone do herbo (dupla-hélice, herbo.webp).
 * Substitui o emoji 🍃 usado como representação da moeda orgânica.
 * `size` define a altura; a largura é derivada do aspect ratio do asset.
 */
export function HerboIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <span
      className={`relative inline-block align-middle ${className ?? ''}`}
      style={{ width: size * ASPECT, height: size }}
    >
      <Image src="/imgs/herbo.webp" alt="herbo" fill className="object-contain" draggable={false} />
    </span>
  );
}
