#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public');
const entry = join(root, 'src/graphCanvasLitFlow/client/mountGraphCanvasLitFlow.ts');
const cssSource = join(root, 'node_modules/lit-flow/dist/bundled/lit-flow.css');
const cssTheme = join(root, 'src/graphCanvasLitFlow/client/graphCanvasTheme.css');
const cssTarget = join(outDir, 'graph-canvas-lit-flow.css');

mkdirSync(outDir, { recursive: true });

await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  format: 'iife',
  globalName: 'WorkGraphGraphCanvas',
  outfile: join(outDir, 'graph-canvas-lit-flow.js'),
  platform: 'browser',
  target: ['es2022'],
  sourcemap: true,
  logLevel: 'info',
});

writeFileSync(
  cssTarget,
  `${readFileSync(cssSource, 'utf8')}\n${readFileSync(cssTheme, 'utf8')}`,
);
console.log(JSON.stringify({
  schema: 'workgraph.build-graph-canvas-lit-flow.v1',
  js: 'public/graph-canvas-lit-flow.js',
  css: 'public/graph-canvas-lit-flow.css',
}, null, 2));
