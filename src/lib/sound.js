// Synthesised sound effects (Web Audio). No audio files needed.
let ctx = null;
let muted = false;
export const setMuted = (v) => { muted = !!v; };

function audio() {
  if (!ctx) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ctx = new A(); }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
function tone({ freq = 440, dur = 0.15, type = 'sine', delay = 0, gain = 0.16, to }) {
  if (muted) return;
  try {
    const c = audio(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + delay;
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.03);
  } catch { /* audio unavailable */ }
}
export const sfx = {
  click: () => tone({ freq: 700, dur: 0.06, type: 'triangle', gain: 0.1 }),
  open: () => { tone({ freq: 392, dur: 0.12, type: 'triangle' }); tone({ freq: 587, dur: 0.18, type: 'triangle', delay: 0.08 }); },
  buzz: () => { tone({ freq: 320, dur: 0.2, type: 'square', gain: 0.1 }); tone({ freq: 480, dur: 0.16, type: 'square', gain: 0.08, delay: 0.1 }); },
  correct: () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone({ freq: f, dur: 0.22, gain: 0.17, delay: i * 0.09 })),
  wrong: () => tone({ freq: 220, dur: 0.32, type: 'sawtooth', gain: 0.13, to: 100 }),
  timeout: () => tone({ freq: 180, dur: 0.45, type: 'sawtooth', gain: 0.15, to: 80 }),
  tick: () => tone({ freq: 1000, dur: 0.045, type: 'square', gain: 0.06 }),
  win: () => [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone({ freq: f, dur: 0.34, gain: 0.17, delay: i * 0.13 })),
};
