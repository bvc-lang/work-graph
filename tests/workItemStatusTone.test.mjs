import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { renderClientUiBadge } from '../src/ui/atoms/badgeClient.mjs';
import { statusLabel, statusToBadgeTone } from '../src/ui/workItemStatusTone.mjs';

describe('workItemStatusTone', () => {
  it('maps known statuses to Russian labels', () => {
    assert.equal(statusLabel('ready'), 'Доступно агенту');
    assert.equal(statusLabel('done'), 'Завершено');
  });

  it('maps statuses to badge tones', () => {
    assert.equal(statusToBadgeTone('ready'), 'accent');
    assert.equal(statusToBadgeTone('doing'), 'warning');
    assert.equal(statusToBadgeTone('blocked'), 'danger');
    assert.equal(statusToBadgeTone('done'), 'ok');
    assert.equal(statusToBadgeTone('verify'), 'muted');
    assert.equal(statusToBadgeTone('backlog', 'planned'), 'accent');
  });
});

describe('badgeClient', () => {
  it('renders wg-badge markup', () => {
    const html = renderClientUiBadge({ label: 'ready', tone: 'accent', testId: 'badge-ready' });
    assert.match(html, /wg-badge--accent/);
    assert.match(html, /data-testid="badge-ready"/);
  });
});
