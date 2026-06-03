#!/usr/bin/env node
/**
 * Seed: AN-50.1 — BVC work-item contract projection + MCP verification gates.
 * Default status: backlog.
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const ANALYTICS = 'work/analytics/work-graph-bvc-contract-verification.md';
const PLAN = 'docs/plan-work-graph-bvc-contract-verification.md';
const EPIC_ID = 'epic-work-graph-bvc-contract-verification-v1';
const MCP_INDEX = 'packages/workgraph-mcp/src/index.mjs';
const MCP_HANDLERS = 'packages/workgraph-mcp/src/handlers.mjs';
const MCP_TESTS = 'tests/workgraph-mcp.test.mjs';

const TASKS = [
  {
    workId: EPIC_ID,
    title: 'BVC contract verification v1: projection + MCP gates + structured evidence (AN-50.1)',
    department: 'agent-platform',
    ownerRole: 'agent_platform_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'epic',
    dependsOn: ['design-evidence-model-v1', 'implement-workgraph-minimal-runtime'],
    basis: [
      'AN-50: «Проверки» — read-only audit; доказательства привязаны к work.id, но контракт размазан по prose и matrix.',
      'AN-50.1: сдвиг «лог теста → контракт исполнения»; BVC — машиночитаемый контракт через projection, не дублирование YAML.',
      'Разрыв: MCP не отдаёт get_work_contract; complete_work_item не возвращает structured violations; evidence в .bvc — в основном строки.',
    ],
    vector: [
      'P0: ADR projection vs duplicate contract: YAML в атомах.',
      'P0: work-item-contract.v1 builder из target_files, checks, VERIFICATION_MATRIX.',
      'P0: MCP get_work_contract, validate_evidence, assert_task_ready_for_done.',
      'P1: extend bvc-atom-draft + runtime validation on add_work_item_evidence.',
      'P1: verification panel contract summary badge.',
      'P2: design SDK contract wrapper (deferred implementation).',
    ],
    goal: [
      'Агент (Cursor) получает контракт задачи одним MCP-вызовом и dry-run assert перед done; structured evidence — optional→required для Tier A.',
    ],
    checks: [
      'ADR work-item-contract-projection-v1 принят',
      'Три MCP tools зарегистрированы и покрыты tests/workgraph-mcp.test.mjs',
      'Projection не требует contract: блока в каждом атоме',
      'docs/plan и packages/workgraph-mcp/README обновлены',
      'AN-50.1 closing doc опубликован',
    ],
    analysis: [
      'Зачем:',
      'GTM: WG как контрактная платформа AI-разработки, не «доска с тестами».',
      'Границы:',
      'Не заменять русский .bvc; не big-bang structured evidence; SDK wrapper — P2 design only.',
      'Зависимости:',
      'AN-50, evidence-model-v1, verificationLoop, workGraphRuntime.',
    ],
    decision: [
      'Вердикт:',
      'полезно',
      'Исполнять по docs/plan-work-graph-bvc-contract-verification.md.',
    ],
    targetFiles: [
      ANALYTICS,
      PLAN,
      'docs/adr-work-item-contract-projection-v1.md',
      'src/workItemContractProjection.mjs',
      MCP_INDEX,
      MCP_HANDLERS,
      MCP_TESTS,
      'src/workGraphRuntime.mjs',
      'packages/bvc-spec/schemas/bvc-atom-draft.v1.json',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-50.1',
  },
  {
    workId: 'decide-work-item-contract-projection-adr',
    title: 'ADR: work-item contract — projection vs duplicate contract YAML',
    department: 'agent-platform',
    ownerRole: 'agent_platform_architect',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      'Предложен YAML contract: input/output/verification дублирует Базис, Проверки, work.depends_on, VERIFICATION_MATRIX.',
      'AN-50.1: канон — projection-слой; явный contract: только для overrides.',
    ],
    vector: [
      'docs/adr-work-item-contract-projection-v1.md — принять proposed ADR (AN-50.1 §5).',
      'Pure projection (workItemContractProjection.mjs) + shared evaluate (workItemReadyForDone.mjs).',
      'Tier: gateTaskIds, A>B>C; violations[] work-item-ready-for-done.v1; Contract Health P1.',
      'Согласовать с protocols/evidence-model-v1.bvc и rebuild-verification-loop.bvc.',
    ],
    goal: ['ADR status accepted; команда не переписывает атомы под второй формат контракта.'],
    checks: [
      'ADR покрывает tier rule, assert vs complete, evidence P0/P1, UI scope',
      'ADR в docs/ с trace на AN-50.1 §5',
    ],
    targetFiles: [ANALYTICS, PLAN, 'docs/adr-work-item-contract-projection-v1.md'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-50.1',
  },
  {
    workId: 'implement-work-item-contract-projection',
    title: 'Implement work-item-contract.v1 projection builder',
    department: 'agent-platform',
    ownerRole: 'agent_platform_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['decide-work-item-contract-projection-adr'],
    basis: [
      'get_work_contract требует единый builder: input/output/verification из WorkItem + VERIFICATION_MATRIX + evidence-model.',
    ],
    vector: [
      'src/workItemContractProjection.mjs — buildWorkItemContractV1(workItem, ctx) pure, no side-effects.',
      'Tier: gateTaskIds match, A>B>C, matrixRowIds[]; non-gate tier null.',
      'tests/workItemContractProjection.test.mjs — gate, non-gate, multi-row fixtures.',
    ],
    goal: ['Любой work.id получает стабильный work-item-contract.v1 JSON без парсинга Markdown агентом.'],
    checks: [
      'Projection tests green including multi-row gateTaskIds',
      'Schema и tier rule в ADR',
    ],
    targetFiles: [
      'src/workItemContractProjection.mjs',
      'tests/workItemContractProjection.test.mjs',
      'src/verificationLoop.mjs',
      'src/intentTreeWorkItems.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-50.1',
  },
  {
    workId: 'implement-mcp-get-work-contract',
    title: 'MCP: get_work_contract + workgraph://contract/{workId}',
    department: 'agent-platform',
    ownerRole: 'agent_platform_architect',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-work-item-contract-projection'],
    basis: [
      'Cursor/Claude должны видеть контракт задачи без чтения .work.bvc и без парсинга prose.',
    ],
    vector: [
      'server.tool get_work_contract(workId) в packages/workgraph-mcp/src/index.mjs.',
      'Handler вызывает buildWorkItemContractV1.',
      'Optional resource workgraph://contract/{workId}.',
      'tests/workgraph-mcp.test.mjs + README.',
    ],
    goal: ['Один MCP-вызов возвращает input/output/verification для seed workId.'],
    checks: [
      'get_work_contract возвращает schema work-item-contract.v1',
      'tests/workgraph-mcp.test.mjs зелёные',
    ],
    targetFiles: [MCP_INDEX, MCP_HANDLERS, MCP_TESTS, 'src/workItemContractProjection.mjs'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-50.1',
  },
  {
    workId: 'implement-mcp-assert-task-ready-for-done',
    title: 'MCP: assert_task_ready_for_done — structured violations dry-run',
    department: 'agent-platform',
    ownerRole: 'agent_platform_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-work-item-contract-projection'],
    basis: [
      'complete_work_item уже гейтит evidence, но агент не получает список «что не так» до попытки закрытия.',
    ],
    vector: [
      'src/workItemReadyForDone.mjs — evaluateWorkItemReadyForDone shared by assert and complete.',
      'assert_task_ready_for_done dry-run → work-item-ready-for-done.v1.',
      'complete: same evaluate; P0.5 violations[] on fail; prior assert not required.',
      'tests/workgraph-mcp.test.mjs + tests/workItemReadyForDone.test.mjs.',
    ],
    goal: ['Machine-readable violations; assert и complete — одна функция evaluate.'],
    checks: [
      'assert violations for missing/structured evidence',
      'complete without prior assert enforces same rules',
      'tests green',
    ],
    targetFiles: [MCP_INDEX, MCP_HANDLERS, MCP_TESTS, 'src/workGraphRuntime.mjs', 'src/workItemReadyForDone.mjs', 'tests/workItemReadyForDone.test.mjs'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-50.1',
  },
  {
    workId: 'implement-mcp-validate-evidence',
    title: 'MCP: validate_evidence — evidence JSON vs task contract',
    department: 'agent-platform',
    ownerRole: 'agent_platform_architect',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-work-item-contract-projection'],
    basis: [
      'evidence-model-v1 описывает types, но add_work_item_evidence принимает prose; нужен pre-flight validate.',
    ],
    vector: [
      'server.tool validate_evidence(workId, evidenceJson).',
      'Validate against evidence-record-v1 + contract.output.evidenceRequired.',
      'tests/workgraph-mcp.test.mjs с command/test fixtures.',
    ],
    goal: ['Фейковые или неполные evidence отклоняются до записи в .bvc.'],
    checks: [
      'validate_evidence ok/fail cases covered',
      'README MCP documents tool',
    ],
    targetFiles: [
      MCP_INDEX,
      MCP_HANDLERS,
      MCP_TESTS,
      'protocols/evidence-model-v1.bvc',
      'src/evidenceReadModel.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-50.1',
  },
  {
    workId: 'extend-bvc-schema-structured-evidence-fields',
    title: 'Extend bvc-atom-draft schema with optional structured evidence[]',
    department: 'agent-platform',
    ownerRole: 'agent_platform_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['decide-work-item-contract-projection-adr'],
    basis: [
      'Dual view: prose Свидетельства + optional evidence[] { type, cmd, exitCode } в atom-draft.',
    ],
    vector: [
      'packages/bvc-spec/schemas/bvc-atom-draft.v1.json — optional evidence array.',
      'bvc:lint / lint:backlog — validate shape when present.',
      'Migration note in ADR: optional → required for Tier A gates.',
    ],
    goal: ['Machine view evidence в schema без ломания существующих атомов.'],
    checks: [
      'Schema validates optional evidence',
      'lint:backlog green on repo',
    ],
    targetFiles: [
      'packages/bvc-spec/schemas/bvc-atom-draft.v1.json',
      'src/backlogSchemaLint.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-50.1',
  },
  {
    workId: 'extend-runtime-structured-evidence-validation',
    title: 'Runtime: validate structured evidence on add_work_item_evidence',
    department: 'agent-platform',
    ownerRole: 'agent_platform_architect',
    priority: 'medium',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['extend-bvc-schema-structured-evidence-fields', 'implement-mcp-validate-evidence'],
    basis: [
      'MCP validate_evidence и runtime add должны использовать одну validation функцию.',
    ],
    vector: [
      'Shared validateEvidenceForWorkItem in src/workGraphRuntime.mjs or evidence module.',
      'add_work_item_evidence: optional strict mode for Tier A gate tasks.',
      'tests/workGraphRuntime.test.mjs.',
    ],
    goal: ['Structured evidence enforced там, где контракт требует command/test proof.'],
    checks: [
      'Runtime tests for strict/loose modes',
      'Prose-only evidence still works for non-gated tasks',
    ],
    targetFiles: ['src/workGraphRuntime.mjs', 'tests/workGraphRuntime.test.mjs'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-50.1',
  },
  {
    workId: 'wire-verification-panel-contract-summary',
    title: 'UI: contract summary on «Проверки» panel',
    department: 'agent-platform',
    ownerRole: 'agent_platform_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-work-item-contract-projection'],
    basis: [
      'AN-50: панель read-only; оператор должен видеть tier + required evidence без открытия .bvc.',
    ],
    vector: [
      'buildVerificationSummary: optional contractSummary per selected work item.',
      '/api/dashboard-snapshot или dedicated endpoint.',
      'UI badge: tier, matrix row, evidence gaps from last assert projection.',
    ],
    goal: ['«Проверки» показывает contract-at-a-glance для выбранной задачи.'],
    checks: [
      'tests/workGraphBacklogUiServer.test.mjs or verification summary test',
      'Read-only — no run buttons added',
    ],
    targetFiles: [
      'src/verificationLoop.mjs',
      'src/workGraphBacklogUiServer.mjs',
      'src/workItemContractProjection.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-50.1',
  },
  {
    workId: 'design-sdk-contract-wrapper-v1',
    title: 'Design: SDK contract wrapper (P2 — MCP-first)',
    department: 'agent-platform',
    ownerRole: 'agent_platform_architect',
    priority: 'low',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-mcp-get-work-contract', 'implement-mcp-assert-task-ready-for-done'],
    basis: [
      'AN-50.1 §2.4: npm sugar поверх MCP; не второй source of truth.',
    ],
    vector: [
      'docs/design-sdk-contract-wrapper-v1.md — API sketch, allowed_commands, auto-evidence generation.',
      'Explicit defer implementation until MCP v1 stable.',
    ],
    goal: ['Design doc для будущего @work-graph/contract-layer без кода в MVP.'],
    checks: [
      'Design doc ссылается на MCP tools as canonical',
    ],
    targetFiles: ['docs/design-sdk-contract-wrapper-v1.md', ANALYTICS],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-50.1',
  },
  {
    workId: 'write-closing-epic-work-graph-bvc-contract-verification-v1',
    title: 'Closing: epic-work-graph-bvc-contract-verification-v1 (AN-50.1)',
    department: 'agent-platform',
    ownerRole: 'agent_platform_architect',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      EPIC_ID,
      'implement-mcp-get-work-contract',
      'implement-mcp-assert-task-ready-for-done',
      'implement-mcp-validate-evidence',
    ],
    basis: [
      'Закрытие эпика с evidence: MCP tool list, test output, ADR link.',
    ],
    vector: [
      'work/analytics/closing-epic-work-graph-bvc-contract-verification-v1.md',
      'Обновить work/analytics-records.jsonl closing record.',
    ],
    goal: ['AN-50.1 закрыт с проверяемыми артефактами.'],
    checks: [
      'Closing doc опубликован',
      'Эпик и P0 subtasks в done согласно факту',
    ],
    targetFiles: [
      'work/analytics/closing-epic-work-graph-bvc-contract-verification-v1.md',
      ANALYTICS,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS,
    analyticsKey: 'AN-50.1',
  },
];

async function main() {
  const existing = await readWorkItemsFromRepo({ cwd: process.cwd() });
  const existingIds = new Set(existing.map((item) => item.id));
  let created = 0;

  for (const task of TASKS) {
    if (existingIds.has(task.workId)) {
      console.log(`skip ${task.workId}`);
      continue;
    }

    await createWorkItem({
      workId: task.workId,
      title: task.title,
      department: task.department,
      ownerRole: task.ownerRole,
      priority: task.priority,
      risk: task.risk,
      status: task.status,
      itemKind: task.itemKind,
      parentId: task.parentId,
      dependsOn: task.dependsOn?.join(', '),
      basis: task.basis.join('\n'),
      vector: task.vector.join('\n'),
      goal: task.goal.join('\n'),
      checks: task.checks.join('\n'),
      analysis: task.analysis?.join('\n'),
      decision: task.decision?.join('\n'),
      targetFiles: task.targetFiles.join(', '),
      intakeSourceKind: task.intakeSourceKind,
      intakeSourceRef: task.intakeSourceRef,
      analyticsKey: task.analyticsKey,
    }, { root: process.cwd() });

    console.log(`created ${task.workId}`);
    created += 1;
  }

  console.log(JSON.stringify({
    schema: 'workgraph.seed-epic-work-graph-bvc-contract-verification-v1.v1',
    epicId: EPIC_ID,
    analyticsKey: 'AN-50.1',
    created,
    totalTasks: TASKS.length,
    defaultStatus: 'backlog',
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
