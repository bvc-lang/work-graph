/**
 * Lint human prose in WorkItem sections — робототекст и англоязычный жаргон.
 */

const PROSE_FIELDS = ['basis', 'vector', 'goal', 'checks', 'analysis', 'decision'];

/** @type {Array<{ code: string, pattern: RegExp, hint: string }>} */
export const WORK_ITEM_JARGON_PATTERNS = [
  { code: 'jargon_closing_analysis', pattern: /\bclosing analysis\b/ui, hint: '«итоговый разбор после эпика»' },
  { code: 'jargon_canon_colon', pattern: /\bCanon:/ui, hint: '«канон:» или опиши по-русски' },
  { code: 'jargon_evidence_word', pattern: /\bevidence\b/ui, hint: '«свидетельства» / «подтверждение»' },
  { code: 'jargon_upstream', pattern: /\bupstream\b/ui, hint: '«вышестоящие зависимости»' },
  { code: 'jargon_feeds_epics', pattern: /\bfeeds_epics\b/ui, hint: '«питает эпики» или «связан с эпиком»' },
  { code: 'jargon_track_letter', pattern: /\bTrack [A-D]\b/ui, hint: 'нумерованные шаги по-русски' },
  { code: 'jargon_rationale', pattern: /\brationale\b/ui, hint: '«обоснование»' },
  { code: 'jargon_published', pattern: /\bpublished\b/ui, hint: '«опубликован»' },
  { code: 'jargon_scope_drift', pattern: /\bscope drift\b/ui, hint: '«размывание границ»' },
  { code: 'jargon_actionable', pattern: /\bactionable\b/ui, hint: '«можно брать в работу»' },
  { code: 'jargon_outcomes', pattern: /\bOutcomes\b/ui, hint: '«результаты»' },
  { code: 'template_stoit_zavesti', pattern: /Стоит завести «/u, hint: 'пиши Зачем:, не шаблон create_work_item' },
  { code: 'template_tselesoobraznost', pattern: /Целесообразность:/u, hint: 'используй Зачем: / Когда: / Риск:' },
  { code: 'template_depends_on_eq', pattern: /depends_on=/u, hint: '«зависит от: …» по-русски' },
  { code: 'template_upstream_deps', pattern: /upstream-зависимостей/u, hint: '«зависимостей выше по цепочке»' },
  { code: 'template_intake_razbor', pattern: /разбор материалов приёма/u, hint: 'конкретная формулировка вместо шаблона' },
  { code: 'jargon_doc_published', pattern: /\bdoc published\b/ui, hint: '«документ опубликован»' },
  { code: 'jargon_epic_closed', pattern: /\bepic closed with evidence\b/ui, hint: '«эпик закрыт, свидетельства приложены»' },
  { code: 'jargon_journal_entry', pattern: /\bjournal entry\b/ui, hint: '«запись в журнале»' },
  { code: 'jargon_closing_entry', pattern: /\bclosing entry\b/ui, hint: '«итоговая запись»' },
  { code: 'title_an_closing_epic', pattern: /AN-\d+\s+closing:/ui, hint: '«Закрыть разбор AN-n после эпика …»' },
];

const TITLE_ENGLISH_LEAD = /^(?:UI|CLI|ADR|Runbook|Tests?|Implement|Write|Decide|Docs|Track)\b/u;

function proseBlob(item) {
  const parts = [];
  for (const field of PROSE_FIELDS) {
    parts.push(...sectionToLines(item[field]));
  }
  const title = String(item.title ?? item.labels?.['work.title'] ?? '').trim();
  if (title) {
    parts.push(title);
  }
  return parts.join('\n');
}

function sectionToLines(value) {
  if (Array.isArray(value)) {
    return value.map((line) => String(line).trim()).filter(Boolean);
  }
  return String(value ?? '')
    .split(/\n+/u)
    .map((line) => line.trim())
    .filter(Boolean);
}

function checkLines(field, lines, workId, issues) {
  const normalized = sectionToLines(lines);

  if (field === 'checks' && normalized.length > 0 && normalized.length < 2) {
    issues.push({
      severity: 'warning',
      code: 'short_checks_count',
      message: `Проверки для ${workId}: нужно минимум 2 пункта, сейчас ${normalized.length}`,
      workId,
      field,
    });
  }

  for (const line of normalized) {
    if (field === 'checks' && line.length > 0 && line.length < 20) {
      issues.push({
        severity: 'warning',
        code: 'short_check_line',
        message: `Проверки для ${workId}: пункт слишком короткий (${line.length} симв.): «${line.slice(0, 40)}»`,
        workId,
        field,
      });
    }
  }
}

/**
 * @param {{ id?: string, title?: string, basis?: string[], vector?: string[], goal?: string[], checks?: string[], analysis?: string[], decision?: string[], labels?: Record<string, string> }} item
 */
export function evaluateWorkItemProseLint(item) {
  const issues = [];
  const workId = item.id ?? item.labels?.['work.id'] ?? '';

  for (const field of PROSE_FIELDS) {
    checkLines(field, item[field], workId, issues);
  }

  const title = String(item.title ?? item.labels?.['work.title'] ?? '').trim();
  if (TITLE_ENGLISH_LEAD.test(title)) {
    issues.push({
      severity: 'warning',
      code: 'english_lead_title',
      message: `work.title для ${workId} начинается с английского шаблона: «${title}»`,
      workId,
      field: 'title',
    });
  }

  for (const { code, pattern, hint } of WORK_ITEM_JARGON_PATTERNS) {
    if (code.startsWith('title_') && title !== '' && pattern.test(title)) {
      issues.push({
        severity: 'warning',
        code: `work_item_prose_jargon_${code}`,
        message: `work.title для ${workId}: ${hint}`,
        workId,
        field: 'title',
      });
    }
  }

  const blob = proseBlob(item);
  for (const { code, pattern, hint } of WORK_ITEM_JARGON_PATTERNS) {
    if (code.startsWith('title_')) {
      continue;
    }
    if (pattern.test(blob)) {
      issues.push({
        severity: 'warning',
        code: `work_item_prose_jargon_${code}`,
        message: `Робототекст/жаргон в ${workId}: ${hint} (pattern ${code})`,
        workId,
        field: 'prose',
      });
    }
  }

  return issues;
}
