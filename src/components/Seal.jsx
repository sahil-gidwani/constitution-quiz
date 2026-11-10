import { useId } from 'react';

/** The game's mark: a gold ring around the red, gold and green bands with the black star of Ghana. Decorative. */
export default function Seal({ size = 34, spin = false, className = '' }) {
  const id = useId().replace(/:/g, '');
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5; const r = i % 2 ? 11 : 26;
    return `${(50 + Math.cos(a) * r).toFixed(1)},${(52 + Math.sin(a) * r).toFixed(1)}`;
  }).join(' ');
  return (
    <svg className={`seal ${spin ? 'seal--spin' : ''} ${className}`} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={`c${id}`}><circle cx="50" cy="50" r="40" /></clipPath>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4d77a" /><stop offset="0.5" stop-color="#d9a82b" /><stop offset="1" stop-color="#a97a12" /></linearGradient>
      </defs>
      <circle cx="50" cy="50" r="47" fill="none" stroke={`url(#g${id})`} strokeWidth="5" />
      <circle cx="50" cy="50" r="43" fill="#120708" />
      <g clipPath={`url(#c${id})`}>
        <rect x="0" y="0" width="100" height="34" fill="#ce1126" />
        <rect x="0" y="33" width="100" height="34" fill={`url(#g${id})`} />
        <rect x="0" y="66" width="100" height="34" fill="#0f8a4b" />
      </g>
      <polygon points={pts} fill="#0b0405" stroke="#0b0405" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
