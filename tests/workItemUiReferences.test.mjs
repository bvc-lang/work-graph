import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { parseWorkItems } from '../src/workGraphRuntime.mjs';
import {
  attachUiReference,
  isUiFacingWorkItem,
  listUiReferences,
  manifestPathForWorkItem,
  validateUiReferenceUpload,
} from '../src/workItemUiReferences.mjs';

const UI_TASK_ATOM = `#Задача_ui_refs_sample<[
Базис:
  Operator dashboard needs a new panel layout.
Вектор:
  Match Cursor dark theme.
Цель:
  Ship UI panel with reference screenshots.

Метки:
  atom.profile: work_item
  work.id: ui-refs-sample-task
  work.title: Dashboard panel UI
  work.status: backlog
  work.department: ui-dashboard
  trace.status: pending
]>
`;

const NON_UI_TASK_ATOM = `#Задача_backend<[
Базис:
  API endpoint only.
Вектор:
  No UI.
Цель:
  JSON handler.

Метки:
  atom.profile: work_item
  work.id: backend-only-task
  work.title: Backend handler
  work.status: backlog
  work.department: domain-api
  trace.status: pending
]>
`;

const MINIMAL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

async function seedIntentTree(cwd, workId, atomText) {
  const relPath = `intent/system/runtime/work/${workId}.work.bvc`;
  await mkdir(join(cwd, 'intent/system/runtime/work'), { recursive: true });
  await writeFile(join(cwd, relPath), atomText, 'utf8');
  await writeFile(join(cwd, 'intent/index.bvc'), `#Индекс<[
WorkItems:
  - ${workId}: ${relPath}
Метки:
  atom.profile: trace
  trace.status: pending
]>`, 'utf8');
}

describe('workItemUiReferences', () => {
  it('detects ui-facing work items', () => {
    const [uiItem] = parseWorkItems(UI_TASK_ATOM);
    const [backendItem] = parseWorkItems(NON_UI_TASK_ATOM);
    assert.equal(isUiFacingWorkItem(uiItem), true);
    assert.equal(isUiFacingWorkItem(backendItem), false);
  });

  it('validates png uploads', () => {
    const ok = validateUiReferenceUpload({ filename: 'ref.png', buffer: MINIMAL_PNG });
    assert.equal(ok.ok, true);
    const bad = validateUiReferenceUpload({ filename: 'ref.exe', buffer: MINIMAL_PNG });
    assert.equal(bad.ok, false);
  });

  it('attaches reference, writes manifest, and syncs atom labels', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'wg-ui-refs-'));
    await seedIntentTree(cwd, 'ui-refs-sample-task', UI_TASK_ATOM);

    const attach = await attachUiReference({
      cwd,
      workId: 'ui-refs-sample-task',
      filename: 'dashboard-ref.png',
      buffer: MINIMAL_PNG,
      caption: 'Cursor panel mock',
    });

    assert.equal(attach.ok, true);
    assert.equal(attach.labelSyncOk, true);
    assert.match(attach.relativePath, /work\/ui-references\/ui-refs-sample-task\//u);

    const manifestRaw = await readFile(manifestPathForWorkItem(cwd, 'ui-refs-sample-task'), 'utf8');
    const manifest = JSON.parse(manifestRaw);
    assert.equal(manifest.items.length, 1);
    assert.equal(manifest.items[0].caption, 'Cursor panel mock');

    const listed = await listUiReferences({ cwd, workId: 'ui-refs-sample-task' });
    assert.equal(listed.ok, true);
    assert.equal(listed.uiFacing, true);
    assert.equal(listed.items.length, 1);

    const atomText = await readFile(
      join(cwd, 'intent/system/runtime/work/ui-refs-sample-task.work.bvc'),
      'utf8',
    );
    const [item] = parseWorkItems(atomText);
    assert.equal(item.labels['work.ui_refs.count'], '1');
    assert.match(item.uiRefs, /dashboard-ref/u);
  });

  it('rejects attach on non-ui task unless forced', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'wg-ui-refs-'));
    await seedIntentTree(cwd, 'backend-only-task', NON_UI_TASK_ATOM);

    const blocked = await attachUiReference({
      cwd,
      workId: 'backend-only-task',
      filename: 'ref.png',
      buffer: MINIMAL_PNG,
    });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.error, 'not_ui_facing_task');

    const forced = await attachUiReference({
      cwd,
      workId: 'backend-only-task',
      filename: 'ref.png',
      buffer: MINIMAL_PNG,
      force: true,
    });
    assert.equal(forced.ok, true);
  });
});
