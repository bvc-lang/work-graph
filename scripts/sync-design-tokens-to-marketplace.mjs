#!/usr/bin/env node
/**
 * Copy generated design tokens CSS into Marketplace (AN-21 Phase 0).
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WG_ROOT = join(__dirname, '..');
const GENERATED = join(WG_ROOT, 'packages', 'design-tokens', 'generated', 'marketplace-default.css');

const MARKETPLACE_ROOT = process.env.MARKETPLACE_ROOT
  ? resolve(process.env.MARKETPLACE_ROOT)
  : resolve(WG_ROOT, '..', '..', '04 Marketplace');

const TARGET = join(MARKETPLACE_ROOT, 'resources', 'css', 'brand-tokens.css');
const GENERATED_COPY = join(MARKETPLACE_ROOT, 'resources', 'css', 'brand-tokens.generated.css');

function main() {
  const css = readFileSync(GENERATED, 'utf8');
  const banner = '/** Synced from Work Graph @iohasc/design-tokens — run: npm run sync:design-tokens:marketplace */\n';
  mkdirSync(dirname(TARGET), { recursive: true });
  writeFileSync(TARGET, banner + css.replace(/^\/\*\*[\s\S]*?\*\/\s*/m, ''), 'utf8');
  copyFileSync(GENERATED, GENERATED_COPY);
  console.log(JSON.stringify({
    schema: 'workgraph.sync-design-tokens-marketplace.v1',
    target: TARGET,
    generatedCopy: GENERATED_COPY,
  }, null, 2));
}

main();
