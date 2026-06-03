#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const TASKS = [
  {
    path: 'intent/system/runtime/work/write-an58-closing-agent-session-warmup-v1.work.bvc',
    evidence: [
      'work/analytics/closing-epic-agent-session-warmup-v1.md',
      'work/analytics-records.jsonl — AN-58',
    ],
  },
  {
    path: 'intent/system/runtime/work/epic-agent-session-warmup-v1.work.bvc',
    evidence: [
      '5/5 subtasks done; docs/plan-agent-session-warmup-v1.md',
      'work/analytics/closing-epic-agent-session-warmup-v1.md',
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

for (const task of TASKS) {
  await markDone(task.path, task.evidence);
}
