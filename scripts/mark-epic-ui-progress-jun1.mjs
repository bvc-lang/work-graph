#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const TASKS = [
  {
    path: 'intent/ui/dashboard/work/wire-bvc-dialect-atom-inspector-b11.work.bvc',
    evidence: 'renderAtomInspectorForm uses BVC_DIALECT_SECTION_TITLES + lang badge + warnings',
  },
  {
    path: 'intent/ui/dashboard/work/add-ui-i18n-pseudolocalization-ci.work.bvc',
    evidence: 'locales/ps/ui.json + tests/uiCatalog.test.mjs parity + renderBacklogHtml({ locale: ps })',
  },
  {
    path: 'intent/ui/dashboard/work/unify-home-inbox-agent-live-poll.work.bvc',
    evidence: 'src/ui/liveSyncCoordinator.mjs registers home/agent-dock/agent-scope/backlog-revision scopes',
  },
  {
    path: 'intent/ui/dashboard/work/rollout-ui-multilingual-en-ru.work.bvc',
    evidence: 'tests/uiCatalog.test.mjs en/ru key parity; renderBacklogHtml({ locale: en }) smoke',
  },
];

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

for (const task of TASKS) {
  await markDone(task.path, task.evidence);
}
