import { access, constants, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

export const GFS_OVERLAY_PASSPORT_SCHEMA = 'gfs.overlay.project.passport.v1';

export const GFS_OVERLAY_READ_ORDER = ['disk-canonical', 'gfs-overlay-suffix', 'json-snapshot-projection'];

export const GFS_OVERLAY_OPTIONAL_PATHS = [
  {
    id: 'passport-slice-b64',
    logicalPath: '.iohasc/cache/passport-slice.b64',
    format: 'base64-flatbuffers',
    encoding: 'transport',
    status: 'deferred',
  },
  {
    id: 'passport-slice-gbc',
    logicalPath: '.iohasc/cache/passport-slice.gbc',
    format: 'flatbuffers',
    encoding: 'binary',
    status: 'deferred',
  },
  {
    id: 'module-registry-json',
    logicalPath: '.iohasc/cache/iohasc-gbc-module-registry.json',
    format: 'json',
    encoding: 'utf-8',
    status: 'optional-overlay',
  },
  {
    id: 'trace-link-slice-b64',
    logicalPath: '.iohasc/cache/trace-link-slice.b64',
    format: 'base64-flatbuffers',
    encoding: 'transport',
    status: 'deferred',
  },
  {
    id: 'cm-trace-link-slices-json',
    logicalPath: '.iohasc/cache/cm-trace-link-slices.v1.json',
    format: 'json',
    encoding: 'utf-8',
    status: 'optional-overlay',
  },
  {
    id: 'pvrg-node-descriptions-json',
    logicalPath: '.iohasc/cache/pvrg-node-descriptions.v1.json',
    format: 'json',
    encoding: 'utf-8',
    status: 'optional-overlay',
  },
];

export const GFS_MANDATORY_FALLBACK_PROJECTIONS = [
  {
    id: 'workgraph-snapshot',
    schema: 'workgraph.snapshot.v1',
    source: 'parseWorkItems(work/backlog.bvc)',
    required: true,
  },
  {
    id: 'intent-tree-parity',
    schema: 'intent.hierarchy.snapshot.v1',
    source: 'intent tree migration equivalence',
    required: true,
  },
  {
    id: 'operator-shell',
    schema: 'operator-shell.snapshot.v2',
    source: 'buildOperatorShellProjection',
    required: true,
  },
  {
    id: 'architecture-snapshot',
    schema: 'architecture.snapshot.v1',
    source: 'buildArchitectureSnapshot (on demand)',
    required: false,
  },
];

export function buildGfsOverlayReadContract() {
  const optionalPaths = [...GFS_OVERLAY_OPTIONAL_PATHS].sort((left, right) => compareText(left.id, right.id));

  return {
    schema: 'gfs.overlay.read-contract.v1',
    readOrder: [...GFS_OVERLAY_READ_ORDER],
    diskFirst: true,
    overlayNeverCanonicalWithoutWorkItem: true,
    utf8JsonOverlayPaths: optionalPaths.filter((entry) => entry.encoding === 'utf-8'),
    deferredBinaryPaths: optionalPaths.filter((entry) => entry.status === 'deferred'),
    optionalOverlayPaths: optionalPaths.filter((entry) => entry.status === 'optional-overlay'),
    donorReference: '../project/src/iohascGbc/gfsFileContentOverlay.ts',
  };
}

export function buildGfsOverlayProjectPassport() {
  const mandatoryFallback = [...GFS_MANDATORY_FALLBACK_PROJECTIONS].sort((left, right) => compareText(left.id, right.id));
  const readContract = buildGfsOverlayReadContract();

  return {
    schema: GFS_OVERLAY_PASSPORT_SCHEMA,
    status: 'optional-deferred',
    readContract,
    mandatoryFallback: {
      required: true,
      projections: mandatoryFallback,
      requiredProjectionIds: mandatoryFallback.filter((entry) => entry.required).map((entry) => entry.id),
    },
    agentContextPolicy: {
      withoutGfs: 'JSON snapshots + .bvc canon only',
      withGfs: 'merge overlay bytes after disk-first check; never wipe disk canon',
    },
    relatedProtocols: ['gbc-gvm-zig-deferral-boundary', 'gfs-overlay-project-passport-v1'],
  };
}

export function evaluateGfsOverlayFallbackPolicy(passport = buildGfsOverlayProjectPassport()) {
  const requiredProjections = passport.mandatoryFallback.projections.filter((entry) => entry.required);

  return {
    schema: 'gfs.overlay.fallback-policy.v1',
    ok: passport.mandatoryFallback.required === true
      && requiredProjections.length >= 2
      && passport.readContract.diskFirst === true
      && passport.readContract.overlayNeverCanonicalWithoutWorkItem === true,
    requiredProjectionCount: requiredProjections.length,
  };
}

export const GFS_PROJECT_PASSPORT_DISK_PATH = '.iohasc/project-passport.v1.json';
export const GFS_OVERLAY_PILOT_READ_SCHEMA = 'gfs.overlay.pilot-read.v1';

export const GFS_OVERLAY_PILOT_PREREQUISITES = [
  'Disk canonical: .iohasc/project-passport.v1.json under repo root (or fixture cwd)',
  'Optional GFS mount: set gfsOverlayRoot to overlay directory mirroring logical paths',
  'Without GFS: mandatory JSON fallback projections from buildGfsOverlayProjectPassport()',
  'Binary b64/gbc overlay paths remain deferred; pilot reads UTF-8 JSON only',
];

async function readJsonFileIfPresent(absolutePath, source) {
  try {
    await access(absolutePath, constants.R_OK);
    const text = await readFile(absolutePath, 'utf8');
    return {
      ok: true,
      source,
      absolutePath,
      payload: JSON.parse(text),
    };
  } catch (error) {
    return {
      ok: false,
      source,
      absolutePath,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function readDiskCanonicalProjectPassport(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const logicalPath = options.logicalPath ?? GFS_PROJECT_PASSPORT_DISK_PATH;
  const absolutePath = resolve(cwd, logicalPath);
  const readResult = await readJsonFileIfPresent(absolutePath, 'disk-canonical');

  return {
    ...readResult,
    logicalPath,
  };
}

export async function readGfsOverlayPassportPilot(options = {}) {
  const passport = buildGfsOverlayProjectPassport();
  const cwd = options.cwd ?? process.cwd();
  const diskRead = await readDiskCanonicalProjectPassport({ ...options, cwd });

  if (diskRead.ok) {
    return {
      schema: GFS_OVERLAY_PILOT_READ_SCHEMA,
      ok: true,
      readPath: 'disk-canonical',
      gfsMounted: false,
      passportSchema: diskRead.payload?.schemaVersion ?? diskRead.payload?.schema ?? null,
      absolutePath: diskRead.absolutePath,
      prerequisites: [...GFS_OVERLAY_PILOT_PREREQUISITES],
    };
  }

  if (options.gfsOverlayRoot) {
    const overlayPath = resolve(cwd, options.gfsOverlayRoot, GFS_PROJECT_PASSPORT_DISK_PATH);
    const overlayRead = await readJsonFileIfPresent(overlayPath, 'gfs-overlay-suffix');
    if (overlayRead.ok) {
      return {
        schema: GFS_OVERLAY_PILOT_READ_SCHEMA,
        ok: true,
        readPath: 'gfs-overlay-suffix',
        gfsMounted: true,
        passportSchema: overlayRead.payload?.schemaVersion ?? overlayRead.payload?.schema ?? null,
        absolutePath: overlayRead.absolutePath,
        prerequisites: [...GFS_OVERLAY_PILOT_PREREQUISITES],
      };
    }
  }

  const fallbackRead = options.fallbackRoot
    ? await readDiskCanonicalProjectPassport({ cwd: resolve(cwd, options.fallbackRoot) })
    : diskRead;

  if (fallbackRead.ok) {
    return {
      schema: GFS_OVERLAY_PILOT_READ_SCHEMA,
      ok: true,
      readPath: 'json-snapshot-projection',
      gfsMounted: false,
      fallback: true,
      passportSchema: fallbackRead.payload?.schemaVersion ?? fallbackRead.payload?.schema ?? null,
      absolutePath: fallbackRead.absolutePath,
      mandatoryFallbackProjectionIds: passport.mandatoryFallback.requiredProjectionIds,
      prerequisites: [...GFS_OVERLAY_PILOT_PREREQUISITES],
    };
  }

  return {
    schema: GFS_OVERLAY_PILOT_READ_SCHEMA,
    ok: true,
    readPath: 'json-snapshot-projection',
    gfsMounted: false,
    fallback: true,
    passportSchema: null,
    mandatoryFallbackProjectionIds: passport.mandatoryFallback.requiredProjectionIds,
    prerequisites: [...GFS_OVERLAY_PILOT_PREREQUISITES],
    note: 'No disk passport; contract-only fallback projections apply',
  };
}
