import { PIPELINE_VERDICTS } from './workItemDecisionPipeline.mjs';
import { formatVerdictRu, VERDICT_RU } from './pipelineProseRender.mjs';

export { formatVerdictRu, VERDICT_RU };

export function normalizeCreateWorkItemLines(value) {
  if (value === undefined || value === null) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((line) => String(line).trim()).filter(Boolean);
  }

  return String(value)
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
}


function describeIntakeSource(args) {
  const kind = String(args.intakeSourceKind ?? args.intake?.sourceKind ?? '').trim();
  const ref = String(
    args.intakeSourceRef
    ?? args.intake?.sourceRef
    ?? args.analyticsRef
    ?? '',
  ).trim();
  const key = String(args.analyticsKey ?? args.intake?.analyticsKey ?? '').trim();

  if (kind === 'analytics-record') {
    if (key && ref) {
      return `${key} (${ref})`;
    }
    return ref || key || 'запись аналитики';
  }

  if (kind !== '' && ref !== '') {
    return `${kind}: ${ref}`;
  }

  if (kind !== '') {
    return kind;
  }

  return ref;
}


export function buildDefaultWorkItemAnalysis(args = {}, verdict = 'useful') {
  const basis = normalizeCreateWorkItemLines(args.basis);
  const vector = normalizeCreateWorkItemLines(args.vector);
  const goal = normalizeCreateWorkItemLines(args.goal);
  const dependsOn = normalizeCreateWorkItemLines(args.dependsOn ?? args.depends_on);
  const intake = describeIntakeSource(args);
  const title = String(args.title ?? args.workId ?? 'задача').trim();

  const why = basis[0]
    || (intake ? `Закрывает пробел, выявленный в ${intake.split(' ')[0] ?? 'разборе'}.` : `Задача «${title}» нужна для текущего контура Work Graph.`);

  const context = basis[1] || vector[0] || '';
  const when = dependsOn.length > 0
    ? `После готовности: ${dependsOn.join(', ')}.`
    : 'Можно начинать, когда оператор перевёл задачу в ready.';
  const doneWhen = goal[0] || `Достигнута цель задачи «${title}».`;

  return [
    'Зачем:',
    why,
    ...(context !== '' ? [`Контекст: ${context}`] : []),
    'Когда:',
    when,
    'Готово, когда:',
    doneWhen,
  ];
}

export function buildDefaultWorkItemDecision(args = {}, verdict = 'useful') {
  const dependsOn = normalizeCreateWorkItemLines(args.dependsOn ?? args.depends_on);
  const verdictRu = formatVerdictRu(verdict);

  return [
    'Вердикт:',
    verdictRu,
    dependsOn.length > 0
      ? `Брать в работу после закрытия зависимостей: ${dependsOn.join(', ')}.`
      : 'Можно брать в работу после перевода в ready.',
  ];
}

export function isLegacyEnglishAnalysisDecisionTemplate(text) {
  return /actionable после intake-разбор|upstream deps|Scope drift|Verdict:\s*useful|intake \w/u.test(String(text ?? ''));
}

export function buildWorkItemCreateAnalysisDecision(args = {}) {
  if (args.skipAnalysisDecision === true) {
    return {
      analysis: normalizeCreateWorkItemLines(args.analysis),
      decision: normalizeCreateWorkItemLines(args.decision ?? args.decisionNotes),
      pipelineLabels: {},
    };
  }

  const requestedVerdict = String(args.decisionVerdict ?? args.verdict ?? 'useful').trim();
  const verdict = PIPELINE_VERDICTS.includes(requestedVerdict) ? requestedVerdict : 'useful';

  const analysis = normalizeCreateWorkItemLines(args.analysis);
  const decision = normalizeCreateWorkItemLines(args.decision ?? args.decisionNotes);

  const resolvedAnalysis = analysis.length > 0
    ? analysis
    : buildDefaultWorkItemAnalysis(args, verdict);
  const resolvedDecision = decision.length > 0
    ? decision
    : buildDefaultWorkItemDecision(args, verdict);

  const now = new Date().toISOString();
  const pipelineLabels = {
    'work.pipeline_stage': 'decided',
    'work.analysis.at': now,
    'work.analysis.source': String(
      args.analysisSource ?? args.intakeSourceKind ?? 'create_work_item',
    ).trim(),
    'work.decision.verdict': verdict,
    'work.decision.at': now,
  };

  const intakeRef = String(args.intakeSourceRef ?? args.analyticsRef ?? '').trim();
  if (intakeRef !== '') {
    pipelineLabels['intake.source_ref'] = intakeRef;
  }

  const analyticsKey = String(args.analyticsKey ?? '').trim();
  if (analyticsKey !== '') {
    pipelineLabels['intake.analytics_key'] = analyticsKey;
  }

  const intentQuestionId = String(args.intentQuestionId ?? args.intent_question_id ?? '').trim();
  const intentOptionId = String(args.intentOptionId ?? args.intent_option_id ?? '').trim();
  const intentDecisionId = String(args.intentDecisionId ?? args.intent_decision_id ?? '').trim();
  if (intentQuestionId !== '') {
    pipelineLabels['intent.question_id'] = intentQuestionId;
  }
  if (intentOptionId !== '') {
    pipelineLabels['intent.option_id'] = intentOptionId;
  }
  if (intentDecisionId !== '') {
    pipelineLabels['intent.decision_id'] = intentDecisionId;
  }

  return {
    analysis: resolvedAnalysis,
    decision: resolvedDecision,
    pipelineLabels,
  };
}
