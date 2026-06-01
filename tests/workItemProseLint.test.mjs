import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  evaluateWorkItemProseLint,
  WORK_ITEM_JARGON_PATTERNS,
} from '../src/workItemProseLint.mjs';

describe('evaluateWorkItemProseLint', () => {
  it('flags robotic closing task prose', () => {
    const issues = evaluateWorkItemProseLint({
      id: 'write-closing',
      title: 'AN-40 closing: epic-foo',
      basis: ['Canon: closing analysis после done эпика.'],
      goal: ['AN-40 закрыт с evidence multiproject host.'],
      checks: ['closing doc published'],
    });

    const codes = new Set(issues.map((issue) => issue.code));
    assert.ok(codes.has('work_item_prose_jargon_jargon_canon_colon'));
    assert.ok(codes.has('work_item_prose_jargon_jargon_evidence_word'));
    assert.ok(codes.has('work_item_prose_jargon_title_an_closing_epic'));
    assert.ok(codes.has('short_checks_count'));
  });

  it('passes human Russian task prose', () => {
    const issues = evaluateWorkItemProseLint({
      id: 'write-closing-ok',
      title: 'Закрыть разбор AN-40 после эпика multiproject host',
      basis: [
        'Эпик завершён — без итоговой записи разбор AN-40 останется открытым.',
        'Оператору нужно видеть, что рекомендация реализована.',
      ],
      goal: ['Разбор AN-40 закрыт: в журнале есть итог и ссылки на артефакты.'],
      checks: [
        'Итоговый md открывается в панели аналитики',
        'Строка добавлена в analytics-records.jsonl',
      ],
    });

    assert.equal(issues.length, 0);
  });

  it('exports jargon patterns for documentation', () => {
    assert.ok(WORK_ITEM_JARGON_PATTERNS.length >= 10);
  });
});
