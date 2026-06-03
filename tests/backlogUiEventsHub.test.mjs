import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createBacklogUiEventsHub } from '../src/backlogUiEventsHub.mjs';
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { computeBacklogRevision } from '../src/backlogRevision.mjs';

describe('createBacklogUiEventsHub', () => {
  it('broadcasts backlog-revision SSE events to connected clients', async () => {
    const hub = createBacklogUiEventsHub({ heartbeatMs: 60000 });
    const chunks = [];
    const response = {
      writeHead: () => {},
      write(chunk) {
        chunks.push(String(chunk));
      },
      end() {},
      on() {},
    };
    const request = { on() {} };

    hub.handleSse(request, response);
    const items = await readWorkItemsFromRepo({ cwd: process.cwd() });
    const revision = computeBacklogRevision(items);
    hub.broadcast('backlog-revision', revision);

    const body = chunks.join('');
    assert.match(body, /event: backlog-revision/);
    assert.match(body, /sha256:/);
    assert.equal(hub.getClientCount(), 1);
    hub.dispose();
  });

  it('refreshes revision without duplicate broadcast when unchanged', async () => {
    const hub = createBacklogUiEventsHub({ heartbeatMs: 60000 });
    const ctx = { cwd: process.cwd() };
    const first = await hub.refreshRevision(ctx);
    const second = await hub.refreshRevision(ctx);
    assert.equal(first?.revision, second?.revision);
    hub.dispose();
  });
});
