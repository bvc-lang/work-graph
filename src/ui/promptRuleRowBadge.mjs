/**
 * @param {{ validationStatus?: string } | null | undefined} rule
 */
export function formatPromptRuleValidationBadgeLabel(rule) {
  const status = String(rule?.validationStatus ?? '').trim().toLowerCase();
  if (status === 'valid') {
    return 'VALID';
  }
  if (status === 'invalid') {
    return 'INVALID';
  }

  return status.toUpperCase() || 'UNKNOWN';
}

/**
 * @param {{ validationStatus?: string } | null | undefined} rule
 */
export function resolvePromptRuleValidationBadgeTone(rule) {
  const status = String(rule?.validationStatus ?? '').trim().toLowerCase();
  if (status === 'valid') {
    return 'ok';
  }
  if (status === 'invalid') {
    return 'danger';
  }

  return 'default';
}
