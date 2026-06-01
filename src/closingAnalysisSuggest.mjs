import { DONE_STATUSES, readWorkItemKind } from './workItemHierarchy.mjs';

export const CLOSING_ANALYSIS_SUGGEST_SCHEMA = 'workgraph.closing-analysis-suggest.v1';

function slugFromEpicId(epicId) {
  return String(epicId ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '');
}

/**
 * @param {{ id?: string, status?: string, title?: string, itemKind?: string, labels?: Record<string, string> } | null | undefined} previousItem
 * @param {{ id?: string, status?: string, title?: string, itemKind?: string, labels?: Record<string, string> } | null | undefined} nextItem
 */
export function buildClosingAnalysisSuggestion(previousItem, nextItem) {
  if (!nextItem?.id) {
    return null;
  }

  const wasDone = previousItem ? DONE_STATUSES.has(String(previousItem.status ?? '')) : false;
  const isDone = DONE_STATUSES.has(String(nextItem.status ?? ''));
  const isEpic = readWorkItemKind(nextItem) === 'epic';

  if (wasDone || !isDone || !isEpic) {
    return null;
  }

  const epicId = String(nextItem.id).trim();
  const slug = slugFromEpicId(epicId);
  const bodyPath = `work/analytics/closing-${slug}.md`;

  return {
    schema: CLOSING_ANALYSIS_SUGGEST_SCHEMA,
    epicId,
    epicTitle: String(nextItem.title ?? epicId).trim(),
    suggestedBodyPath: bodyPath,
    suggestedJournalFields: {
      feeds_epics: [epicId],
      topic: 'product/process',
      tags: ['closing-analysis', epicId],
    },
    message:
      `Эпик «${nextItem.title ?? epicId}» закрыт. Создайте closing-анализ в ${bodyPath} и добавьте запись в work/analytics-records.jsonl с analytics.feeds_epics: [${epicId}].`,
    templateOutline: [
      '# Closing: <epic title>',
      '',
      '## Что сработало',
      '',
      '## Что не сработало',
      '',
      '## Уроки для следующих эпиков',
      '',
      '## feeds_epics',
      `- ${epicId}`,
    ],
  };
}
