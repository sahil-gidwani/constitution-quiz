import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Deadline-based countdown. Uses performance.now() rather than counting interval ticks,
 * so it stays accurate in background tabs and on slow mobile devices.
 * Each instance is independent; pause() keeps the remaining time, resume() continues from it.
 */
export function useCountdown(onExpire) {
  const [ms, setMs] = useState(0);
  const [duration, setDuration] = useState(0);
  const r = useRef({ deadline: 0, running: false, left: 0 });
  const cb = useRef(onExpire);
  cb.current = onExpire;

  useEffect(() => {
    const id = setInterval(() => {
      if (!r.current.running) return;
      const left = r.current.deadline - performance.now();
      if (left <= 0) { r.current.running = false; r.current.left = 0; setMs(0); cb.current?.(); }
      else setMs(left);
    }, 80);
    return () => clearInterval(id);
  }, []);

  const start = useCallback((durationMs) => {
    r.current = { deadline: performance.now() + durationMs, running: true, left: durationMs };
    setDuration(durationMs); setMs(durationMs);
  }, []);
  const pause = useCallback(() => {
    if (!r.current.running) return;
    r.current.left = Math.max(0, r.current.deadline - performance.now()); r.current.running = false; setMs(r.current.left);
  }, []);
  const resume = useCallback(() => {
    if (r.current.running || r.current.left <= 0) return;
    r.current.deadline = performance.now() + r.current.left; r.current.running = true;
  }, []);
  const stop = useCallback(() => { r.current.running = false; }, []);
  return { ms, seconds: Math.ceil(ms / 1000), duration, start, pause, resume, stop };
}
