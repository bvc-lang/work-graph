export const VERDICT_RU = {
  useful: 'полезно',
  harmful: 'вредно',
  defer: 'отложить',
};

export function formatVerdictRu(verdict) {
  const key = String(verdict ?? '').trim();
  return VERDICT_RU[key] ?? key;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const PIPELINE_INLINE_CODE_PATTERN = /(`[^`]+`|\bdepends_on=[^\s;,]+|\b(?:protocols|schemas|src|work|intent)\/(?:[\w.-]+\/)*[\w.-]+\.(?:bvc|step|json|mjs|md)\b|\b[\w.-]+\.(?:bvc|step|json|mjs|md)\b)/gu;

export function renderPipelineInlineText(text) {
  const tick = String.fromCharCode(96);
  const source = String(text ?? '');
  let result = '';
  let lastIndex = 0;
  let match;

  PIPELINE_INLINE_CODE_PATTERN.lastIndex = 0;
  while ((match = PIPELINE_INLINE_CODE_PATTERN.exec(source)) !== null) {
    result += escapeHtml(source.slice(lastIndex, match.index));
    const token = match[0];
    if (token.startsWith(tick)) {
      result += `<code class="inline-term">${escapeHtml(token.slice(1, -1))}</code>`;
    } else {
      result += `<code class="inline-term">${escapeHtml(token)}</code>`;
    }
    lastIndex = match.index + token.length;
  }

  result += escapeHtml(source.slice(lastIndex));
  return result;
}

function isStandaloneSectionHeading(line) {
  return /^[A-Za-zА-Яа-яЁё0-9][^:\n]{0,80}:$/u.test(line)
    || /^[A-Za-zА-Яа-яЁё0-9][^:\n]{0,40}\s\/\s[^:\n]{0,40}:$/u.test(line);
}

function splitInlineSectionLine(line) {
  const match = String(line ?? '').trim().match(/^([A-Za-zА-Яа-яЁё][^:]{0,78}):\s+(.+)$/u);
  if (!match) {
    return null;
  }

  return {
    label: match[1].trim(),
    body: match[2].trim(),
  };
}

const PIPELINE_SECTION_LABELS = [
  'Целесообразность',
  'Контекст и границы',
  'Вердикт',
  'Решение',
];

export function normalizePipelineMultilineText(text) {
  return String(text ?? '')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n');
}

function expandPipelineSectionLines(text) {
  const normalized = normalizePipelineMultilineText(text);
  /** @type {string[]} */
  const expanded = [];

  for (const rawLine of normalized.split('\n')) {
    const line = rawLine.trim();
    if (line === '') {
      continue;
    }

    const pattern = new RegExp(
      `(?:^|\\s)(${PIPELINE_SECTION_LABELS.join('|')}):\\s*`,
      'gu',
    );
    const matches = [...line.matchAll(pattern)];
    if (matches.length <= 1) {
      expanded.push(line);
      continue;
    }

    for (let index = 0; index < matches.length; index += 1) {
      const match = matches[index];
      const label = match[1];
      const bodyStart = match.index + match[0].length;
      const bodyEnd = index + 1 < matches.length ? matches[index + 1].index : line.length;
      const body = line.slice(bodyStart, bodyEnd).trim();
      expanded.push(`${label}: ${body}`);
    }
  }

  return expanded;
}

export function renderPipelineProse(text) {
  const lines = expandPipelineSectionLines(text);
  const parts = [];
  let listItems = [];
  let listKind = null;

  function flushList() {
    if (listItems.length === 0) {
      return;
    }

    const listClass = listKind === 'check'
      ? 'pipeline-prose-list pipeline-prose-list--check'
      : 'pipeline-prose-list';
    parts.push(`<ul class="${listClass}">${
      listItems.map((entry) => `<li>${renderPipelineInlineText(entry)}</li>`).join('')
    }</ul>`);
    listItems = [];
    listKind = null;
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === '') {
      flushList();
      continue;
    }

    if (isStandaloneSectionHeading(line)) {
      flushList();
      parts.push(`<h4 class="pipeline-prose-heading">${escapeHtml(line.slice(0, -1))}</h4>`);
      continue;
    }

    const inlineSection = splitInlineSectionLine(line);
    if (inlineSection) {
      flushList();
      parts.push(`<h4 class="pipeline-prose-heading">${escapeHtml(inlineSection.label)}</h4>`);
      parts.push(`<p class="pipeline-prose-p">${renderPipelineInlineText(inlineSection.body)}</p>`);
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('• ')) {
      if (listKind && listKind !== 'bullet') {
        flushList();
      }
      listKind = 'bullet';
      listItems.push(line.slice(2));
      continue;
    }

    if (line.startsWith('✓ ') || line.startsWith('✗ ') || line.startsWith('☑ ') || line.startsWith('☐ ')) {
      if (listKind && listKind !== 'check') {
        flushList();
      }
      listKind = 'check';
      listItems.push(line);
      continue;
    }

    flushList();
    parts.push(`<p class="pipeline-prose-p">${renderPipelineInlineText(line)}</p>`);
  }

  flushList();
  return `<div class="pipeline-prose">${parts.join('')}</div>`;
}

/** @deprecated use renderPipelineInlineText */
export function renderInlineCode(text) {
  return renderPipelineInlineText(text);
}
