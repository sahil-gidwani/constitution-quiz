// Draws a shareable result card on a canvas and returns it as a PNG. No network, no libraries.

const W = 1080, H = 1350;
const GOLD = '#d9a82b', GOLD2 = '#f0cd6e', IVORY = '#f6efe0', MIST = 'rgba(246,239,224,0.72)', GREEN = '#0f8a4b', RED = '#ce1126', INK = '#120708';
const COLORS = ['#f5c542', '#34d399', '#fb7185', '#60a5fa', '#c084fc'];

function seal(ctx, cx, cy, r) {
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = INK; ctx.fill(); ctx.lineWidth = r * 0.11; ctx.strokeStyle = GOLD; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.86, 0, Math.PI * 2); ctx.clip();
  const h = (r * 1.72) / 3; const y0 = cy - r * 0.86;
  ctx.fillStyle = RED; ctx.fillRect(cx - r, y0, r * 2, h + 1); ctx.fillStyle = GOLD; ctx.fillRect(cx - r, y0 + h, r * 2, h + 1); ctx.fillStyle = GREEN; ctx.fillRect(cx - r, y0 + 2 * h, r * 2, h + 1);
  ctx.restore(); star(ctx, cx, cy + r * 0.04, r * 0.5, '#0b0405');
}

function star(ctx, cx, cy, r, fill) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r * 0.42 : r; ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}
function round(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function fit(ctx, text, maxW) { let t = text; while (ctx.measureText(t).width > maxW && t.length > 1) t = t.slice(0, -1); return t === text ? t : `${t.trimEnd()}…`; }

/**
 * data: { title, subtitle, rows: [{name, score, idx}], stats: [{label, value}], rules: [string], footer }
 */
export async function renderResultImage(data) {
  try {
    await Promise.all([document.fonts.load('800 120px "Playfair Display Variable"'), document.fonts.load('700 40px "Playfair Display Variable"'), document.fonts.load('500 32px "Figtree Variable"'), document.fonts.load('700 32px "Figtree Variable"')]);
  } catch { /* fall back to system fonts */ }
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const display = '"Playfair Display Variable", Georgia, serif', body = '"Figtree Variable", system-ui, sans-serif';

  const bg = ctx.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#3a0f14'); bg.addColorStop(0.55, '#120708'); bg.addColorStop(1, '#1c0b0d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  [[160, 120, 520, 'rgba(206,17,38,0.32)'], [980, 1180, 560, 'rgba(217,168,43,0.2)'], [900, 120, 380, 'rgba(15,138,75,0.14)']].forEach(([x, y, r, col]) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  });
  // kente band
  const band = [RED, INK, GOLD, INK, GREEN, INK]; const bw = [70, 8, 60, 8, 70, 8];
  for (let x = 0, i = 0; x < W; i++) { ctx.fillStyle = band[i % 6]; ctx.fillRect(x, 0, bw[i % 6], 18); ctx.fillRect(x, H - 18, bw[i % 6], 18); x += bw[i % 6]; }

  ctx.textAlign = 'center';
  seal(ctx, W / 2, 124, 58);
  ctx.fillStyle = MIST; ctx.font = `600 30px ${body}`; ctx.fillText('CONSTITUTION QUIZ SHOWDOWN', W / 2, 230);

  ctx.fillStyle = IVORY; ctx.font = `800 92px ${display}`;
  let title = data.title; while (ctx.measureText(title).width > W - 140 && title.length > 4) title = title.slice(0, -1);
  ctx.fillText(title, W / 2, 340);
  ctx.fillStyle = GOLD2; ctx.font = `500 38px ${body}`; ctx.fillText(fit(ctx, data.subtitle, W - 160), W / 2, 402);

  // ranking
  const rows = data.rows.slice(0, 5); const top = Math.max(1, ...rows.map((r) => r.score));
  let y = 470; const rowH = 104;
  rows.forEach((r, i) => {
    const col = COLORS[r.idx % COLORS.length];
    ctx.fillStyle = 'rgba(246,240,220,0.06)'; round(ctx, 70, y, W - 140, rowH - 14, 28); ctx.fill();
    ctx.strokeStyle = 'rgba(246,240,220,0.14)'; ctx.lineWidth = 2; ctx.stroke();
    const bw2 = Math.max(0, (W - 140 - 4) * Math.max(0, r.score) / top); // score bar
    ctx.save(); round(ctx, 70, y, W - 140, rowH - 14, 28); ctx.clip(); ctx.fillStyle = `${col}33`; ctx.fillRect(70, y, bw2, rowH - 14); ctx.restore();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(128, y + (rowH - 14) / 2, 28, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1c1400'; ctx.font = `800 30px ${body}`; ctx.textAlign = 'center'; ctx.fillText(String(i + 1), 128, y + (rowH - 14) / 2 + 11);
    ctx.textAlign = 'left'; ctx.fillStyle = IVORY; ctx.font = `700 40px ${body}`; ctx.fillText(fit(ctx, r.name, 560), 180, y + (rowH - 14) / 2 + 14);
    ctx.textAlign = 'right'; ctx.fillStyle = GOLD2; ctx.font = `800 52px ${display}`; ctx.fillText(String(r.score), W - 104, y + (rowH - 14) / 2 + 18);
    y += rowH;
  });
  ctx.textAlign = 'center';

  // stats
  y = Math.max(y + 24, 1010);
  const stats = data.stats.slice(0, 4); const sw = (W - 140) / Math.max(1, stats.length);
  stats.forEach((s, i) => {
    const cx = 70 + sw * i + sw / 2;
    ctx.fillStyle = IVORY; ctx.font = `800 60px ${display}`; ctx.fillText(String(s.value), cx, y + 50);
    ctx.fillStyle = MIST; ctx.font = `500 26px ${body}`; ctx.fillText(s.label, cx, y + 92);
  });

  if (data.rules.length) {
    ctx.fillStyle = MIST; ctx.font = `500 27px ${body}`;
    ctx.fillText(fit(ctx, `Rules: ${data.rules.join(' · ')}`, W - 140), W / 2, 1228);
  }
  ctx.fillStyle = 'rgba(246,240,220,0.5)'; ctx.font = `500 26px ${body}`; ctx.fillText(data.footer || '', W / 2, 1290);

  const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
  return { blob, url: c.toDataURL('image/png'), width: W, height: H };
}
