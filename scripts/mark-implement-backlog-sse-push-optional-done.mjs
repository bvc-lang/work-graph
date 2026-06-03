#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const TASK = {
  path: 'intent/ui/dashboard/work/implement-backlog-sse-push-optional.work.bvc',
  evidence: 'GET /api/ui-events/stream + backlogFileWatch.mjs + connectLiveSyncRevisionSse; tests/backlogUiEventsHub.test.mjs',
};

async function markDone(relativePath, evidence) {
  const filePath = join(process.cwd(), relativePath);
  let text = await readFile(filePath, 'utf8');

  if (!text.includes('Свидетельства:')) {
    text = text.replace(
      /\nМетки:\n/u,
      `\nСвидетельства:\n  - ${evidence}\n\nМетки:\n`,
    );
  } else if (!text.includes(evidence)) {
    text = text.replace(/(Свидетельства:\n(?:  - .+\n)*)/u, `$1  - ${evidence}\n`);
  }

  text = text.replace(/  work\.status: backlog\n/gu, '  work.status: done\n');
  text = text.replace(/  trace\.status: pending\n/gu, '  trace.status: verified\n');
  text = text.replace(/  work\.next_action: просмотреть и перевести в ready\n/gu, '  work.next_action: —\n');

  await writeFile(filePath, text, 'utf8');
  const workId = text.match(/work\.id: ([^\n]+)/u)?.[1]?.trim();
  console.log(`done ${workId ?? relativePath}`);
}

await markDone(TASK.path, TASK.evidence);
