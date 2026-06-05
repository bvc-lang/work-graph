#!/usr/bin/env node
/**
 * Generate packages/work-graph-cli/templates/starter for empty project init.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import { loadArchitectureL1Canon } from '../src/architectureL1Canon.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const outRoot = join(repoRoot, 'packages/work-graph-cli/templates/starter');

const BLOCKS = [
  ['step-canon', 'Канон Step/BVC', 'Формат намерений и правила записи атомов.'],
  ['work-graph', 'Work Graph', 'Очередь work items, MCP и backlog UI.'],
  ['agent-runtime', 'Среда агента', 'Адаптер воркера и цикл исполнения агента.'],
  ['trace-evidence', 'Trace и evidence', 'Следы исполнения и журнал доказательств.'],
  ['derived-projections', 'Проекции UI', 'Read-only проекции для оператора.'],
  ['project-memory', 'Память проекта', 'Долговременные факты после закрытых задач.'],
  ['domains', 'Домены', 'Продуктовые домены и интеграции.'],
];

function containerCopy(blockId, blockTitle) {
  const analysis = [
    `Целесообразность: Demo-контейнер блока «${blockTitle}» в starter-kit Work Graph`,
    'показывает связь L1 с путями проекта после work-graph init без копирования',
    'production-канона upstream. Контекст и границы: один demo-контейнер;',
    'пути — заглушки; замените architecture/main.bvc при проектировании системы.',
  ].join(' ');
  const decision = `Вердикт: полезно. Demo L1-блок ${blockId} принят в starter-kit для пустой установки проекта.`;
  return { analysis, decision };
}

function renderBlock([blockId, title, summary]) {
  const containerId = `${blockId}-demo`;
  const { analysis, decision } = containerCopy(blockId, title);
  const atomName = blockId.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('_');
  return `#Architecture_Block_${atomName}<[
Базис:
  Demo L1-блок starter-kit для проекта после work-graph init.
Вектор:
  Замените этот блок своим описанием архитектуры.
Цель:
  ${summary}
Анализ:
  ${analysis}
Решение:
  ${decision}

Метки:
  atom.profile: architecture_l1_block
  architecture.block_id: ${blockId}
  architecture.layer: L1
  architecture.title: ${title}
  architecture.summary: ${summary}
  architecture.decision.verdict: useful
  architecture.intent_roots: intent/demo
  architecture.container.${containerId}.title: Demo ${title}
  architecture.container.${containerId}.kind: runtime
  architecture.container.${containerId}.paths: README.md
  architecture.container.${containerId}.analysis: ${analysis}
  architecture.container.${containerId}.decision: ${decision}
  architecture.container.${containerId}.decision.verdict: useful
]>`;
}

const architectureMainBvc = `#!bvc lang=ru

#Architecture_Main_Canon<[
Базис:
  Demo architecture hub для пустого проекта после work-graph init.
Вектор:
  Замените starter-kit на свой L1 hub по мере роста проекта.
Цель:
  Показать вкладку «Архитектура» без ошибок до первого реального canon.

Метки:
  atom.profile: architecture_canon
  architecture.canon.id: architecture-l1-blocks-v1
  architecture.canon.version: 1
  architecture.starter: true
  trace.status: draft
]>

${BLOCKS.map(renderBlock).join('\n\n')}

#Architecture_L1_Edges<[
Базис:
  Demo L1-связи starter-kit.
Вектор:
  step-canon -> work-graph : feeds
  work-graph -> agent-runtime : uses
  agent-runtime -> trace-evidence : feeds
  trace-evidence -> project-memory : feeds
  work-graph -> derived-projections : feeds
  trace-evidence -> derived-projections : feeds
  domains -> work-graph : maps_to
  agent-runtime -> domains : uses
Цель:
  Typed L1 graph для demo-проекта.

Метки:
  atom.profile: architecture_canon_section
  architecture.section: l1_edges
  protocol.id: architecture-graph-model-v1
]>
`;

const intentIndexBvc = `#Index<[
WorkItems:
  - starter-sample-task: intent/demo/starter-sample-task.work.bvc
]>
`;

const starterTaskBvc = `#Задача_starter_sample_task<[
Базис:
  Demo-задача starter-kit после work-graph init.
Вектор:
  Замените или удалите после добавления своих work items.
Цель:
  Показать backlog, workflow и MCP на примере без пустого UI.

Метки:
  atom.profile: work_item
  work.id: starter-sample-task
  work.title: Demo: первая задача проекта
  work.status: ready
  work.item_kind: task
  work.department: demo
  work.owner_role: operator
  intake.analytics_key: AN-DEMO-1
  trace.status: draft
]>
`;

const analyticsMarkdown = `# AN-DEMO-1: Demo intake для starter-kit

**Запрос:** что показывает Work Graph сразу после init?

**Ответ:** demo-задача \`starter-sample-task\`, demo L1 в \`architecture/main.bvc\` и этот intake-разбор.
Замените starter-kit своими AN-записями, architecture hub и work items.
`;

const analyticsJournalLine = JSON.stringify({
  schema: 'analytics-record.journal.v1',
  appendedAt: '2026-06-05T12:00:00.000Z',
  record: {
    schema: 'analytics-record.v1',
    id: 'analytics:starter-demo-intake',
    key: 'AN-DEMO-1',
    title: 'Demo intake: что показывает Work Graph после init',
    query: 'что показывает Work Graph сразу после work-graph init',
    topic: 'demo/starter-kit',
    status: 'published',
    tags: ['starter-kit', 'demo', 'init'],
    relatedFiles: ['intent/demo/starter-sample-task.work.bvc', 'architecture/main.bvc'],
    body: '',
    bodyPath: 'work/analytics/starter-demo-intake.md',
    createdAt: '2026-06-05T12:00:00.000Z',
    updatedAt: '2026-06-05T12:00:00.000Z',
    author: 'work-graph-init',
  },
});

function write(relativePath, content) {
  const absolutePath = join(outRoot, relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
}

function main() {
  write('architecture/main.bvc', architectureMainBvc);
  write('intent/index.bvc', intentIndexBvc);
  write('intent/demo/starter-sample-task.work.bvc', starterTaskBvc);
  write('work/analytics/starter-demo-intake.md', analyticsMarkdown);
  write('work/analytics-records.jsonl', analyticsJournalLine);

  const tempRoot = mkdtempSync(join(tmpdir(), 'wg-starter-kit-'));
  try {
    mkdirSync(join(tempRoot, 'architecture'), { recursive: true });
    writeFileSync(join(tempRoot, 'architecture/main.bvc'), architectureMainBvc, 'utf8');
    loadArchitectureL1Canon(tempRoot);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }

  console.log(JSON.stringify({
    schema: 'workgraph.generate-starter-kit.v1',
    outRoot,
    files: [
      'architecture/main.bvc',
      'intent/index.bvc',
      'intent/demo/starter-sample-task.work.bvc',
      'work/analytics/starter-demo-intake.md',
      'work/analytics-records.jsonl',
    ],
  }, null, 2));
}

main();
