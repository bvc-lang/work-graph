import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  StepAtomDraftValidationError,
  formatStepAtomDraft,
  parseStepAtomDrafts,
  validateStepAtomDraft,
} from '../src/stepAtomFormatter.mjs';

describe('formatStepAtomDraft', () => {
  it('formats a work_item atom with stable sections and labels', () => {
    const output = formatStepAtomDraft({
      profile: 'work_item',
      name: 'Задача_define_workitem_v1',
      basis: ['Work Graph должен быть центральной операционной моделью.'],
      vector: ['Описать минимальный набор полей WorkItem v1.'],
      goal: ['Получить контракт задачи для .bvc и JSON snapshot.'],
      checks: ['описан минимальный набор полей'],
      evidence: ['node --test'],
      labels: {
        'work.status': 'ready',
        'work.id': 'define-workitem-v1',
        'trace.status': 'pending',
      },
    });

    assert.equal(
      output,
      [
        '#Задача_define_workitem_v1<[',
        'Базис:',
        '  Work Graph должен быть центральной операционной моделью.',
        'Вектор:',
        '  Описать минимальный набор полей WorkItem v1.',
        'Цель:',
        '  Получить контракт задачи для .bvc и JSON snapshot.',
        'Проверки:',
        '  описан минимальный набор полей',
        'Свидетельства:',
        '  node --test',
        '',
        'Метки:',
        '  atom.profile: work_item',
        '  trace.status: pending',
        '  work.id: define-workitem-v1',
        '  work.status: ready',
        ']>',
        '',
      ].join('\n'),
    );
  });

  it('does not overwrite an explicit atom.profile label', () => {
    const output = formatStepAtomDraft({
      profile: 'charter',
      name: 'Устав_WorkGraph_Rebuild',
      basis: ['Seed project exists.'],
      vector: ['Keep .bvc as the canon.'],
      goal: ['Define the rebuild direction.'],
      labels: {
        'atom.profile': 'custom_profile_marker',
        'project.slug': 'work-graph-rebuild',
      },
    });

    assert.match(output, /  atom\.profile: custom_profile_marker\n/);
    assert.doesNotMatch(output, /  atom\.profile: charter\n/);
  });

  it('formats a prompt_rule atom without optional sections', () => {
    const output = formatStepAtomDraft({
      profile: 'prompt_rule',
      name: 'Правило_LLM_Не_Пишет_Raw_Step',
      basis: ['LLM can drift in raw .bvc syntax.'],
      vector: ['Use Step Atom Draft JSON first.'],
      goal: ['Keep .bvc canonical and valid.'],
      labels: {
        'rule.id': 'llm-no-raw-step',
      },
    });

    assert.equal(
      output,
      [
        '#Правило_LLM_Не_Пишет_Raw_Step<[',
        'Базис:',
        '  LLM can drift in raw .bvc syntax.',
        'Вектор:',
        '  Use Step Atom Draft JSON first.',
        'Цель:',
        '  Keep .bvc canonical and valid.',
        '',
        'Метки:',
        '  atom.profile: prompt_rule',
        '  rule.id: llm-no-raw-step',
        ']>',
        '',
      ].join('\n'),
    );
  });
});

describe('validateStepAtomDraft', () => {
  it('returns actionable validation errors', () => {
    const errors = validateStepAtomDraft({
      profile: 'unknown',
      name: 'bad name',
      basis: [],
      vector: ['ok'],
      goal: ['bad\nline'],
      labels: {
        'bad key': '',
      },
    });

    assert.deepEqual(errors, [
      'profile must be one of: charter, charter_section, work_item, plan, prompt_rule, compiler, trace',
      'name may contain only letters, digits, and underscore',
      'basis must contain at least one string',
      'goal[0] must be a single-line string',
      'labels.bad key has an invalid key; use letters, digits, underscore, dot, or dash',
      'labels.bad key must be a non-empty string',
    ]);
  });

  it('throws StepAtomDraftValidationError from the formatter', () => {
    assert.throws(
      () => formatStepAtomDraft({}),
      (error) =>
        error instanceof StepAtomDraftValidationError &&
        error.errors.includes('profile is required and must be a non-empty string'),
    );
  });
});

