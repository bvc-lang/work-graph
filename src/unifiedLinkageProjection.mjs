import { parseTraceLinksV1, scanReverseTraceMarkers } from './workGraphRuntime.mjs';
import { buildWorkItemTraceEnvelope } from './workItemTraceEnvelope.mjs';

const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });
const DEFAULT_MAX_LINKS = 48;
const DEFAULT_MAX_REFS = 64;

function inferLinkageRefKind(ref, sourceLabel = '') {
  const value = String(ref ?? '').trim();
  if (value === '') {
    return 'file';
  }

  if (sourceLabel === 'trace.source_step' || sourceLabel === 'work.source_step' || /\.bvc$/u.test(value)) {
    return 'step';
  }

  if (value.startsWith('work:')) {
    return 'work';
  }

  return 'file';
}

function pushLinkageRef(refs, seen, entry) {
  const ref = String(entry.ref ?? '').trim();
  if (ref === '') {
    return;
  }

  const key = `${entry.kind}\0${ref}\0${entry.source ?? ''}`;
  if (seen.has(key)) {
    return;
  }

  seen.add(key);
  refs.push({
    kind: entry.kind,
    ref,
    label: entry.label ?? ref,
    source: entry.source ?? '',
    relation: entry.relation ?? '',
  });
}

export function buildWorkItemLinkageDrilldown(workId, items, options = {}) {
  if (!Array.isArray(items)) {
    throw new TypeError('items must be an array');
  }

  const normalizedWorkId = String(workId ?? '').trim();
  if (normalizedWorkId === '') {
    throw new TypeError('workId is required');
  }

  const itemById = new Map(items.map((item) => [item.id, item]));
  const task = itemById.get(normalizedWorkId);
  if (task === undefined) {
    throw new Error(`unknown task id: ${normalizedWorkId}`);
  }

  const maxLinks = Number.isInteger(options.maxLinks) && options.maxLinks > 0
    ? options.maxLinks
    : DEFAULT_MAX_LINKS;
  const maxRefs = Number.isInteger(options.maxRefs) && options.maxRefs > 0
    ? options.maxRefs
    : DEFAULT_MAX_REFS;

  const linkage = options.linkage ?? buildUnifiedLinkageProjectionV1(items, options);
  const envelope = buildWorkItemTraceEnvelope(task);
  const links = linkage.links.filter((link) =>
    link.sourceWorkId === normalizedWorkId
    || (link.from.kind === 'work' && link.from.id === normalizedWorkId)
    || (link.to.kind === 'work' && link.to.id === normalizedWorkId),
  );

  const refs = [];
  const seen = new Set();

  for (const path of envelope.targetFiles) {
    pushLinkageRef(refs, seen, {
      kind: 'file',
      ref: path,
      label: path,
      source: 'work.target_files',
      relation: 'targets',
    });
  }

  if (envelope.sourceStep !== '') {
    pushLinkageRef(refs, seen, {
      kind: 'step',
      ref: envelope.sourceStep,
      label: envelope.sourceStep,
      source: 'trace.source_step',
      relation: 'references',
    });
  }

  for (const [labelKey, values] of Object.entries(envelope.traceRefs)) {
    for (const value of values) {
      pushLinkageRef(refs, seen, {
        kind: inferLinkageRefKind(value, labelKey),
        ref: value,
        label: value,
        source: labelKey,
        relation: 'references',
      });
    }
  }

  for (const link of links) {
    if (link.to.kind === 'work' && link.to.id !== normalizedWorkId && itemById.has(link.to.id)) {
      const related = itemById.get(link.to.id);
      pushLinkageRef(refs, seen, {
        kind: 'work',
        ref: link.to.id,
        label: related?.title ? `${related.title} (${link.to.id})` : link.to.id,
        source: link.sourceLabel ?? link.relation,
        relation: link.relation,
      });
    }

    if (link.to.kind === 'file') {
      const fileRef = link.to.locator?.path ?? link.to.id;
      pushLinkageRef(refs, seen, {
        kind: 'file',
        ref: fileRef,
        label: fileRef,
        source: link.sourceLabel ?? link.relation,
        relation: link.relation,
      });
    }

    if (link.from.kind === 'work' && link.from.id !== normalizedWorkId && itemById.has(link.from.id)) {
      const related = itemById.get(link.from.id);
      pushLinkageRef(refs, seen, {
        kind: 'work',
        ref: link.from.id,
        label: related?.title ? `${related.title} (${link.from.id})` : link.from.id,
        source: link.sourceLabel ?? link.relation,
        relation: link.relation,
      });
    }
  }

  for (const marker of linkage.markers ?? []) {
    if (marker.endpoint?.kind === 'work' && marker.endpoint.id === normalizedWorkId) {
      pushLinkageRef(refs, seen, {
        kind: 'file',
        ref: `${marker.sourcePath}:${marker.line}`,
        label: `${marker.sourcePath}:${marker.line}`,
        source: 'reverse_marker',
        relation: 'references',
      });
    }
  }

  const sortedRefs = refs
    .sort((left, right) => compareText(`${left.kind}\0${left.ref}`, `${right.kind}\0${right.ref}`))
    .slice(0, maxRefs);
  const sortedLinks = links
    .sort((left, right) => compareText(left.id, right.id))
    .slice(0, maxLinks);

  return {
    schema: 'workgraph.work-item-linkage-drilldown.v1',
    workId: normalizedWorkId,
    envelope,
    linkCount: sortedLinks.length,
    refCount: sortedRefs.length,
    truncated: links.length > sortedLinks.length || refs.length > sortedRefs.length,
    links: sortedLinks,
    refs: sortedRefs,
  };
}

