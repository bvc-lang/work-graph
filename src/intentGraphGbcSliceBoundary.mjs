import { access, constants, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { RELEASE_GATE_ROWS } from './releaseGateMatrix.mjs';

const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

export const INTENT_GRAPH_GBC_SLICE_SCHEMA = 'intent.graph.gbc.slice.boundary.v1';

export const INTENT_GRAPH_GBC_SOURCE_INPUTS = [
  {
    id: 'intent-index',
    path: 'intent/index.bvc',
    role: 'canonical-index',
    required: true,
    format: 'bvc',
  },
  {
    id: 'intent-work-items',
    path: 'intent/**/**/*.work.bvc',
    role: 'canonical-task-mirror',
    required: true,
    format: 'bvc',
  },
  {
    id: 'backlog-projection',
    path: 'work/backlog.bvc',
    role: 'migration-compatibility-projection',
    required: false,
    format: 'bvc',
  },
];

export const INTENT_GRAPH_GBC_DERIVED_OUTPUTS = [
  {
    id: 'intent-graph-slice-gbc',
    path: '.iohasc/cache/intent-graph-slice.gbc',
    role: 'optional-derived-binary',
    required: false,
    format: 'flatbuffers',
    status: 'deferred',
  },
  {
    id: 'intent-graph-slice-b64',
    path: '.iohasc/cache/intent-graph-slice.b64',
    role: 'optional-transport',
    required: false,
    format: 'base64-flatbuffers',
    status: 'deferred',
  },
  {
    id: 'intent-graph-json-cache',
    path: '.iohasc/cache/intent-graph.v1.json',
    role: 'optional-json-cache',
    required: false,
    format: 'json',
    status: 'roadmap',
  },
];

export const INTENT_GRAPH_GBC_CONSUMERS = [
  {
    id: 'agent-context',
    title: 'Agent context assembly',
    requiredWithoutGbc: true,
    jsonFallback: 'workgraph.snapshot.v1 + intent tree summary',
    gbcOptional: true,
  },
  {
    id: 'pvrg-graph-augment',
    title: 'PVRG / trace-link graph augment',
    requiredWithoutGbc: false,
    jsonFallback: 'unifiedLinkageProjection.v1 + trace envelope',
    gbcOptional: true,
  },
  {
    id: 'operator-dashboard',
    title: 'Operator dashboard / architecture map',
    requiredWithoutGbc: true,
    jsonFallback: 'operator-shell.snapshot.v2 + architecture.snapshot.v1',
    gbcOptional: true,
  },
  {
    id: 'cross-process-worker',
    title: 'Cross-process worker interchange',
    requiredWithoutGbc: false,
    jsonFallback: 'worker-input.v1 JSON payload',
    gbcOptional: true,
  },
];

export const INTENT_GRAPH_GBC_RETURN_TRIGGERS = [
  'JSON snapshot parse/render or agent context assembly becomes measured bottleneck',
  'Cross-process worker needs schema-stable binary interchange',
  'GFS overlay requires mapped binary slices for intent graph',
  'Dashboard or graph needs zero-copy read path at scale',
];

const MANDATORY_GATE_IDS = RELEASE_GATE_ROWS.filter((row) => row.blocksRelease).map((row) => row.id);

export function buildIntentGraphGbcSliceBoundary() {
  const sourceInputs = [...INTENT_GRAPH_GBC_SOURCE_INPUTS].sort((left, right) => compareText(left.id, right.id));
  const derivedOutputs = [...INTENT_GRAPH_GBC_DERIVED_OUTPUTS].sort((left, right) => compareText(left.id, right.id));
  const consumers = [...INTENT_GRAPH_GBC_CONSUMERS].sort((left, right) => compareText(left.id, right.id));
  const returnTriggers = [...INTENT_GRAPH_GBC_RETURN_TRIGGERS];

  const mandatoryConsumersWithoutGbc = consumers.filter((entry) => entry.requiredWithoutGbc);
  const optionalDerivedOutputs = derivedOutputs.filter((entry) => !entry.required);

  return {
    schema: INTENT_GRAPH_GBC_SLICE_SCHEMA,
    policy: {
      canonicalStore: 'intent-tree-step',
      interchangeFirst: 'json-snapshot-v1',
      gbcStatus: 'deferred-optional-derived',
      donorReference: '../project/docs/adr-iohasc-gbc-gfs-slice-consumer-matrix.md',
      relatedProtocols: [
        'gbc-gvm-zig-deferral-boundary',
        'flatbuffers-gbc-slice-evaluation',
        'intent-graph-gbc-slice-boundary-v1',
      ],
    },
    sourceInputs,
    derivedOutputs,
    consumers,
    returnTriggers,
    mvpIndependence: {
      blocksMandatoryGate: false,
      mandatoryGateIds: [...MANDATORY_GATE_IDS].sort(compareText),
      mandatoryConsumersCoveredByJson: mandatoryConsumersWithoutGbc.every((entry) => Boolean(entry.jsonFallback)),
      optionalDerivedOutputCount: optionalDerivedOutputs.length,
    },
  };
}

export function evaluateIntentGraphGbcMvpIndependence(boundary = buildIntentGraphGbcSliceBoundary()) {
  const gbcRequiredOutputs = boundary.derivedOutputs.filter((entry) => entry.required);
  const blockingConsumers = boundary.consumers.filter((entry) => !entry.requiredWithoutGbc && !entry.gbcOptional);

  return {
    schema: 'intent.graph.gbc.slice.mvp-independence.v1',
    ok: boundary.mvpIndependence.blocksMandatoryGate === false
      && gbcRequiredOutputs.length === 0
      && blockingConsumers.length === 0
      && boundary.mvpIndependence.mandatoryConsumersCoveredByJson === true,
    gbcRequiredOutputCount: gbcRequiredOutputs.length,
    blockingConsumerCount: blockingConsumers.length,
  };
}

export const INTENT_GRAPH_GBC_PILOT_SCHEMA = 'intent.graph.gbc.slice.pilot.v1';

export const DONOR_GBC_MODULE_SLICE_CANDIDATES = [
  {
    id: 'module-registry-json',
    relativePath: '.iohasc/cache/iohasc-gbc-module-registry.json',
    format: 'json',
  },
  {
    id: 'module-object-slice-gbc',
    relativePath: '.iohasc/cache/module-object-slice.gbc',
    format: 'flatbuffers',
  },
  {
    id: 'step-file-slice-b64',
    relativePath: '.iohasc/cache/step-file-slice.b64',
    format: 'base64-flatbuffers',
  },
];

export function resolveDonorProjectRoot(options = {}) {
  const env = options.env ?? process.env;
  const raw = options.donorRoot ?? env.WORKGRAPH_IOHASC_DONOR_ROOT ?? '../project';
  return resolve(options.cwd ?? process.cwd(), raw);
}

export async function probeDonorGbcModuleSlice(options = {}) {
  const donorRoot = options.donorRoot
    ? resolve(options.cwd ?? process.cwd(), options.donorRoot)
    : resolveDonorProjectRoot(options);
  const candidates = [];

  for (const candidate of DONOR_GBC_MODULE_SLICE_CANDIDATES) {
    const absolutePath = resolve(donorRoot, candidate.relativePath);
    let exists = false;
    try {
      await access(absolutePath, constants.R_OK);
      exists = true;
    } catch {
      exists = false;
    }

    candidates.push({
      ...candidate,
      absolutePath,
      exists,
    });
  }

  const foundCount = candidates.filter((entry) => entry.exists).length;

  return {
    donorRoot,
    candidates,
    foundCount,
  };
}

async function summarizeModuleRegistryJson(absolutePath) {
  try {
    const text = await readFile(absolutePath, 'utf8');
    const parsed = JSON.parse(text);
    return {
      schemaVersion: parsed.schema_version ?? parsed.schemaVersion ?? null,
      moduleCount: Array.isArray(parsed.modules) ? parsed.modules.length : 0,
    };
  } catch (error) {
    return {
      parseError: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function buildIntentGraphGbcSlicePilotReport(options = {}) {
  const boundary = buildIntentGraphGbcSliceBoundary();
  const cwd = options.cwd ?? process.cwd();
  let probe = await probeDonorGbcModuleSlice({ ...options, cwd });
  let source = 'donor';

  if (probe.foundCount === 0 && options.sampleRoot) {
    probe = await probeDonorGbcModuleSlice({
      ...options,
      cwd,
      donorRoot: options.sampleRoot,
    });
    source = probe.foundCount > 0 ? 'sample-fixture' : 'skip';
  } else if (probe.foundCount === 0) {
    source = 'skip';
  }

  const registryCandidate = probe.candidates.find(
    (entry) => entry.id === 'module-registry-json' && entry.exists,
  );
  const moduleRegistrySummary = registryCandidate
    ? await summarizeModuleRegistryJson(registryCandidate.absolutePath)
    : null;

  return {
    schema: INTENT_GRAPH_GBC_PILOT_SCHEMA,
    status: source === 'skip' ? 'skip' : (source === 'sample-fixture' ? 'sample' : 'donor'),
    source,
    boundarySchema: boundary.schema,
    mvpIndependence: evaluateIntentGraphGbcMvpIndependence(boundary),
    probe,
    moduleRegistrySummary,
    blocksMandatoryGate: false,
  };
}
