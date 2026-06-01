import { pathToFileURL } from 'node:url';

import {
  appendDaemonAuditJournal,
  runWorkGraphDaemonTickFromBacklogFile,
} from './workGraphDaemonTick.mjs';

export const DAEMON_WATCH_OUTPUT_SCHEMA = 'workgraph.daemon.watch.output.v1';

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function runWorkGraphDaemonWatch(options = {}) {
  const maxTicks = Number.isInteger(options.maxTicks) && options.maxTicks > 0 ? options.maxTicks : 2;
  const intervalMs = Number.isInteger(options.intervalMs) && options.intervalMs >= 0 ? options.intervalMs : 50;
  const maxDurationMs = Number.isInteger(options.maxDurationMs) && options.maxDurationMs > 0 ? options.maxDurationMs : 5000;
  const writeJournal = options.writeJournal !== false;
  const dryRun = options.dryRun !== false;
  const startedAt = Date.now();
  const results = [];

  for (let index = 0; index < maxTicks; index += 1) {
    if (Date.now() - startedAt >= maxDurationMs) {
      break;
    }

    const tickId = options.tickIdPrefix
      ? `${options.tickIdPrefix}-${index + 1}`
      : `watch-tick-${index + 1}`;

    const result = await runWorkGraphDaemonTickFromBacklogFile({
      ...options,
      tickId,
      runId: options.runId ?? `watch-run-${index + 1}`,
      schedulerPolicy: {
        dryRun,
        paused: false,
        ...(options.schedulerPolicy ?? {}),
      },
    });

    if (writeJournal && result.auditRecord) {
      await appendDaemonAuditJournal(result.auditRecord, options);
    }

    results.push({
      tickId: result.tickId,
      ok: result.ok,
      skippedReason: result.skippedReason ?? null,
      selectedTaskId: result.selectedTaskId ?? null,
      event: result.auditRecord?.event ?? null,
    });

    if (index < maxTicks - 1 && intervalMs > 0) {
      await sleep(intervalMs);
    }
  }

  return {
    schema: DAEMON_WATCH_OUTPUT_SCHEMA,
    maxTicks,
    intervalMs,
    maxDurationMs,
    elapsedMs: Date.now() - startedAt,
    tickCount: results.length,
    dryRun,
    writeJournal,
    results,
  };
}

function parseCliArgs(argv) {
  const options = {
    maxTicks: 2,
    intervalMs: 1000,
    maxDurationMs: 600_000,
    dryRun: false,
    writeJournal: true,
    backlogPath: undefined,
    auditPath: undefined,
    paused: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--paused') {
      options.paused = true;
      continue;
    }

    if (arg === '--no-journal') {
      options.writeJournal = false;
      continue;
    }

    if (arg === '--max-ticks') {
      options.maxTicks = Number.parseInt(argv[index + 1], 10);
      index += 1;
      continue;
    }

    if (arg === '--interval-ms') {
      options.intervalMs = Number.parseInt(argv[index + 1], 10);
      index += 1;
      continue;
    }

    if (arg === '--max-duration-ms') {
      options.maxDurationMs = Number.parseInt(argv[index + 1], 10);
      continue;
    }

    if (arg === '--backlog') {
      options.backlogPath = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--audit') {
      options.auditPath = argv[index + 1];
      index += 1;
    }
  }

  return options;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const cli = parseCliArgs(process.argv);
  const output = await runWorkGraphDaemonWatch({
    backlogPath: cli.backlogPath,
    auditPath: cli.auditPath,
    maxTicks: cli.maxTicks,
    intervalMs: cli.intervalMs,
    maxDurationMs: cli.maxDurationMs,
    dryRun: cli.dryRun,
    writeJournal: cli.writeJournal,
    schedulerPolicy: { paused: cli.paused },
  });

  console.log(JSON.stringify({
    schema: output.schema,
    tickCount: output.tickCount,
    dryRun: output.dryRun,
    elapsedMs: output.elapsedMs,
    results: output.results,
  }, null, 2));
}
