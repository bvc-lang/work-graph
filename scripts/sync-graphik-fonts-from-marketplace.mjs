#!/usr/bin/env node
/**
 * Copy Graphik LCG woff2 + slim stylesheet into Work Graph public/fonts (Marketplace parity).
 */
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WG_ROOT = join(__dirname, '..');
const MARKETPLACE_ROOT = process.env.MARKETPLACE_ROOT
  ? resolve(process.env.MARKETPLACE_ROOT)
  : resolve(WG_ROOT, '..', '..', '04 Marketplace');
const SOURCE_DIR = join(MARKETPLACE_ROOT, 'public', 'fonts', 'GraphikLCG');
const TARGET_DIR = join(WG_ROOT, 'public', 'fonts', 'GraphikLCG');

const FACES = [
  { file: 'GraphikLCG-Regular.woff2', weight: 400, style: 'normal' },
  { file: 'GraphikLCG-Medium.woff2', weight: 500, style: 'normal' },
  { file: 'GraphikLCG-Semibold.woff2', weight: 600, style: 'normal' },
];

const SLIM_STYLESHEET = `/** Synced from Marketplace Graphik LCG — run: npm run sync:fonts:marketplace */
${FACES.map(({ file, weight, style }) => `@font-face {
  font-family: 'Graphik LCG';
  src: url('${file}') format('woff2');
  font-weight: ${weight};
  font-style: ${style};
  font-display: swap;
}`).join('\n\n')}
`;

function main() {
  mkdirSync(TARGET_DIR, { recursive: true });
  for (const { file } of FACES) {
    copyFileSync(join(SOURCE_DIR, file), join(TARGET_DIR, file));
  }
  writeFileSync(join(TARGET_DIR, 'stylesheet.css'), `${SLIM_STYLESHEET}\n`, 'utf8');
  console.log(JSON.stringify({
    schema: 'workgraph.sync-graphik-fonts-marketplace.v1',
    source: SOURCE_DIR,
    target: TARGET_DIR,
    files: FACES.map(({ file }) => file),
  }, null, 2));
}

main();
