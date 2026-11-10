// Regenerates public/icons/*.png from one SVG design.  Usage: npm i -D sharp && node scripts/make-icons.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const star = (cx, cy, r) => {
  const pts = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r * 0.42 : r; pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`); }
  return pts.join(' ');
};
// scale = share of the canvas the artwork may use (maskable icons keep to the central 80% safe zone)
const svg = ({ rounded, scale }) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="g" cx="30%" cy="22%" r="85%"><stop offset="0" stop-color="#5a1a1f"/><stop offset="0.55" stop-color="#1c0b0d"/><stop offset="1" stop-color="#120708"/></radialGradient>
    <linearGradient id="s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4d77a"/><stop offset="0.5" stop-color="#d9a82b"/><stop offset="1" stop-color="#a97a12"/></linearGradient>
    <clipPath id="c"><circle cx="256" cy="256" r="176"/></clipPath>
  </defs>
  <rect width="512" height="512" ${rounded ? 'rx="112"' : ''} fill="url(#g)"/>
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    <circle cx="256" cy="256" r="196" fill="none" stroke="url(#s)" stroke-width="20"/>
    <g clip-path="url(#c)"><rect x="60" y="80" width="392" height="118" fill="#ce1126"/><rect x="60" y="196" width="392" height="122" fill="url(#s)"/><rect x="60" y="316" width="392" height="120" fill="#0f8a4b"/></g>
    <polygon points="${star(256, 262, 104)}" fill="#0b0405"/>
  </g></svg>`;

mkdirSync('public/icons', { recursive: true });
const out = [
  ['icon-192.png', 192, { rounded: true, scale: 1 }],
  ['icon-512.png', 512, { rounded: true, scale: 1 }],
  ['icon-maskable-512.png', 512, { rounded: false, scale: 0.78 }],
  ['apple-touch-icon.png', 180, { rounded: false, scale: 0.92 }],
];
for (const [name, size, opt] of out) {
  await sharp(Buffer.from(svg(opt))).resize(size, size).png().toFile(`public/icons/${name}`);
  console.log('wrote', name);
}
