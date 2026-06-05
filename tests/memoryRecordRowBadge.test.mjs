import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatMemoryRecordStatusBadgeLabel,
  resolveMemoryRecordStatusBadgeTone,
} from '../src/ui/memoryRecordRowBadge.mjs';

describe('memoryRecordRowBadge', () => {
  it('maps active records to ok badge', () => {
    const record = { status: 'active', reviewRequired: false };
    assert.equal(formatMemoryRecordStatusBadgeLabel(record), 'ACTIVE');
    assert.equal(resolveMemoryRecordStatusBadgeTone(record), 'ok');
  });

  it('maps draft records to muted badge', () => {
    const record = { status: 'draft', reviewRequired: true };
    assert.equal(formatMemoryRecordStatusBadgeLabel(record), 'DRAFT');
    assert.equal(resolveMemoryRecordStatusBadgeTone(record), 'muted');
  });

  it('maps needs-review records to warning badge', () => {
    const record = { status: 'needs-review', reviewRequired: true };
    assert.equal(formatMemoryRecordStatusBadgeLabel(record), 'NEEDS REVIEW');
    assert.equal(resolveMemoryRecordStatusBadgeTone(record), 'warning');
  });
});
