import { readFile } from 'node:fs/promises';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';

const REQUIRED_ENTRY_FIELDS = ['id', 'subsystem', 'strategy', 'status'];
const REQUIRED_SUBSYSTEMS = ['tur-ir-flow', 'pvrg-core-scanner', 'semantic-runtime-stage2', 'gbc-gfs-slice'];

async function pathExists(cwd, relativePath) {
  if (!relativePath) {
    return true;
  }

  try {
    await access(join(cwd, relativePath), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function checkIohascHeritagePortRegistry(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const registryPath = options.registryPath ?? 'docs/iohasc-heritage-port-registry.v1.json';
  const text = options.registryText ?? await readFile(join(cwd, registryPath), 'utf8');
  /** @type {{ schema: string, entries: Array<Record<string, unknown>> }} */
  let registry;

  try {
    registry = JSON.parse(text);
  } catch (error) {
    return {
      ok: false,
      schema: 'iohasc.heritage.port-registry.check.v1',
      registryPath,
      errors: [`invalid JSON: ${error instanceof Error ? error.message : String(error)}`],
    };
  }

  const errors = [];

  if (registry.schema !== 'iohasc.heritage.port-registry.v1') {
    errors.push(`unexpected schema: ${registry.schema}`);
  }

  if (!Array.isArray(registry.entries) || registry.entries.length === 0) {
    errors.push('entries must be a non-empty array');
    return {
      ok: false,
      schema: 'iohasc.heritage.port-registry.check.v1',
      registryPath,
      errors,
    };
  }

  const ids = new Set();
  for (const entry of registry.entries) {
    for (const field of REQUIRED_ENTRY_FIELDS) {
      if (entry[field] === undefined || entry[field] === '') {
        errors.push(`entry ${entry.id ?? '?'} missing ${field}`);
      }
    }

    if (ids.has(entry.id)) {
      errors.push(`duplicate entry id: ${entry.id}`);
    }
    ids.add(entry.id);

    if (entry.status === 'done' && entry.workId) {
      const artifacts = Array.isArray(entry.wgArtifacts) ? entry.wgArtifacts : [];
      for (const artifact of artifacts) {
        if (artifact.endsWith('/')) {
          continue;
        }
        const exists = await pathExists(cwd, artifact);
        if (!exists) {
          errors.push(`done entry ${entry.id} missing artifact: ${artifact}`);
        }
      }
    }
  }

  for (const requiredId of REQUIRED_SUBSYSTEMS) {
    if (!ids.has(requiredId)) {
      errors.push(`missing required subsystem entry: ${requiredId}`);
    }
  }

  let workItems = [];
  if (options.validateWorkIds !== false) {
    workItems = await readWorkItemsFromRepo({ cwd });
    const workIds = new Set(workItems.map((item) => item.id));

    for (const entry of registry.entries) {
      if (entry.workId && !workIds.has(entry.workId)) {
        errors.push(`unknown work_id in registry: ${entry.workId} (${entry.id})`);
      }
    }
  }

  return {
    ok: errors.length === 0,
    schema: 'iohasc.heritage.port-registry.check.v1',
    registryPath,
    entryCount: registry.entries.length,
    doneCount: registry.entries.filter((entry) => entry.status === 'done').length,
    deferCount: registry.entries.filter((entry) => entry.status === 'defer').length,
    errors,
  };
}

export function formatIohascHeritagePortRegistryReport(report) {
  const lines = [
    `iohasc heritage port-registry: ${report.ok ? 'ok' : 'failed'}`,
    `registry: ${report.registryPath} (${report.entryCount} entries, ${report.doneCount} done, ${report.deferCount ?? 0} defer)`,
  ];

  if (report.errors.length > 0) {
    lines.push('errors:');
    for (const error of report.errors) {
      lines.push(`  - ${error}`);
    }
  }

  return lines.join('\n');
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = await checkIohascHeritagePortRegistry();
  console.log(formatIohascHeritagePortRegistryReport(report));
  if (!report.ok) {
    process.exit(1);
  }
}
