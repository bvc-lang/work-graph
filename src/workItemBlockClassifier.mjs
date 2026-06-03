export function classifyWorkItemBlock(item) {
  const searchable = [
    item.id,
    item.title,
    item.department,
    item.ownerRole,
    item.nextAction,
    ...(item.targetFiles ?? []),
  ]
    .join(' ')
    .toLowerCase();

  if (
    item.department === 'domain-marketplace'
    || item.department === 'domain-onebase'
    || searchable.includes('intent/domains/marketplace')
    || searchable.includes('intent/domains/onebase')
    || searchable.includes('onebase')
    || searchable.includes('../onebase')
    || searchable.includes('marketplace')
  ) {
    return 'domains';
  }

  if (
    searchable.includes('memory')
    || searchable.includes('claude-note')
    || item.department === 'knowledge-publishing'
  ) {
    return 'project-memory';
  }

  if (
    searchable.includes('trace')
    || searchable.includes('evidence')
    || searchable.includes('verification')
  ) {
    return 'trace-evidence';
  }

  if (
    searchable.includes('worker')
    || searchable.includes('agent-worker')
    || searchable.includes('agent-runtime')
    || searchable.includes('design-agent-')
    || searchable.includes('implement-agent-')
    || searchable.includes('runner')
    || searchable.includes('promptpilot')
  ) {
    return 'agent-runtime';
  }

  if (
    searchable.includes('step-atom')
    || searchable.includes('formatter')
    || searchable.includes('charter')
    || searchable.includes('parser-roundtrip')
  ) {
    return 'step-canon';
  }

  if (
    item.department === 'frontend-ui'
    || /\b(ui|dashboard|board|graph-viewer|atom-inspector|architecture|schematic)\b/u.test(searchable)
    || searchable.includes('pvrg')
    || searchable.includes('derived-graph')
  ) {
    return 'derived-projections';
  }

  return 'work-graph';
}
