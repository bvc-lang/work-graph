#!/usr/bin/env node
/**
 * Close ux-mission-control-p0 epic + subtasks after P0 deliverables.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const WORK_DIR = join(process.cwd(), 'intent/ui/dashboard/work');

const CLOSURES = [
  { id: 'design-home-mission-control-view', evidence: ['ui/home-mission-control-v1.bvc — HERMES layout spec verified'] },
  { id: 'implement-home-snapshot-api', evidence: ['src/homeSnapshotProjection.mjs', 'src/homeSnapshotApi.mjs', 'GET /api/home-snapshot → home.snapshot.v1'] },
  { id: 'implement-home-page-mount', evidence: ['Home default landing view=home', 'sidebar 🏠 Home tab', 'data-testid=home-view'] },
  { id: 'implement-inbox-event-stream', evidence: ['src/inboxEventStream.mjs', 'GET /api/inbox-events', 'schema inbox.events.v1'] },
  { id: 'implement-sidebar-inbox-badge', evidence: ['#inbox-nav-badge on Home nav tab', 'unread from /api/inbox-events'] },
  { id: 'implement-cmd-k-palette', evidence: ['Ctrl/Cmd+K overlay #cmd-k-overlay', 'task/an/cmd/run scopes fuzzy filter'] },
  { id: 'implement-right-dock-agent-run-panel', evidence: ['#agent-run-dock persistent panel', 'journal poll 5s', 'retry/open task actions'] },
  { id: 'update-protocols-operator-agent-run-panel-v2', evidence: ['protocols/operator-agent-run-panel-v2.bvc — dock-mode contract'] },
  { id: 'add-home-mission-control-tests', evidence: ['tests/homeSnapshotProjection.test.mjs', 'tests/inboxEventStream.test.mjs pass'] },
  { id: 'write-an24-closing-ux-mission-control-p0', evidence: ['work/analytics/closing-epic-ux-mission-control-p0.md', 'AN-24 in analytics-records.jsonl'] },
  { id: 'ux-mission-control-p0', evidence: ['P0 Home + inbox + cmd+k + agent dock shipped', 'AN-24 closing published'] },
];

function patchWorkBvc(content, { evidence }) {
  if (/work\.status: done/m.test(content)) return { content, changed: false };
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
    }
  }
  console.log(JSON.stringify({ schema: 'workgraph.close-ux-mission-control-p0.v1', updated }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
