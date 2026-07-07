'use client';

/**
 * Círculo de avatar reutilizável (sidebar, bottomnav, picker, modo visitante).
 * Mostra a imagem escolhida; se não houver, cai para a inicial do apelido.
 * Usa <img> puro de propósito (evita config de domínios do next/image).
 */
export function AvatarCircle({
  url,
  initial,
  size = 40,
  className = '',
  ring = false,
}: {
  url?: string | null;
  initial?: string | null;
  size?: number;
  className?: string;
  ring?: boolean;
}) {
  return (
    <div
      className={`rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #2a4a1e, #1a2f10)',
        border: ring ? '2px solid var(--color-gold)' : '1px solid var(--color-wood-light)',
        color: 'var(--color-wood-light)',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: size * 0.4,
      }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="avatar" className="w-full h-full object-cover" draggable={false} />
      ) : (
        (initial ?? '?').toUpperCase()
      )}
    </div>
  );
}