describe('parseStepAtomDrafts', () => {
  it('parses formatted atoms into StepAtomDraft-like records', () => {
    const draft = {
      profile: 'work_item',
      name: 'Задача_define_workitem_v1',
      basis: ['Work Graph должен быть центральной операционной моделью.'],
      vector: ['Описать минимальный набор полей WorkItem v1.'],
      goal: ['Получить контракт задачи для .bvc и JSON snapshot.'],
      checks: ['описан минимальный набор полей'],
      evidence: ['node --test'],
      labels: {
        'work.status': 'ready',
        'work.id': 'define-workitem-v1',
        'trace.status': 'pending',
      },
    };

    const [parsed] = parseStepAtomDrafts(formatStepAtomDraft(draft));

    assert.deepEqual(parsed.draft, {
        ...draft,
        lang: 'ru',
        labels: {
          'atom.profile': 'work_item',
          'trace.status': 'pending',
          'work.id': 'define-workitem-v1',
          'work.status': 'ready',
        },
      });
    assert.equal(parsed.langSource, 'auto_detect');
    assert.equal(parsed.errors.length, 0);
    assert.equal(parsed.lints.length, 0);
  });

  it('switches from analysis to decision instead of nesting Решение inside analysis', () => {
    const [parsed] = parseStepAtomDrafts(`#T<[
Базис:
  b
Вектор:
  v
Цель:
  g
Анализ:
  Целесообразность:
  Стоит выделить блок.
Решение:
  Вердикт: полезно
  Блок принят.
Метки:
  atom.profile: architecture_l1_block
]>`);

    assert.match(parsed.draft.analysis?.join('\n') ?? '', /Стоит выделить блок/u);
    assert.doesNotMatch(parsed.draft.analysis?.join('\n') ?? '', /Решение:/u);
    assert.match(parsed.draft.decision?.join('\n') ?? '', /Вердикт: полезно/u);
  });

  it('keeps format(parse(format(draft))) stable', () => {
    const original = formatStepAtomDraft({
      profile: 'prompt_rule',
      name: 'Правило_LLM_Не_Пишет_Raw_Step',
      basis: ['LLM can drift in raw .bvc syntax.'],
      vector: ['Use Step Atom Draft JSON first.'],
      goal: ['Keep .bvc canonical and valid.'],
      labels: {
        'rule.id': 'llm-no-raw-step',
      },
    });

    const [parsed] = parseStepAtomDrafts(original);

    assert.equal(formatStepAtomDraft(parsed.draft), original);
  });

  it('imports legacy top-level machine fields as labels with warnings', () => {
    const [parsed] = parseStepAtomDrafts(
      [
        '#Задача_legacy<[',
        'guid: legacy-guid',
        'статус: ready',
        'trace_status: pending',
        'Базис:',
        '  Existing atom.',
        'Вектор:',
        '  Import legacy fields.',
        'Цель:',
        '  Preserve machine meaning.',
        '',
        'Метки:',
        '  atom.profile: work_item',
        '  work.id: legacy',
        ']>',
        '',
      ].join('\n'),
    );

    assert.deepEqual(parsed.draft.labels, {
      'atom.profile': 'work_item',
      guid: 'legacy-guid',
      'trace.status': 'pending',
      'work.id': 'legacy',
      'work.status': 'ready',
    });
    assert.deepEqual(parsed.errors, []);
    assert.deepEqual(parsed.warnings, [
      'legacy top-level field guid imported as labels.guid',
      'legacy top-level field статус imported as labels.work.status',
      'legacy top-level field trace_status imported as labels.trace.status',
    ]);
  });
});

describe('formatStepAtomDraft multilingual', () => {
  it('formats EN dialect when lang is en', () => {
    const output = formatStepAtomDraft({
      profile: 'charter',
      name: 'Agent_Charter',
      lang: 'en',
      basis: ['LLM agents need durable canon.'],
      vector: ['Publish BVC spec v1.'],
      goal: ['BVC becomes default context format.'],
      labels: { 'atom.profile': 'charter' },
    });

    assert.match(output, /^#Agent_Charter@en<\[\nBasis:/);
    assert.match(output, /\nLabels:\n/);
  });

  it('round-trips EN dialect', () => {
    const draft = {
      profile: 'prompt_rule',
      name: 'Rule_EN',
      lang: 'en',
      basis: ['One dialect per atom.'],
      vector: ['Use lang in draft.'],
      goal: ['No mixed keys.'],
      labels: { 'rule.id': 'en-rule' },
    };
    const original = formatStepAtomDraft(draft);
    const [parsed] = parseStepAtomDrafts(original);
    assert.equal(parsed.draft.lang, 'en');
    assert.equal(formatStepAtomDraft(parsed.draft), original);
  });
});
