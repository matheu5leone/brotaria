'use client';

// Folhas determinísticas — sem Math.random() para evitar hydration mismatch.
const LEAVES = [
  { left: '3%',   delay: '0s',    dur: '9s',  size: 18, color: '#4a8a3a', anim: 'leaf-fall-a' },
  { left: '10%',  delay: '1.8s',  dur: '11s', size: 14, color: '#3a7a2a', anim: 'leaf-fall-b' },
  { left: '18%',  delay: '0.4s',  dur: '8s',  size: 22, color: '#c9a227', anim: 'leaf-fall-c' },
  { left: '27%',  delay: '3.2s',  dur: '10s', size: 16, color: '#4a8a3a', anim: 'leaf-fall-a' },
  { left: '35%',  delay: '5.5s',  dur: '7.5s',size: 20, color: '#5a9a4a', anim: 'leaf-fall-b' },
  { left: '42%',  delay: '1.1s',  dur: '12s', size: 13, color: '#3a7a2a', anim: 'leaf-fall-c' },
  { left: '50%',  delay: '6.8s',  dur: '9.5s',size: 24, color: '#c9a227', anim: 'leaf-fall-a' },
  { left: '58%',  delay: '2.4s',  dur: '8.5s',size: 17, color: '#4a8a3a', anim: 'leaf-fall-b' },
  { left: '65%',  delay: '4.0s',  dur: '11.5s',size:15, color: '#6aaa5a', anim: 'leaf-fall-c' },
  { left: '72%',  delay: '0.7s',  dur: '9s',  size: 21, color: '#3a7a2a', anim: 'leaf-fall-a' },
  { left: '79%',  delay: '7.2s',  dur: '8s',  size: 19, color: '#c9a227', anim: 'leaf-fall-b' },
  { left: '86%',  delay: '2.9s',  dur: '10.5s',size:16, color: '#4a8a3a', anim: 'leaf-fall-c' },
  { left: '92%',  delay: '5.0s',  dur: '7s',  size: 23, color: '#5a9a4a', anim: 'leaf-fall-a' },
  { left: '8%',   delay: '8.5s',  dur: '9.5s',size: 14, color: '#3a7a2a', anim: 'leaf-fall-b' },
  { left: '47%',  delay: '3.7s',  dur: '11s', size: 18, color: '#c9a227', anim: 'leaf-fall-c' },
  { left: '62%',  delay: '6.3s',  dur: '8s',  size: 20, color: '#4a8a3a', anim: 'leaf-fall-a' },
  { left: '22%',  delay: '9.1s',  dur: '10s', size: 15, color: '#6aaa5a', anim: 'leaf-fall-b' },
  { left: '83%',  delay: '1.5s',  dur: '12s', size: 17, color: '#3a7a2a', anim: 'leaf-fall-c' },
];

function LeafSvg({ color, size }: { color: string; size: number }) {
  return (
    <svg
      width={size}
      height={size * 1.3}
      viewBox="0 0 20 26"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M10 0C6 4 0 9 0 15C0 21 5 26 10 26C15 26 20 21 20 15C20 9 14 4 10 0Z" />
      <line x1="10" y1="2" x2="10" y2="24" stroke="rgba(0,0,0,0.2)" strokeWidth="0.8" />
      <line x1="10" y1="10" x2="5" y2="16" stroke="rgba(0,0,0,0.12)" strokeWidth="0.5" />
      <line x1="10" y1="10" x2="15" y2="16" stroke="rgba(0,0,0,0.12)" strokeWidth="0.5" />
    </svg>
  );
}

export function FallingLeaves() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden="true">
      {LEAVES.map((leaf, i) => (
        <div
          key={i}
          className="falling-leaf absolute top-0"
          style={{
            left: leaf.left,
            animation: `${leaf.anim} ${leaf.dur} ${leaf.delay} ease-in-out infinite`,
            opacity: 0,
          }}
        >
          <LeafSvg color={leaf.color} size={leaf.size} />
        </div>
      ))}
    </div>
  );
}
