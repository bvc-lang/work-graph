import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildWorkGraphLlmUsefulnessReport } from '../src/workGraphLlmUsefulnessEval.mjs';
import {
  claimWorkItem,
  getArchitectureSnapshot,
  getCurrentCycle,
  getIntentHierarchy,
  getPromoteReadyQueue,
  getPvrgTaskScope,
  getUnifiedLinkage,
  getWorkItem,
  listWorkItems,
} from '../packages/workgraph-mcp/src/handlers.mjs';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(scriptDir, '..');

const report = await buildWorkGraphLlmUsefulnessReport({
  root: repoRoot,
  executeClaim: false,
  handlers: {
    getCurrentCycle,
    getPromoteReadyQueue,
    listWorkItems,
    getWorkItem,
    claimWorkItem,
    getIntentHierarchy,
    getArchitectureSnapshot,
    getUnifiedLinkage,
    getPvrgTaskScope,
  },
});

console.log(JSON.stringify(report, null, 2));
process.exit(report.mandatoryEval.ok && report.scorecard.overall >= 0.55 ? 0 : 1);
