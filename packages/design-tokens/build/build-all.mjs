import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { listThemeFiles, themeFileToCss } from './tokens-to-css.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'generated');

mkdirSync(OUT_DIR, { recursive: true });

for (const themeFile of listThemeFiles()) {
  const themeId = themeFile.replace(/^themes\//, '').replace(/\.json$/, '');
  const css = themeFileToCss(themeFile);
  const outPath = join(OUT_DIR, `${themeId}.css`);
  writeFileSync(outPath, css, 'utf8');
  console.log(`wrote ${outPath}`);
}
