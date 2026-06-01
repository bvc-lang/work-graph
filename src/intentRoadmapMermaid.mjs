const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

export const INTENT_ROADMAP_MERMAID_SCHEMA = 'workgraph.intent-roadmap.mermaid.v1';

function sanitizeMermaidId(raw) {
  return String(raw).replace(/[^a-zA-Z0-9_]/gu, '_').replace(/_+/gu, '_').replace(/^_|_$/gu, '') || 'node';
}

function mermaidNodeId(kind, rawId) {
  return `${kind}_${sanitizeMermaidId(rawId)}`;
}

function escapeMermaidLabel(text, maxLen = 72) {
  const cleaned = String(text ?? '')
    .replace(/"/gu, "'")
    .replace(/[\[\]{}#;|]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
  if (cleaned.length <= maxLen) {
    return cleaned;
  }
  return `${cleaned.slice(0, maxLen - 1)}…`;
}

function analyticsTitleFromRef(analyticsRef) {
  const ref = String(analyticsRef ?? '').trim();
  if (ref === '') {
    return 'Анализ';
  }
  const slug = ref.replace(/^analytics:/u, '');
  return `Анализ ${slug}`;
}

export function findAllOptionsForQuestion(question, intentNodes) {
  if (!question) {
    return [];
  }
  return intentNodes
    .filter((node) => node.nodeKind === 'option' && node.parentId === question.id)
    .sort((left, right) => compareText(left.id, right.id));
}

function workNodeLabel(node) {
  const done = node.status === 'done' || node.status === 'verified';
  const progress = node.childCount > 0 ? ` (${node.doneChildCount}/${node.childCount})` : '';
  const suffix = done ? ' · done' : '';
  return escapeMermaidLabel(`${node.title ?? node.workId}${progress}${suffix}`);
}

function appendWorkTreeLines(lines, node, epicId, classNames) {
  const taskId = mermaidNodeId('task', node.workId);
  lines.push(`  ${epicId} --> ${taskId}["${workNodeLabel(node)}"]`);
  classNames.push(`${taskId}${doneClass(node.status)}`);

  for (const child of node.children ?? []) {
    appendWorkTreeLines(lines, child, taskId, classNames);
  }
}

function doneClass(status) {
  return status === 'done' || status === 'verified' ? ':::done' : '';
}

/**
 * @param {{
 *   decisionId: string,
 *   decisionTitle?: string,
 *   analyticsRef?: string,
 *   question?: { id: string, title?: string } | null,
 *   selectedOption?: { id: string, title?: string } | null,
 *   decision?: { id: string, title?: string } | null,
 *   allOptions?: Array<{ id: string, title?: string, selected?: boolean }>,
 *   roots?: Array<object>,
 * }} branch
 */
export function buildIntentRoadmapMermaidSource(branch) {
  const lines = ['flowchart TB'];
  const classLines = [];
  const classNames = [];

  const question = branch.question;
  const decision = branch.decision ?? { id: branch.decisionId, title: branch.decisionTitle };
  const selectedOptionId = branch.selectedOption?.id ?? '';
  const allOptions = branch.allOptions ?? (branch.selectedOption ? [branch.selectedOption] : []);

  let anchorId = null;

  if (question) {
    const questionId = mermaidNodeId('q', question.id);
    lines.push(`  ${questionId}["${escapeMermaidLabel(question.title ?? question.id)}"]`);
    classNames.push(`${questionId}:::question`);
    anchorId = questionId;
  }

  if (branch.analyticsRef) {
    const analysisId = mermaidNodeId('an', branch.analyticsRef);
    lines.push(`  ${analysisId}["${escapeMermaidLabel(analyticsTitleFromRef(branch.analyticsRef))}"]`);
    classNames.push(`${analysisId}:::analysis`);
    if (anchorId) {
      lines.push(`  ${anchorId} --> ${analysisId}`);
    }
    anchorId = analysisId;
  }

  const optionIds = new Map();
  for (const option of allOptions) {
    const optionId = mermaidNodeId('opt', option.id);
    optionIds.set(option.id, optionId);
    const selected = option.id === selectedOptionId || option.selected === true;
    lines.push(`  ${optionId}["${escapeMermaidLabel(option.title ?? option.id)}"]`);
    classNames.push(`${optionId}${selected ? ':::selected' : ':::rejected'}`);
    if (anchorId) {
      lines.push(`  ${anchorId} --> ${optionId}`);
    }
  }

  const decisionId = mermaidNodeId('dec', decision.id ?? branch.decisionId);
  lines.push(`  ${decisionId}["${escapeMermaidLabel(decision.title ?? branch.decisionTitle ?? branch.decisionId)}"]`);
  classNames.push(`${decisionId}:::decision`);

  if (selectedOptionId && optionIds.has(selectedOptionId)) {
    lines.push(`  ${optionIds.get(selectedOptionId)} --> ${decisionId}`);
  } else if (anchorId) {
    lines.push(`  ${anchorId} --> ${decisionId}`);
  }

  for (const root of branch.roots ?? []) {
    const epicId = mermaidNodeId('epic', root.workId);
    lines.push(`  ${decisionId} --> ${epicId}["${workNodeLabel(root)}"]`);
    classNames.push(`${epicId}${doneClass(root.status)}`);

    for (const child of root.children ?? []) {
      appendWorkTreeLines(lines, child, epicId, classNames);
    }
  }

  lines.push('');
  lines.push('  classDef question fill:#f4f5f7,stroke:#6554c0,color:#172b4d');
  lines.push('  classDef analysis fill:#f4f5f7,stroke:#5e6c84,color:#172b4d');
  lines.push('  classDef selected fill:#deebff,stroke:#0052cc,color:#172b4d');
  lines.push('  classDef rejected fill:#fafbfc,stroke:#c1c7d0,color:#5e6c84,stroke-dasharray:4 3');
  lines.push('  classDef decision fill:#e3fcef,stroke:#00875a,color:#172b4d');
  lines.push('  classDef done fill:#e3fcef,stroke:#00875a,color:#172b4d');
  lines.push(`  ${classNames.join('\n  ')}`);

  const source = lines.join('\n');
  return {
    schema: INTENT_ROADMAP_MERMAID_SCHEMA,
    source,
  };
}

export function enrichIntentRoadmapBranchWithMermaid(branch, intentNodes) {
  const allOptions = findAllOptionsForQuestion(branch.question, intentNodes);
  const enriched = {
    ...branch,
    allOptions: allOptions.map((option) => ({
      id: option.id,
      title: option.title,
      selected: option.id === branch.selectedOption?.id || option.selected === true,
    })),
  };
  enriched.mermaid = buildIntentRoadmapMermaidSource(enriched);
  return enriched;
}
