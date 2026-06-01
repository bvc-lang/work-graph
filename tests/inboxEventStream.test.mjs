import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  applyInboxReadState,
  buildInboxEventsFromSources,
  countUnreadInboxEvents,
} from '../src/inboxEventStream.mjs';

describe('inboxEventStream', () => {
  it('builds sorted events from worker, daemon and analytics sources', () => {
    const events = buildInboxEventsFromSources({
      workerRuns: [{ runId: 'r1', taskId: 'task-a', recordedAt: '2026-05-31T10:00:00.000Z', ok: true }],
      daemonAudit: [{ tickId: 't1', event: 'recovery', recordedAt: '2026-05-31T11:00:00.000Z', summary: 'recovered' }],
      analyticsRecords: [{ key: 'AN-24', title: 'Closing UX', updatedAt: '2026-05-31T12:00:00.000Z' }],
    });

    assert.equal(events.length, 3);
    assert.equal(events[0].id, 'analytics:AN-24');
    assert.equal(events[1].kind, 'daemon');
    assert.equal(events[2].kind, 'agent-run');
  });

  it('marks events read via read state', () => {
    const events = buildInboxEventsFromSources({
      workerRuns: [{ runId: 'r1', recordedAt: '2026-05-31T10:00:00.000Z' }],
    });
    const withRead = applyInboxReadState(events, { readIds: ['agent-run:r1'] });
    assert.equal(withRead[0].unread, false);
    assert.equal(countUnreadInboxEvents(withRead), 0);
  });
});
