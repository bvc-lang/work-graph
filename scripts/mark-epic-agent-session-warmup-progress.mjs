#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const TASKS = [
  {
    path: 'intent/system/runtime/work/sync-cursor-wg-rules-to-repo.work.bvc',
    evidence: [
      'docs/cursor-rules/*.mdc — 6 канонических правил',
      'npm run sync:cursor-rules + tests/sync-cursor-wg-rules.test.mjs',
      'npm run lint:cursor-rules-drift',
    ],
  },
  {
    path: 'intent/system/runtime/work/document-session-primer-runbook.work.bvc',
    evidence: [
      'docs/workgraph-session-primer-runbook.md',
      'docs/workgraph-mcp-clients.md § Session primer',
      'README.md — ссылка на primer',
    ],
  },
  {
    path: 'intent/system/runtime/work/document-cursor-user-rule-wg-template.work.bvc',
    evidence: [
      'docs/cursor-user-rule-wg-backlog.template.md',
      'docs/workgraph-session-primer-runbook.md — ссылка на шаблон',
    ],
  },
  {
    path: 'intent/system/runtime/work/add-workgraph-few-shot-examples.work.bvc',
    evidence: [
      '../project/src/agent/fewShotLibrary.js — workgraph_claim_execute, workgraph_no_todowrite',
      '../project/src/agent/fewShotStrategy.js — workgraph_execute task type',
      '../project/tests/agent-few-shot-selection.test.js',
    ],
  },
  {
    path: 'intent/system/runtime/work/eval-cursor-mcp-usefulness-fixture.work.bvc',
    evidence: [
      'src/workGraphToolSurfaceAudit.mjs — cursor-mcp-primer-v1 fixture',
    ],
  },
];

async function markDone(relativePath, evidenceLines) {
  const filePath = join(process.cwd(), relativePath);
  let text = await readFile(filePath, 'utf8');

  if (!text.includes('Свидетельства:')) {
    text = text.replace(
      /\nМетки:\n/u,
      `\nСвидетельства:\n${evidenceLines.map((line) => `  ${line}`).join('\n')}\n\nМетки:\n`,
    );
  } else {
    for (const line of evidenceLines) {
      if (!text.includes(line)) {
        text = text.replace(/(Свидетельства:\n(?:  .+\n)*)/u, `$1  ${line}\n`);
      }
    }
  }

  text = text.replace(/  work\.status: backlog\n/gu, '  work.status: done\n');
  text = text.replace(/  trace\.status: pending\n/gu, '  trace.status: verified\n');
  text = text.replace(/  work\.next_action: просмотреть и перевести в ready\n/gu, '  work.next_action: —\n');

  await writeFile(filePath, text, 'utf8');
  const workId = text.match(/work\.id: ([^\n]+)/u)?.[1]?.trim();
  console.log(`done ${workId ?? relativePath}`);
}

async function main() {
  for (const task of TASKS) {
    await markDone(task.path, task.evidence);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
