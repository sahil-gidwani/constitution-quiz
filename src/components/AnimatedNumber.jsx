import { useEffect } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';

export default function AnimatedNumber({ value, duration = 0.8 }) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => Math.round(v).toLocaleString());
  useEffect(() => { const c = animate(mv, value, { duration, ease: 'easeOut' }); return () => c.stop(); }, [value, duration, mv]);
  return <motion.span>{text}</motion.span>;
}
