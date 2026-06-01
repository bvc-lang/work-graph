import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { buildOneBaseMcpParityMatrix } from './onebaseWorkItemTemplate.mjs';
import {
  probeOnebaseCliCapabilities,
  resolveDefaultCapabilitiesPath,
} from './onebaseCliCapabilityProbe.mjs';

const CAPABILITY_TO_CLI = {
  metadata_scan: null,
  describe_config: 'describe',
  check_config: 'check',
  ai_guide: 'ai-guide',
  read_config_file: null,
  rest_read: null,
  dev_health: null,
  deterministic_verify: null,
};

export function attachCliAvailabilityToParityRows(rows, probe) {
  const commandMap = probe?.commands ?? {};

  return rows.map((row) => {
    const cliCommand = CAPABILITY_TO_CLI[row.capability] ?? null;
    if (!cliCommand) {
      return { ...row, cliAvailable: null };
    }

    return {
      ...row,
      cliAvailable: Boolean(commandMap[cliCommand]),
      cliCommand,
    };
  });
}

export function buildOnebaseParityEvidencePayload(probe, options = {}) {
  const baseMatrix = buildOneBaseMcpParityMatrix();
  const rows = attachCliAvailabilityToParityRows(baseMatrix.rows, probe);

  return {
    schema: 'onebase.parity-evidence.v1',
    probedAt: probe.probedAt,
    binary: probe.binary,
    cliProbe: probe,
    parity: {
      ...baseMatrix,
      rows,
    },
    evidenceLine: formatParityEvidenceLine(probe),
    projectRoot: options.projectRoot ?? null,
  };
}

export function formatParityEvidenceLine(probe) {
  const check = probe.commands?.check ? 'available' : 'missing';
  const describe = probe.commands?.describe ? 'available' : 'missing';
  const aiGuide = probe.commands?.['ai-guide'] ? 'available' : 'missing';
  return `onebase CLI probe ${probe.probedAt}: binary=${probe.binary}; check=${check}; describe=${describe}; ai-guide=${aiGuide}`;
}

export async function syncOnebaseParityEvidence(options = {}) {
  const repoRoot = options.repoRoot ?? process.cwd();
  const probe = options.probe ?? probeOnebaseCliCapabilities({ repoRoot, ...options });
  const payload = buildOnebaseParityEvidencePayload(probe, options);
  const outputPath = resolve(repoRoot, options.outputPath ?? resolveDefaultCapabilitiesPath({ repoRoot }));

  if (options.writeFile !== false) {
    await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  }

  return {
    ok: true,
    outputPath,
    payload,
    probe,
  };
}

export function readParityRowsWithCachedProbe(probePayload) {
  const baseMatrix = buildOneBaseMcpParityMatrix();
  if (!probePayload?.cliProbe) {
    return baseMatrix.rows;
  }

  return attachCliAvailabilityToParityRows(baseMatrix.rows, probePayload.cliProbe);
}
