const BVC_FIELDS = ['basis', 'vector', 'goal'];

const SECTION_TITLES = {
  basis: 'Базис',
  vector: 'Вектор',
  goal: 'Цель',
};

export const WORK_ITEM_BVC_LIMITS = {
  basis: { minLines: 2, minChars: 120 },
  vector: { minLines: 2, minChars: 100 },
  goal: { minLines: 1, minChars: 80 },
};

const DEPARTMENT_LABELS = {
  'agent-platform': 'платформы агента',
  'product-architecture': 'архитектуры продукта',
  'knowledge-publishing': 'графа знаний и retrieval',
  'domain-vertical': 'доменной вертикали',
  'operator-ui': 'operator UI',
};

const compareText = (left, right) => String(left).localeCompare(String(right), 'ru', { sensitivity: 'variant' });

export function sectionToLines(value) {
  if (Array.isArray(value)) {
    return value.map((line) => String(line).trim()).filter(Boolean);
  }

  return String(value ?? '')
    .split(/\n+/u)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function measureBvcSection(lines) {
  const normalized = sectionToLines(lines);
  const text = normalized.join(' ');
  const sentenceCount = (text.match(/[.!?…](?:\s|$)/gu) ?? []).length || (text.length > 0 ? 1 : 0);

  return {
    lineCount: normalized.length,
    charCount: text.length,
    sentenceCount,
    lines: normalized,
  };
}

export function meetsBvcLimits(lines, limits) {
  const metrics = measureBvcSection(lines);
  return metrics.lineCount >= limits.minLines && metrics.charCount >= limits.minChars;
}

export function evaluateWorkItemBvcQuality(item) {
  const issues = [];

  for (const field of BVC_FIELDS) {
    const limits = WORK_ITEM_BVC_LIMITS[field];
    const metrics = measureBvcSection(item[field]);
    const workId = item.id ?? '';

    if (metrics.lineCount < limits.minLines) {
      issues.push({
        severity: 'warning',
        code: `short_${field}_lines`,
        message: `${SECTION_TITLES[field]} для ${workId}: нужно минимум ${limits.minLines} строк(и), сейчас ${metrics.lineCount}`,
        workId,
        field,
        lineCount: metrics.lineCount,
        minLines: limits.minLines,
      });
    }

    if (metrics.charCount < limits.minChars) {
      issues.push({
        severity: 'warning',
        code: `short_${field}_chars`,
        message: `${SECTION_TITLES[field]} для ${workId}: нужно минимум ${limits.minChars} символов, сейчас ${metrics.charCount}`,
        workId,
        field,
        charCount: metrics.charCount,
        minChars: limits.minChars,
      });
    }
  }

  return issues.sort((left, right) => compareText(left.workId, right.workId) || compareText(left.field, right.field));
}

function uniqueLines(lines) {
  const seen = new Set();
  const output = [];

  for (const line of lines) {
    const trimmed = String(line).trim();
    if (trimmed === '' || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    output.push(trimmed);
  }

  return output;
}

function departmentLabel(department) {
  return DEPARTMENT_LABELS[department] ?? 'Work Graph rebuild';
}

function formatList(items, limit = 4) {
  const list = (items ?? []).filter(Boolean);
  if (list.length === 0) {
    return '';
  }

  if (list.length <= limit) {
    return list.join(', ');
  }

  return `${list.slice(0, limit).join(', ')} и ещё ${list.length - limit}`;
}

function ensureSentence(text) {
  const trimmed = String(text).trim();
  if (trimmed === '') {
    return '';
  }

  return /[.!?…]$/u.test(trimmed) ? trimmed : `${trimmed}.`;
}

function enrichBasis(lines, item) {
  const output = [...lines];
  const title = String(item.title ?? item.id ?? 'задача').trim();

  if (output.length < 2) {
    output.push(
      ensureSentence(
        `Задача «${title}» относится к контуру ${departmentLabel(item.department)} и должна быть понятна агенту без чтения всего backlog`,
      ),
    );
  }

  if ((item.dependsOn ?? []).length > 0 && !output.some((line) => line.includes('зависим'))) {
    output.push(
      ensureSentence(
        `Предварительно должны быть закрыты зависимости: ${formatList(item.dependsOn)}`,
      ),
    );
  }

  if (item.status === 'blocked' && item.blocker && !output.some((line) => line.includes('блок'))) {
    output.push(ensureSentence(`Сейчас задача заблокирована: ${item.blocker}`));
  }

  return uniqueLines(output);
}

function enrichVector(lines, item) {
  const output = [...lines];
  const title = String(item.title ?? item.id ?? 'задача').trim();

  if (output.length < 2 && item.nextAction) {
    output.push(ensureSentence(`Ближайший шаг исполнения: ${item.nextAction}`));
  }

  if ((item.targetFiles ?? []).length > 0) {
    const targetLine = ensureSentence(`Основные артефакты изменений: ${formatList(item.targetFiles)}`);
    if (!output.some((line) => line.includes('артефакты изменений'))) {
      output.push(targetLine);
    }
  }

  for (const check of item.checks ?? []) {
    if (meetsBvcLimits(output, WORK_ITEM_BVC_LIMITS.vector)) {
      break;
    }

    if (!output.some((line) => line.includes(check.slice(0, Math.min(24, check.length))))) {
      output.push(ensureSentence(`Проверка результата: ${check}`));
    }
  }

  if (!meetsBvcLimits(output, WORK_ITEM_BVC_LIMITS.vector) && output.length < 2) {
    output.push(
      ensureSentence(
        `Работа ведётся итерациями с evidence и обновлением intent tree для «${title}»`,
      ),
    );
  }

  if (!meetsBvcLimits(output, WORK_ITEM_BVC_LIMITS.vector)) {
    output.push(
      ensureSentence(
        `Изменения должны быть трассируемы через work.id=${item.id} и секцию Свидетельства`,
      ),
    );
  }

  return uniqueLines(output);
}

function enrichGoal(lines, item) {
  const output = [...lines];
  const title = String(item.title ?? item.id ?? 'задача').trim();

  if (output.length === 0) {
    output.push(ensureSentence(`Закрыть задачу «${title}» с проверяемым результатом для оператора и MCP-агента`));
  }

  const metrics = measureBvcSection(output);
  if (metrics.charCount < WORK_ITEM_BVC_LIMITS.goal.minChars) {
    if ((item.checks ?? []).length > 0) {
      output.push(ensureSentence(`Готово, когда выполнены проверки: ${item.checks[0]}`));
    } else {
      output.push(
        ensureSentence(
          `Готово, когда изменения покрыты тестами или evidence и work.id=${item.id} можно перевести в done/verified`,
        ),
      );
    }
  }

  return uniqueLines(output);
}

export function enrichWorkItemBvcDraft(draft, item = {}) {
  const context = {
    ...item,
    title: item.title ?? draft.labels?.['work.title'] ?? draft.labels?.['work.id'] ?? draft.name,
    department: item.department ?? draft.labels?.['work.department'] ?? '',
    status: item.status ?? draft.labels?.['work.status'] ?? '',
    nextAction: item.nextAction ?? draft.labels?.['work.next_action'] ?? '',
    dependsOn: item.dependsOn ?? parseList(draft.labels?.['work.depends_on']),
    targetFiles: item.targetFiles ?? parseList(draft.labels?.['work.target_files']),
    checks: item.checks ?? draft.checks ?? [],
    blocker: item.blocker ?? draft.labels?.['work.blocker'] ?? draft.labels?.['work.blocked_reason'] ?? '',
    id: item.id ?? draft.labels?.['work.id'] ?? '',
  };

  return {
    ...draft,
    basis: enrichBasis(sectionToLines(draft.basis), context),
    vector: enrichVector(sectionToLines(draft.vector), context),
    goal: enrichGoal(sectionToLines(draft.goal), context),
  };
}

export function needsWorkItemBvcEnrichment(item) {
  return evaluateWorkItemBvcQuality(item).length > 0;
}

function parseList(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }

  return String(value ?? '')
    .split(/\s*,\s*/u)
    .map((entry) => entry.trim())
    .filter(Boolean);
}
