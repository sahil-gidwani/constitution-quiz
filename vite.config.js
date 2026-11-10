import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/** After the build: list every emitted file and write dist/sw.js so the whole app is cached for offline play. */
function offlineServiceWorker() {
  let outDir = 'dist';
  const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
  return {
    name: 'offline-service-worker',
    apply: 'build',
    configResolved(c) { outDir = c.build.outDir; },
    writeBundle() {
      const files = walk(outDir).map((f) => relative(outDir, f).split(sep).join('/')).filter((f) => f !== 'sw.js' && !f.endsWith('.gitkeep')).sort();
      const hash = createHash('sha256');
      files.forEach((f) => hash.update(f).update(readFileSync(join(outDir, f))));
      const urls = ['./', ...files.map((f) => `./${f}`)];
      const sw = readFileSync('scripts/sw.template.js', 'utf8').replaceAll('__VERSION__', hash.digest('hex').slice(0, 12)).replaceAll('__PRECACHE__', JSON.stringify(urls));
      writeFileSync(join(outDir, 'sw.js'), sw);
    },
  };
}

// base './' => the build works from any sub-path or even by opening dist/index.html from a static host.
export default defineConfig({ base: './', plugins: [react(), offlineServiceWorker()], build: { chunkSizeWarningLimit: 900 } });
