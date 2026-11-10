// Quick-fire: a timed sprint of random questions drawn from many rounds. Pure helpers.

export const QUICK_DURATIONS = [60, 90, 120, 180];
export const QUICK_WINDOW = 8; // seconds that count as "fast" for the speed bonus

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Every multiple-choice question of the chosen rounds, flattened. */
export function buildPool(rounds, roundIds) {
  const chosen = new Set(roundIds);
  const out = [];
  rounds.forEach((r) => {
    if (!chosen.has(r.id)) return;
    r.categories.forEach((c) => c.questions.forEach((q) => {
      if (q.options && q.options.length >= 2 && q.type !== 'fill-in') out.push({ q, topic: c.short || c.name, round: r.title });
    }));
  });
  return out;
}

/** Deterministic shuffle: the same seed always gives the same order. */
export function seededOrder(items, seed) {
  const rand = mulberry32(seed);
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Next question for a turn. Wraps around if the pool is smaller than the number answered. */
export const pickQuestion = (order, cursor) => (order.length ? order[cursor % order.length] : null);
