#!/usr/bin/env node
/**
 * Stop Work Graph backlog UI on the configured port, then start it again.
 * Usage: npm run backlog:ui:restart
 */
import { execSync, spawnSync } from 'node:child_process';
import { createConnection } from 'node:net';
import { platform } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const host = process.env.WORKGRAPH_BACKLOG_UI_HOST ?? '127.0.0.1';
const port = Number(process.env.WORKGRAPH_BACKLOG_UI_PORT ?? 4177);

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isPortOpen(targetHost, targetPort) {
  return new Promise((resolve) => {
    const socket = createConnection({ host: targetHost, port: targetPort });
    const done = (open) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(400);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

function listListeningPids(targetPort) {
  const pids = new Set();

  if (platform() === 'win32') {
    try {
      const output = execSync('netstat -ano -p tcp', { encoding: 'utf8' });
      for (const line of output.split('\n')) {
        if (!/LISTENING/i.test(line)) continue;
        if (!line.includes(`:${targetPort}`)) continue;
        const parts = line.trim().split(/\s+/);
        const pid = parts.at(-1);
        if (pid && /^\d+$/.test(pid) && pid !== '0') {
          pids.add(pid);
        }
      }
    } catch {
      return pids;
    }
    return pids;
  }

  try {
    const output = execSync(`lsof -nP -iTCP:${targetPort} -sTCP:LISTEN -t`, { encoding: 'utf8' });
    for (const pid of output.split('\n').map((value) => value.trim()).filter(Boolean)) {
      pids.add(pid);
    }
  } catch {
    // no listener
  }
  return pids;
}

function killListeningPids(pids) {
  for (const pid of pids) {
    try {
      if (platform() === 'win32') {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
      } else {
        process.kill(Number(pid), 'SIGTERM');
      }
    } catch {
      // process may already be gone
    }
  }
}

async function stopBacklogUi() {
  const pids = listListeningPids(port);
  if (pids.size === 0) {
    console.log(`No listener on ${host}:${port}`);
    return;
  }

  console.log(`Stopping backlog UI on ${host}:${port} (pid: ${[...pids].join(', ')})`);
  killListeningPids(pids);

  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    const stillOpen = await isPortOpen(host, port);
    if (!stillOpen) {
      return;
    }
    await sleep(250);
  }

  throw new Error(`Port ${host}:${port} is still in use after stop attempt`);
}

function startBacklogUi() {
  console.log(`Starting backlog UI on ${host}:${port}…`);

  const build = spawnSync(process.execPath, ['scripts/build-graph-canvas-lit-flow.mjs'], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
  });
  if (build.status !== 0) {
    process.exit(build.status ?? 1);
  }

  const server = spawnSync(process.execPath, ['src/workGraphBacklogUiServer.mjs'], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
  });
  process.exit(server.status ?? 0);
}

await stopBacklogUi();
startBacklogUi();
