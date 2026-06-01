#!/usr/bin/env node
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const EPIC_ID = 'epic-marketplace-shared-design-system';
const PARENT = 'intent-marketplace-backlog-bootstrap';

const PLANS = [
  {
    workId: 'marketplace-plan-edinaya-avtorizaciya',
    title: 'Marketplace plan: единая авторизация',
    basis: ['Migrated from 04 Marketplace/docs/plans/единая-авторизация.md'],
    targetFiles: ['../../04 Marketplace/docs/plans/единая-авторизация.md'],
  },
  {
    workId: 'marketplace-plan-etap-4-geo-url',
    title: 'Marketplace plan: этап 4 — geo URL',
    basis: ['Migrated from 04 Marketplace/docs/plans/этап-4-гео-url.md'],
    targetFiles: ['../../04 Marketplace/docs/plans/этап-4-гео-url.md'],
  },
];

async function main() {
  const existing = new Set((await readWorkItemsFromRepo({ cwd: process.cwd() })).map((i) => i.id));
  let created = 0;
  for (const plan of PLANS) {
    if (existing.has(plan.workId)) continue;
    await createWorkItem({
      workId: plan.workId,
      title: plan.title,
      department: 'domain-marketplace',
      ownerRole: 'product_owner',
      priority: 'medium',
      risk: 'low',
      status: 'backlog',
      itemKind: 'task',
      parentId: PARENT,
      dependsOn: `${EPIC_ID}, ${PARENT}`,
      basis: plan.basis.join('\n'),
      vector: 'Исполнить по markdown plan; evidence в Marketplace repo.',
      goal: plan.title,
      checks: 'plan markdown linked in target_files',
      targetFiles: plan.targetFiles.join(', '),
      intakeSourceKind: 'analytics-record',
      intakeSourceRef: 'work/analytics/marketplace-integration-and-shared-design-system.md',
      analyticsKey: 'AN-21',
    }, { root: process.cwd() });
    created += 1;
    console.log(`created ${plan.workId}`);
  }
  console.log(JSON.stringify({ created }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
