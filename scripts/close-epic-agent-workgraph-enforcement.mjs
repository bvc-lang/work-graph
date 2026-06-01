#!/usr/bin/env node
/**
 * Close epic-agent-workgraph-enforcement subtasks + epic after AN-25 enforcement deliverables.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const WORK_DIR = join(process.cwd(), 'intent/system/runtime/work');

const CLOSURES = [
  {
    id: 'add-cursor-rule-single-backlog',
    evidence: [
      '.cursor/rules/agent-workgraph-single-backlog.mdc — alwaysApply: true',
      'Запрет TodoWrite для trackable work; plan todo требуют `work.id`',
    ],
  },
  {
    id: 'add-cursor-ide-workgraph-parity-step',
    evidence: [
      'rules/agent-behavior/cursor-ide-workgraph-parity.bvc — rule.id cursor-ide-workgraph-parity',
      'src/agentBehaviorRulesBundle.mjs — в WORKER_BEHAVIOR_RULE_IDS',
      'npm run audit:agent-behavior-rules — bundle ok',
    ],
  },
  {
    id: 'fix-seed-default-status-backlog',
    evidence: [
      'scripts/seed-ux-mission-control-p0.mjs — status backlog (10 items)',
      'scripts/seed-bvc-tooling-external.mjs — status backlog (4 items)',
      'scripts/seed-bvc-phase2-new-write.mjs — status backlog (4 items)',
      'grep scripts/seed-*.mjs: нет status doing кроме комментариев',
    ],
  },
  {
    id: 'lint-plan-work-id-mirror',
    evidence: [
      'src/lintPlanWorkAlignment.mjs + scripts/lint-plan-work-alignment.mjs',
      'tests/lintPlanWorkAlignment.test.mjs — 2 кейса pass',
      'npm run lint:plan-work-alignment — в ci:mandatory',
    ],
  },
  {
    id: 'document-agent-intake-vs-execute-policy',
    evidence: [
      'docs/decision-pipeline-canon.md §Agent intake vs execute',
      'protocols/decision-pipeline-canon-v1.bvc — agent intake vs execute в Вектор',
    ],
  },
  {
    id: 'write-an26-closing-agent-workgraph-enforcement',
    evidence: [
      'work/analytics/closing-epic-agent-workgraph-enforcement.md',
      'work/analytics-records.jsonl — AN-26',
    ],
  },
  {
    id: 'epic-agent-workgraph-enforcement',
    evidence: [
      'AN-25 R1–R5 реализованы: rule, parity step, seed defaults, lint, canon intake vs execute',
      'Closing AN-26 опубликован; dual backlog enforcement declarative layer complete',
    ],
  },
];

function patchWorkBvc(content, { evidence }) {
  if (/work\.status: done/m.test(content)) {
    return { content, changed: false };
  }

  const evidenceBlock = evidence.map((line) => `  - ${line}`).join('\n');
  let next = content;

  if (!/Свидетельства:/m.test(next)) {
    next = next.replace(/\n(Метки:)/m, `\nСвидетельства:\n${evidenceBlock}\n\n$1`);
  } else {
    next = next.replace(/Свидетельства:[\s\S]*?(?=\nМетки:)/m, `Свидетельства:\n${evidenceBlock}\n\n`);
  }

  next = next
    .replace(/trace\.status: pending/g, 'trace.status: verified')
    .replace(/work\.next_action: [^\n]+/g, 'work.next_action: —')
    .replace(/work\.pipeline_stage: [^\n]+/g, 'work.pipeline_stage: closed')
    .replace(/work\.status: (backlog|doing|ready)/g, 'work.status: done');

  return { content: next, changed: true };
}

async function main() {
  let updated = 0;
  for (const closure of CLOSURES) {
    const path = join(WORK_DIR, `${closure.id}.work.bvc`);
    const original = await readFile(path, 'utf8');
    const { content, changed } = patchWorkBvc(original, closure);
    if (changed) {
      await writeFile(path, content, 'utf8');
      updated += 1;
      console.log(`closed ${closure.id}`);
    } else {
      console.log(`skip ${closure.id}`);
    }
  }
  console.log(JSON.stringify({ schema: 'workgraph.close-epic-agent-workgraph-enforcement.v1', updated }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
