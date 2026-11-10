import confetti from 'canvas-confetti';

const reduce = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const COLORS = ['#d9a82b', '#f0cd6e', '#ce1126', '#0f9d58', '#f6efe0'];

export function burst() {
  if (reduce()) return;
  confetti({ particleCount: 90, spread: 80, origin: { x: 0.25, y: 0.7 }, colors: COLORS, disableForReducedMotion: true });
  confetti({ particleCount: 90, spread: 80, origin: { x: 0.75, y: 0.7 }, colors: COLORS, disableForReducedMotion: true });
}
export function celebrate(ms = 2200) {
  if (reduce()) return () => {};
  const end = Date.now() + ms; let raf;
  const frame = () => {
    confetti({ particleCount: 5, angle: 60, spread: 65, origin: { x: 0, y: 0.8 }, colors: COLORS });
    confetti({ particleCount: 5, angle: 120, spread: 65, origin: { x: 1, y: 0.8 }, colors: COLORS });
    if (Date.now() < end) raf = requestAnimationFrame(frame);
  };
  frame();
  return () => cancelAnimationFrame(raf);
}
