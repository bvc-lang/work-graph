const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 48) || 'gap-item';
}

function confidenceForGapKind(kind) {
  if (kind === 'missing_implementation') {
    return 'high';
  }

  if (kind === 'untracked_export') {
    return 'medium';
  }

  return 'low';
}

function titleForGapEntry(entry) {
  if (entry.kind === 'untracked_export') {
    return `покрыть step для экспорта ${entry.symbol ?? entry.filePath}`;
  }

  if (entry.kind === 'missing_implementation') {
    return `реализовать TUR/link для ${entry.stepGuid ?? entry.filePath}`;
  }

  if (entry.kind === 'orphaned_tur') {
    return `сопоставить orphaned TUR ${entry.turId ?? entry.symbol ?? ''}`.trim();
  }

  return `устранить code-gap: ${entry.kind}`;
}

export function mapGapEntryToWorkItemDraft(entry, options = {}) {
  const prefix = options.idPrefix ?? 'gap';
  const baseId = entry.symbol ? `${prefix}-${slugify(entry.symbol)}` : `${prefix}-${slugify(entry.filePath)}`;

  return {
    schema: 'workitem.draft.v1',
    suggestedWorkId: baseId,
    title: titleForGapEntry(entry),
    status: 'backlog',
    targetFiles: [entry.filePath].filter(Boolean),
    confidence: confidenceForGapKind(entry.kind),
    gapKind: entry.kind,
    reason: entry.reason,
    provenance: {
      source: 'code-gap-analyzer',
      repo: options.sourceRepo ?? '../project',
      gapKind: entry.kind,
      symbol: entry.symbol ?? '',
      turId: entry.turId ?? '',
      stepGuid: entry.stepGuid ?? '',
    },
    reviewRequired: true,
  };
}

export function buildCodeGapBacklogFeed(report, options = {}) {
  if (report === undefined || report === null) {
    throw new TypeError('report is required');
  }

  const entries = Array.isArray(report.entries) ? report.entries : [];
  const suggestions = entries
    .map((entry) => mapGapEntryToWorkItemDraft(entry, options))
    .sort((left, right) => compareText(left.suggestedWorkId, right.suggestedWorkId));

  return {
    schema: 'code-gap.backlog-feed.v1',
    sourceReport: report.summary ?? {},
    suggestionCount: suggestions.length,
    suggestions,
    promotionProtocol: 'protocols/workgraph-draft-intake.bvc',
    reviewRequired: true,
  };
}
