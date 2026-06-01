import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { readWorkItemsFromIntentTree } from './intentTreeWorkItems.mjs';
import { RELEASE_GATE_ROWS } from './releaseGateMatrix.mjs';
import { buildOneBaseMcpParityMatrix } from './onebaseWorkItemTemplate.mjs';

export const ONEBASE_VECTOR_DSL_CODEGEN_READINESS_SCHEMA = 'onebase.vector-dsl.codegen-readiness.v1';
export const ONEBASE_CODEGEN_PILOT_WORK_ID = 'onebase-vector-dsl-codegen-pilot';

const DONE_STATUSES = new Set(['done', 'verified']);
const APPROVED_PILOT_STATUSES = new Set(['ready', 'claimed', 'doing', 'in_progress', 'verify', 'done', 'verified']);

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function itemById(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function hasGoldenPathEvidence(items) {
  const goldenPathIds = [
    'onebase-implement-gross-profit-warehouse-dimension',
    'onebase-posting-rule-golden-path',
    'onebase-posting-scenario-design',
  ];
  return goldenPathIds.some((id) => {
    const item = items.find((entry) => entry.id === id);
    return item && DONE_STATUSES.has(item.status);
  });
}

/**
 * @param {{ cwd?: string, items?: import('./workGraphRuntime.mjs').WorkItem[], releaseGateRows?: typeof RELEASE_GATE_ROWS, deferStepPath?: string }} [options]
 */
export async function evaluateOnebaseVectorDslCodegenReadiness(options = {}) {
  const cwd = resolve(options.cwd ?? process.cwd());
  const items = options.items ?? await readWorkItemsFromIntentTree({ cwd });
  const byId = itemById(items);
  const releaseGateRows = options.releaseGateRows ?? RELEASE_GATE_ROWS;
  const deferStepPath = resolve(cwd, options.deferStepPath ?? 'domains/onebase/defer-vector-dsl-codegen.bvc');

  const phase7 = byId.get('phase-7-onebase-vertical');
  const templatePath = resolve(cwd, 'domains/onebase/workitem-template.bvc');
  const mcpParityPath = resolve(cwd, 'protocols/onebase-mcp-parity-v1.bvc');
  const pilotItem = byId.get(ONEBASE_CODEGEN_PILOT_WORK_ID);

  const phase7Closed = Boolean(phase7 && DONE_STATUSES.has(phase7.status));
  const templateExists = await pathExists(templatePath);
  const mcpParityExists = await pathExists(mcpParityPath);
  const parityMatrix = buildOneBaseMcpParityMatrix();
  const goldenPathRepeatable = hasGoldenPathEvidence(items);
  const optionalOnebaseGate = releaseGateRows.some((row) => row.command === 'npm run test:optional:onebase');
  const compilerRoundtripGate = releaseGateRows.some((row) => row.id === 'compiler-roundtrip-fixture');
  const pilotApproved = Boolean(
    pilotItem
    && APPROVED_PILOT_STATUSES.has(pilotItem.status)
    && String(pilotItem.labels?.['migration.strategy'] ?? '').trim() !== 'defer',
  );

  const triggers = [
    {
      id: 'phase-7-closed-with-bridge-artifacts',
      label: 'phase-7-onebase-vertical closed with template + MCP parity + ≥1 repeatable golden path',
      met: phase7Closed && templateExists && mcpParityExists && goldenPathRepeatable,
      evidence: [
        phase7 ? `phase-7 status=${phase7.status}` : 'phase-7 missing',
        templateExists ? templatePath : 'missing workitem template',
        mcpParityExists ? mcpParityPath : 'missing MCP parity protocol',
        goldenPathRepeatable ? 'golden-path work item done' : 'no done golden-path work item',
      ],
    },
    {
      id: 'optional-onebase-ci-tier',
      label: 'npm run test:optional:onebase registered in optional CI tier',
      met: optionalOnebaseGate,
      evidence: optionalOnebaseGate
        ? 'releaseGateMatrix optional-env onebase-go-optional'
        : 'release gate row missing',
    },
    {
      id: 'compiler-roundtrip-wired',
      label: 'Compiler round-trip evidence contract wired for compiler-mode steps',
      met: compilerRoundtripGate,
      evidence: compilerRoundtripGate
        ? 'releaseGateMatrix compiler-roundtrip-fixture'
        : 'compiler roundtrip gate missing',
    },
    {
      id: 'codegen-pilot-approved',
      label: `Explicit WorkItem ${ONEBASE_CODEGEN_PILOT_WORK_ID} approved (not auto-promotion)`,
      met: pilotApproved,
      evidence: pilotApproved
        ? `${ONEBASE_CODEGEN_PILOT_WORK_ID} status=${pilotItem.status}`
        : `create/promote ${ONEBASE_CODEGEN_PILOT_WORK_ID} when reopening codegen`,
    },
  ];

  const deferStepText = await readFile(deferStepPath, 'utf8');
  const recommendation = triggers.every((trigger) => trigger.met) ? 'reopen-codegen-pilot' : 'keep-deferred';

  return {
    schema: ONEBASE_VECTOR_DSL_CODEGEN_READINESS_SCHEMA,
    recommendation,
    readyToReopenCodegen: recommendation === 'reopen-codegen-pilot',
    deferStepPath,
    parityCapabilityCount: parityMatrix?.rows?.length ?? 0,
    triggerCount: triggers.length,
    metCount: triggers.filter((trigger) => trigger.met).length,
    triggers,
    checklist: triggers.map((trigger) => ({
      criterion: trigger.label,
      met: trigger.met,
      evidence: trigger.evidence,
    })),
    deferStepReferencesReadiness: deferStepText.includes('evaluateOnebaseVectorDslCodegenReadiness')
      || deferStepText.includes('onebaseVectorDslCodegenReadiness'),
  };
}

export function formatOnebaseVectorDslCodegenReadinessReport(report) {
  const lines = [
    `onebase vector-dsl codegen readiness: ${report.recommendation} (${report.metCount}/${report.triggerCount} triggers met)`,
  ];

  for (const trigger of report.triggers) {
    lines.push(`${trigger.met ? 'ok' : 'pending'}: ${trigger.label}`);
  }

  return lines.join('\n');
}
