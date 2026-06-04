#!/usr/bin/env node
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { startBacklogUiServer } from '../src/workGraphBacklogUiServer.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const e2eRoot = resolve(repoRoot, 'tests/fixtures/e2e-operator-dashboard');
const host = process.env.WORKGRAPH_BACKLOG_UI_HOST ?? 'localhost';
const port = Number(process.env.WORKGRAPH_BACKLOG_UI_PORT ?? 4188);

const { host: boundHost, port: boundPort } = await startBacklogUiServer({
  cwd: process.env.WORKGRAPH_E2E_ROOT ?? e2eRoot,
  backlogPath: 'backlog.bvc',
  journalPath: 'work/worker-runs.jsonl',
  auditPath: 'work/daemon-audit.jsonl',
  host,
  port,
});

console.log(`Work Graph E2E UI: http://${boundHost}:${boundPort}/`);
