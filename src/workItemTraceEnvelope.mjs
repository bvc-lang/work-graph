const CODE_FILE_PATTERN = /\.(?:js|mjs|cjs|ts|tsx|jsx|step|json|yaml|yml|os)$/iu;
const TRACE_REF_LABELS = ['trace.code_refs', 'trace.artifact_refs', 'trace.evidence_refs', 'trace.links'];
const DONE_TRACE_STATUSES = new Set(['linked', 'verified']);
const VERIFY_TRACE_STATUSES = new Set(['linked', 'verified', 'pending', 'needs_review']);

const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

function parseList(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return [];
  }

  return String(value)
    .split(/\s*,\s*/u)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function isCodeFacingWorkItem(item) {
  if (item === undefined || item === null) {
    throw new TypeError('item is required');
  }

  const sourceStep = item.labels?.['trace.source_step'] ?? item.labels?.['work.source_step'] ?? '';
  if (String(sourceStep).trim() !== '') {
    return true;
  }

  if (TRACE_REF_LABELS.some((labelKey) => parseList(item.labels?.[labelKey]).length > 0)) {
    return true;
  }

  return (item.targetFiles ?? []).some((path) => CODE_FILE_PATTERN.test(String(path)));
}

export function buildWorkItemTraceEnvelope(item) {
  if (item === undefined || item === null) {
    throw new TypeError('item is required');
  }

  const traceRefs = Object.fromEntries(
    TRACE_REF_LABELS.map((labelKey) => [labelKey, parseList(item.labels?.[labelKey]).sort(compareText)]),
  );
  const sourceStep = String(item.labels?.['trace.source_step'] ?? item.labels?.['work.source_step'] ?? '').trim();

  return {
    schema: 'workitem.trace-envelope.v1',
    workId: item.id,
    codeFacing: isCodeFacingWorkItem(item),
    sourceStep,
    targetFiles: [...(item.targetFiles ?? [])].sort(compareText),
    traceRefs,
    traceStatus: String(item.traceStatus ?? item.labels?.['trace.status'] ?? 'pending').trim() || 'pending',
    evidence: [...(item.evidence ?? [])].sort(compareText),
    intentPath: String(item.labels?.['intent.path'] ?? '').trim(),
  };
}

export function evaluateTraceVerifyGate(item, options = {}) {
  const envelope = buildWorkItemTraceEnvelope(item);
  const targetStatus = options.targetStatus ?? item.status;
  const diagnostics = [];

  if (!envelope.codeFacing) {
    return { ok: true, envelope, diagnostics };
  }

  const hasTraceRefs = TRACE_REF_LABELS.some((labelKey) => envelope.traceRefs[labelKey].length > 0);
  const hasSourceStep = envelope.sourceStep !== '';

  if (!hasTraceRefs && !hasSourceStep) {
    const onlyTargetFiles = envelope.targetFiles.length > 0 && targetStatus === 'done';
    if (!onlyTargetFiles) {
      diagnostics.push({
        severity: envelope.targetFiles.length > 0 ? 'warning' : 'error',
        code: 'trace.envelope.missing_refs',
        message: `WorkItem ${envelope.workId} is code-facing but has no trace refs or source step.`,
        actionable: 'Add trace.code_refs, trace.artifact_refs or trace.source_step.',
      });
    }
  }

  if (envelope.traceStatus === 'missing' || envelope.traceStatus === 'orphaned') {
    diagnostics.push({
      severity: 'error',
      code: 'trace.envelope.invalid_status',
      message: `WorkItem ${envelope.workId} has trace.status=${envelope.traceStatus}.`,
      actionable: 'Fix trace links or downgrade task scope before verify.',
    });
  }

  if (targetStatus === 'verify' && envelope.traceStatus === 'missing') {
    diagnostics.push({
      severity: 'error',
      code: 'trace.envelope.verify_blocked',
      message: `WorkItem ${envelope.workId} cannot enter verify with trace.status=missing.`,
      actionable: 'Author trace refs and set trace.status to pending or linked.',
    });
  }

  if (targetStatus === 'done') {
    if (envelope.evidence.length === 0) {
      diagnostics.push({
        severity: 'error',
        code: 'trace.envelope.done_without_evidence',
        message: `WorkItem ${envelope.workId} cannot be done without evidence.`,
        actionable: 'Add Свидетельства section entries.',
      });
    }

    if (!DONE_TRACE_STATUSES.has(envelope.traceStatus) && hasTraceRefs) {
      diagnostics.push({
        severity: 'error',
        code: 'trace.envelope.done_without_verified_trace',
        message: `WorkItem ${envelope.workId} has trace refs but trace.status=${envelope.traceStatus}.`,
        actionable: 'Set trace.status to linked or verified after validator pass.',
      });
    }

    if (envelope.targetFiles.length > 0 && !hasTraceRefs) {
      diagnostics.push({
        severity: 'warning',
        code: 'trace.weak_target_files_only',
        message: `WorkItem ${envelope.workId} has target_files but no Trace Links v1 labels.`,
        actionable: `Add trace.code_refs or trace.artifact_refs for ${envelope.targetFiles[0]}.`,
      });
    }
  }

  if (targetStatus === 'verify' && hasTraceRefs && !VERIFY_TRACE_STATUSES.has(envelope.traceStatus)) {
    diagnostics.push({
      severity: 'error',
      code: 'trace.envelope.verify_status',
      message: `WorkItem ${envelope.workId} cannot enter verify with trace.status=${envelope.traceStatus}.`,
      actionable: 'Set trace.status to pending, linked or needs_review.',
    });
  }

  const ok = diagnostics.every((diagnostic) => diagnostic.severity !== 'error');
  return { ok, envelope, diagnostics: diagnostics.sort((left, right) => compareText(`${left.severity}\0${left.code}`, `${right.severity}\0${right.code}`)) };
}

export function buildTraceEnvelopeSnapshot(items) {
  if (!Array.isArray(items)) {
    throw new TypeError('items must be an array');
  }

  const envelopes = items
    .map((item) => buildWorkItemTraceEnvelope(item))
    .filter((envelope) => envelope.codeFacing)
    .sort((left, right) => compareText(left.workId, right.workId));

  return {
    schema: 'workitem.trace-envelope.snapshot.v1',
    count: envelopes.length,
    envelopes,
  };
}