export function buildUnifiedLinkageProjectionV1(items, options = {}) {
  if (!Array.isArray(items)) {
    throw new TypeError('items must be an array');
  }

  const traceLinks = (options.traceLinks ?? parseTraceLinksV1(items)).map((link) => ({
    id: link.id,
    from: link.from,
    to: link.to,
    relation: link.relation,
    evidence: [...(link.evidence ?? [])].sort(compareText),
    status: link.status,
    source: link.source,
    confidence: link.confidence,
    sourceWorkId: link.sourceWorkId,
    sourceLabel: link.sourceLabel,
    sourceRef: link.sourceRef,
  }));

  const reverseMarkers = (options.reverseMarkers ?? scanReverseTraceMarkers(options.fileContentsByPath ?? {})).map((marker) => ({
    ref: marker.ref,
    endpoint: marker.endpoint,
    sourcePath: marker.sourcePath,
    line: marker.line,
  }));

  const planningEdges = items.flatMap((item) => {
    const targetEdges = (item.targetFiles ?? []).map((path) => ({
      id: `plan:${item.id}:targets:${path}`,
      from: { kind: 'work', id: item.id },
      to: { kind: 'file', id: path, locator: { path } },
      relation: 'targets',
      evidence: [],
      status: 'pending',
      source: 'derived_projection',
      confidence: 'low',
      sourceWorkId: item.id,
      sourceLabel: 'work.target_files',
      sourceRef: path,
    }));

    const dependencyEdges = (item.dependsOn ?? []).map((dependencyId) => ({
      id: `plan:${item.id}:depends_on:${dependencyId}`,
      from: { kind: 'work', id: item.id },
      to: { kind: 'work', id: dependencyId },
      relation: 'depends_on',
      evidence: [],
      status: 'linked',
      source: 'derived_projection',
      confidence: 'high',
      sourceWorkId: item.id,
      sourceLabel: 'work.depends_on',
      sourceRef: dependencyId,
    }));

    const parentId = String(item.parentId ?? item.labels?.['work.parent_id'] ?? '').trim();
    const parentEdges = parentId === '' ? [] : [{
      id: `plan:${item.id}:parent_of:${parentId}`,
      from: { kind: 'work', id: parentId },
      to: { kind: 'work', id: item.id },
      relation: 'parent_of',
      evidence: [],
      status: 'linked',
      source: 'derived_projection',
      confidence: 'high',
      sourceWorkId: item.id,
      sourceLabel: 'work.parent_id',
      sourceRef: parentId,
    }];

    return [...targetEdges, ...dependencyEdges, ...parentEdges];
  });

  const links = [...traceLinks, ...planningEdges].sort((left, right) => compareText(left.id, right.id));
  const markers = [...reverseMarkers].sort((left, right) => compareText(`${left.sourcePath}\0${left.line}\0${left.ref}`, `${right.sourcePath}\0${right.line}\0${right.ref}`));

  return {
    schema: 'unified-linkage.projection.v1',
    generatedFrom: options.generatedFrom ?? 'workgraph.snapshot.v1',
    generatedAt: options.generatedAt ?? null,
    linkCount: links.length,
    markerCount: markers.length,
    links,
    markers,
    consumers: ['architectureSnapshot', 'verificationLoop', 'pvrgTaskScope', 'backlogUiDerivedGraph'],
  };
}
