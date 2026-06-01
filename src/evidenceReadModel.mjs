const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

function inferEvidenceType(summary) {
  const text = String(summary);
  if (/npm test|vitest|jest|go test/iu.test(text)) {
    return 'test';
  }

  if (/npm run|node |command/iu.test(text)) {
    return 'command';
  }

  if (/decision|решени/iu.test(text)) {
    return 'decision';
  }

  if (/blocked|blocker/iu.test(text)) {
    return 'blocker';
  }

  if (/worker|dry-run/iu.test(text)) {
    return 'worker-run';
  }

  return 'change';
}

export function buildEvidenceRecordFromLegacyLine(taskId, summary, index) {
  const type = inferEvidenceType(summary);
  return {
    schema: 'evidence-record.v1',
    id: `${taskId}:legacy-evidence:${index + 1}`,
    time: null,
    source: 'workgraph.snapshot.v1',
    taskId,
    type,
    summary: String(summary).trim(),
    status: /fail|error|blocked/iu.test(summary) ? 'failed' : 'succeeded',
    details: { importedFrom: 'legacy-evidence-string' },
    artifacts: [],
  };
}

export function buildEvidenceReadModelFromItems(items) {
  if (!Array.isArray(items)) {
    throw new TypeError('items must be an array');
  }

  const records = items.flatMap((item) =>
    (item.evidence ?? []).map((summary, index) => buildEvidenceRecordFromLegacyLine(item.id, summary, index)),
  ).sort((left, right) => compareText(left.id, right.id));

  return {
    schema: 'evidence.read-model.v1',
    count: records.length,
    records,
    compatibility: {
      legacyStringEvidence: true,
      structuredEvidenceV1: true,
    },
  };
}

export function buildEvidenceReadModelForTask(items, taskId) {
  const item = items.find((entry) => entry.id === taskId);
  if (item === undefined) {
    return { schema: 'evidence.read-model.v1', count: 0, records: [], compatibility: { legacyStringEvidence: true, structuredEvidenceV1: true } };
  }

  return buildEvidenceReadModelFromItems([item]);
}

export function buildEvidenceTimelineForTask(items, taskId, options = {}) {
  if (!Array.isArray(items)) {
    throw new TypeError('items must be an array');
  }

  const normalizedTaskId = String(taskId ?? '').trim();
  if (normalizedTaskId === '') {
    throw new TypeError('taskId must be a non-empty string');
  }

  const item = items.find((entry) => entry.id === normalizedTaskId);
  if (item === undefined) {
    return {
      schema: 'evidence.timeline.v1',
      taskId: normalizedTaskId,
      count: 0,
      events: [],
    };
  }

  const events = [];

  for (const [index, summary] of (item.evidence ?? []).entries()) {
    const record = buildEvidenceRecordFromLegacyLine(item.id, summary, index);
    events.push({
      id: record.id,
      kind: 'evidence',
      sequence: index + 1,
      time: null,
      title: record.type,
      summary: record.summary,
      status: record.status,
    });
  }

  for (const [index, run] of (options.workerRuns ?? []).entries()) {
    if (run.taskId !== normalizedTaskId) {
      continue;
    }

    events.push({
      id: `worker-run:${run.runId ?? `${normalizedTaskId}:${index + 1}`}`,
      kind: 'transition',
      sequence: 10_000 + index,
      time: run.recordedAt ?? null,
      title: 'worker transition',
      summary: run.appliedTransition
        ? `transition → ${run.appliedTransition}`
        : String(run.summary ?? run.status ?? 'worker run'),
      status: run.status ?? null,
    });
  }

  if (item.blocker) {
    events.push({
      id: `${normalizedTaskId}:blocker`,
      kind: 'transition',
      sequence: 20_000,
      time: null,
      title: 'blocked',
      summary: String(item.blocker),
      status: 'blocked',
    });
  }

  const sorted = [...events].sort((left, right) => {
    const leftTime = left.time ? Date.parse(left.time) : null;
    const rightTime = right.time ? Date.parse(right.time) : null;

    if (leftTime === null && rightTime === null) {
      return left.sequence - right.sequence;
    }

    if (leftTime === null) {
      return -1;
    }

    if (rightTime === null) {
      return 1;
    }

    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return left.sequence - right.sequence;
  });

  return {
    schema: 'evidence.timeline.v1',
    taskId: normalizedTaskId,
    count: sorted.length,
    events: sorted,
  };
}
