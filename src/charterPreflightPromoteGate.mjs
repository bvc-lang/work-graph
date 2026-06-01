import { readBvcTextFile } from './bvcFileFormat.mjs';

export const CHARTER_PREFLIGHT_EVAL_SCHEMA = 'workgraph.charter-preflight.promote-eval.v1';
export const DEFAULT_CHARTER_PATH = 'charter/main.bvc';
export const CHARTER_MIN_MEANINGFUL_CHARS = 80;

/**
 * Forbidden target_files patterns derived from charter/main.bvc anti-goals.
 * migration.strategy: defer bypasses defer-track rules only.
 */
export const CHARTER_FORBIDDEN_TARGET_RULES = Object.freeze([
  {
    id: 'anti_ide_shell',
    pattern: /\b(src\/main\.js|src\/panels\.js|monaco-editor|ide-shell)\b/iu,
    reason: 'Charter anti-goal: не строить собственную IDE shell до доказательства workflow.',
  },
  {
    id: 'anti_monolith_orchestrator',
    pattern: /\b(src\/agent\/orchestrator\.js|agent\/orchestrator)\b/iu,
    reason: 'Charter anti-goal: не переносить монолитный orchestrator.',
  },
  {
    id: 'anti_gvm_genesis_mandatory',
    pattern: /\b(gvmLite|gvmDevPanel|genesis-ide|gvmMandate|gvmBytecode)\b/iu,
    reason: 'Charter anti-goal: GVM/Genesis не обязательны для MVP; пометьте migration.strategy: defer.',
    requiresDeferStrategy: true,
  },
  {
    id: 'anti_markdown_canon',
    pattern: /\bdocs\/plan-[^/]+\.md\b/iu,
    reason: 'Charter anti-goal: Markdown не канон исполнения; используйте .bvc backlog/intent.',
    unlessLabel: 'migration.strategy',
    unlessValue: 'defer',
  },
]);

export function classifyCharterBody(content) {
  if (content == null) {
    return 'missing';
  }

  const text = String(content).trim();
  if (text.length === 0) {
    return 'missing';
  }

  if (text.length < CHARTER_MIN_MEANINGFUL_CHARS) {
    return 'empty';
  }

  if (!/#[\p{L}0-9_]/u.test(text)) {
    return 'empty';
  }

  if (/\bTODO\b|\bFIXME\b|шаблон|template|example\.com|lorem\s+ipsum|заполните|замените|your[_-]?project|tbd\b/iu.test(text)) {
    return 'placeholder';
  }

  return 'ok';
}

function normalizeTargetFiles(item) {
  const fromField = Array.isArray(item?.targetFiles) ? item.targetFiles : [];
  const fromLabel = String(item?.labels?.['work.target_files'] ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return [...new Set([...fromField, ...fromLabel].map((value) => String(value).trim()).filter(Boolean))];
}

function ruleApplies(rule, item, targetPath) {
  if (!rule.pattern.test(targetPath)) {
    return false;
  }

  const migrationStrategy = String(item?.labels?.['migration.strategy'] ?? '').trim();

  if (rule.requiresDeferStrategy && migrationStrategy === 'defer') {
    return false;
  }

  if (rule.unlessLabel && String(item?.labels?.[rule.unlessLabel] ?? '').trim() === rule.unlessValue) {
    return false;
  }

  return true;
}

/**
 * @param {{ id?: string, targetFiles?: string[], labels?: Record<string, string> }} item
 * @param {{ charterText?: string, charterPath?: string, charterStatus?: string, skipTargetScan?: boolean }} [options]
 */
export function evaluateCharterPreflightForPromote(item, options = {}) {
  const charterPath = options.charterPath ?? DEFAULT_CHARTER_PATH;
  const charterStatus = options.charterStatus
    ?? (options.charterText === undefined ? 'unknown' : classifyCharterBody(options.charterText));
  const violations = [];
  const checks = [];

  checks.push({
    id: 'charter_present',
    passed: charterStatus === 'ok',
    message: charterStatus === 'ok'
      ? `Charter ${charterPath} is present and meaningful.`
      : `Charter ${charterPath} is ${charterStatus}; promote-ready requires a valid project ustav.`,
  });

  if (charterStatus !== 'ok') {
    violations.push({
      code: 'charter.invalid',
      message: checks[checks.length - 1].message,
      charterPath,
      charterStatus,
    });
  }

  const targetFiles = normalizeTargetFiles(item);
  if (!options.skipTargetScan && targetFiles.length > 0) {
    for (const targetPath of targetFiles) {
      for (const rule of CHARTER_FORBIDDEN_TARGET_RULES) {
        if (!ruleApplies(rule, item, targetPath)) {
          continue;
        }

        violations.push({
          code: `charter.${rule.id}`,
          message: `${targetPath}: ${rule.reason}`,
          targetPath,
          ruleId: rule.id,
        });
      }
    }
  }
  const targetViolations = violations.filter((violation) => violation.code !== 'charter.invalid');
  if (targetFiles.length > 0 && !options.skipTargetScan) {
    checks.push({
      id: 'target_files_charter_scope',
      passed: targetViolations.length === 0,
      message: targetViolations.length === 0
        ? 'target_files are within charter scope.'
        : 'One or more target_files violate charter anti-goals.',
    });
  } else {
    checks.push({
      id: 'target_files_charter_scope',
      passed: true,
      message: targetFiles.length === 0
        ? 'No target_files to scan against charter scope.'
        : 'Charter target scan skipped.',
    });
  }

  const ok = violations.length === 0;

  return {
    schema: CHARTER_PREFLIGHT_EVAL_SCHEMA,
    ok,
    charterPath,
    charterStatus,
    workId: item?.id ?? null,
    targetFiles,
    violations,
    checks,
  };
}

export async function readCharterText(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const charterPath = options.charterPath ?? DEFAULT_CHARTER_PATH;

  try {
    return {
      charterPath,
      charterText: await readBvcTextFile(charterPath, { cwd }),
    };
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return { charterPath, charterText: null };
    }

    throw error;
  }
}

export async function evaluateCharterPreflightForPromoteFromRepo(item, options = {}) {
  const { charterPath, charterText } = await readCharterText(options);
  return evaluateCharterPreflightForPromote(item, {
    ...options,
    charterPath,
    charterText,
    charterStatus: classifyCharterBody(charterText),
  });
}
