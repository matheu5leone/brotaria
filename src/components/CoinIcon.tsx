import Image from 'next/image';

/**
 * Ícone da moeda do jogo (coin.png).
 * Substitui o emoji 🪙 e o ícone Coins do lucide.
 */
export function CoinIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/imgs/coin.webp"
      alt="moeda"
      width={size}
      height={size}
      className={className}
      draggable={false}
    />
  );
}
