import { useMemo } from 'react';
import { motion } from 'framer-motion';

/** Dim oxblood chamber: slow warm glows, a faint Adinkra ring pattern and a few drifting gold stars. Decorative only. */
export default function Background() {
  const bits = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    i, x: (i * 53 + 11) % 100, y: (i * 37 + 7) % 100, s: 8 + ((i * 7) % 14), d: 16 + ((i * 5) % 16),
    hue: ['#d9a82b', '#ce1126', '#f6efe0'][i % 3],
  })), []);
  return (
    <div className="bg" aria-hidden="true">
      <div className="bg__aurora bg__aurora--a" />
      <div className="bg__aurora bg__aurora--b" />
      <div className="bg__aurora bg__aurora--c" />
      <div className="bg__weave" />
      {bits.map((b) => (
        <motion.span key={b.i} className="bg__bit bg__bit--star"
          style={{ left: `${b.x}%`, top: `${b.y}%`, width: b.s, height: b.s, color: b.hue }}
          animate={{ y: [0, -36, 0], opacity: [0.1, 0.4, 0.1], rotate: [0, 180] }}
          transition={{ duration: b.d, repeat: Infinity, ease: 'easeInOut', delay: b.i * 0.4 }} />
      ))}
      <div className="bg__vignette" />
    </div>
  );
}
