#!/usr/bin/env node
/**
 * Append AN-2 analytics record (idempotent by record id).
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  appendAnalyticsRecordJournal,
  buildAnalyticsRecord,
  readAnalyticsRecordJournal,
} from '../src/analyticsRecordStore.mjs';

const RECORD_ID = 'analytics:parent-subtask-hierarchy';
const JOURNAL_PATH = 'work/analytics-records.jsonl';
const BODY_PATH = 'work/analytics/parent-subtask-hierarchy.md';

async function main() {
  const cwd = process.cwd();
  const journal = await readAnalyticsRecordJournal({ cwd, journalPath: JOURNAL_PATH });
  if (journal.records.some((record) => record.id === RECORD_ID)) {
    console.log(JSON.stringify({
      schema: 'workgraph.append-analytics.v1',
      skipped: true,
      reason: 'record_exists',
      id: RECORD_ID,
    }, null, 2));
    return;
  }

  const result = await appendAnalyticsRecordJournal([
    buildAnalyticsRecord({
      title: 'Уровни задач: эпик и подзадачи с общей задумкой',
      query: 'можем ли мы сделать уровни задачи — верхнеуровневая задача с подзадачами, чтобы в описании была понятна общая задумка',
      slug: 'parent-subtask-hierarchy',
      topic: 'work-model/hierarchy',
      status: 'published',
      tags: ['work-item', 'backlog', 'иерархия', 'эпик'],
      relatedFiles: [
        'src/workGraphRuntime.mjs',
        'src/backlogSchemaLint.mjs',
        'src/intentTreeWorkItems.mjs',
        'src/workGraphBacklogUiServer.mjs',
        'protocols/work-item-decision-pipeline-v1.bvc',
      ],
      bodyPath: BODY_PATH,
      author: 'agent',
      createdAt: '2026-05-29T14:00:00.000Z',
    }),
  ], JOURNAL_PATH, { cwd });

  const body = await readFile(resolve(cwd, BODY_PATH), 'utf8');
  console.log(JSON.stringify({
    schema: 'workgraph.append-analytics.v1',
    appended: result.appended,
    id: RECORD_ID,
    bodyPath: BODY_PATH,
    bodyBytes: body.length,
    expectedKey: 'AN-2',
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
