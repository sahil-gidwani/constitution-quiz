// localStorage wrapper that never throws (private mode, blocked storage, quota) and falls back to memory.
const mem = new Map();
let ok = true;
try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); } catch { ok = false; }

export function load(key, fallback = null) {
  try {
    const raw = ok ? localStorage.getItem(key) : mem.get(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
export function save(key, value) {
  const raw = JSON.stringify(value);
  try { if (ok) localStorage.setItem(key, raw); else mem.set(key, raw); } catch { mem.set(key, raw); }
}
export function clear(key) {
  try { if (ok) localStorage.removeItem(key); } catch { /* ignore */ }
  mem.delete(key);
}
