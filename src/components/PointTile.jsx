import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Check, X, SkipForward } from 'lucide-react';

const ICON = { correct: Check, missed: X, skipped: SkipForward };
export default function PointTile({ points, entry, color, label, delay, onClick }) {
  const ref = useRef(null);
  const Done = entry && ICON[entry.status];
  const move = (e) => {
    const b = ref.current.getBoundingClientRect();
    ref.current.style.setProperty('--mx', `${e.clientX - b.left}px`);
    ref.current.style.setProperty('--my', `${e.clientY - b.top}px`);
  };
  return (
    <motion.button ref={ref} className={`tile tile--p${points / 10} ${entry ? `tile--done tile--${entry.status}` : ''}`}
      style={entry?.status === 'correct' ? { '--win': color } : undefined}
      initial={{ opacity: 0, scale: 0.6, rotateX: -50 }} animate={{ opacity: 1, scale: 1, rotateX: 0 }}
      transition={{ delay, type: 'spring', stiffness: 260, damping: 20 }}
      whileHover={entry ? undefined : { y: -4, scale: 1.05 }} whileTap={entry ? undefined : { scale: 0.93 }}
      onPointerMove={move} onClick={onClick} disabled={!!entry}
      aria-label={`${label}, ${points} points${entry ? `, ${entry.status}` : ''}`}>
      {Done ? <Done size={22} strokeWidth={3} /> : <span className="tile__pts">{points}</span>}
    </motion.button>
  );
}
