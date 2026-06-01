import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  auditToolRulesMigratedPort,
  formatAgentBehaviorRulesAuditReport,
} from '../src/agentBehaviorRulesAudit.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const report = await auditToolRulesMigratedPort({ cwd: repoRoot });

console.log(formatAgentBehaviorRulesAuditReport(report));
process.exit(report.ok ? 0 : 1);
