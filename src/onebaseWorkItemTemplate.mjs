const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

export const ONEBASE_WORKITEM_TEMPLATE_V1 = {
  schema: 'onebase.workitem.template.v1',
  department: 'product-architecture',
  domainId: 'onebase',
  verificationCwd: '../onebase',
  preflightCommand: 'go version',
  primaryCommand: 'go test ./...',
  workGraphVerifyCommand: 'npm run test:optional:onebase',
  staticGateCommand: 'verifyOnebaseGrossProfitWarehouseArtifacts',
};

export function buildOneBaseWorkItemDraft(input) {
  if (input === undefined || input === null || typeof input !== 'object') {
    throw new TypeError('input must be an object');
  }

  const workId = String(input.workId ?? '').trim();
  if (workId === '') {
    throw new Error('workId is required');
  }

  const document = String(input.document ?? input.onebaseDocument ?? '').trim();
  const rule = String(input.rule ?? input.onebaseRule ?? '').trim();
  const title = String(input.title ?? `OneBase: ${rule || document || workId}`).trim();
  const targetFiles = [...(input.targetFiles ?? [])].map(String).filter(Boolean).sort(compareText);
  const rollbackNotes = String(input.rollbackNotes ?? '').trim();
  const restEvidenceRefs = [...(input.restEvidenceRefs ?? [])].map(String).filter(Boolean).sort(compareText);

  const basis = input.basis ?? `OneBase change for ${document || rule || workId}.`;
  const vector = input.vector ?? 'Update bounded YAML/.os/report artifacts per domains/onebase/artifact-mapping.bvc.';
  const goal = input.goal ?? 'Repeatable domain change with deterministic verification evidence.';

  const checks = [
    'metadata scan или artifact-mapping выполнен до правок',
    'target YAML/.os/report/widget files перечислены в work.target_files',
    'go version preflight + go test ./... или blocked environment evidence записаны',
    'rollback notes и preserved invariants задокументированы',
  ];

  if (restEvidenceRefs.length > 0) {
    checks.push('REST evidence refs записаны или помечены blocked');
  }

  return {
    schema: 'onebase.workitem.draft.v1',
    template: ONEBASE_WORKITEM_TEMPLATE_V1.schema,
    atomName: `#OneBase_${workId.replace(/-/gu, '_')}<[`,
    sections: {
      basis,
      vector,
      goal,
      checks,
      evidenceHints: [
        ONEBASE_WORKITEM_TEMPLATE_V1.workGraphVerifyCommand,
        `${ONEBASE_WORKITEM_TEMPLATE_V1.preflightCommand} + ${ONEBASE_WORKITEM_TEMPLATE_V1.primaryCommand}`,
        ONEBASE_WORKITEM_TEMPLATE_V1.staticGateCommand,
      ],
      rollbackNotes,
    },
    labels: {
      'atom.profile': 'work_item',
      'work.id': workId,
      'work.title': title,
      'work.status': input.status ?? 'backlog',
      'work.department': ONEBASE_WORKITEM_TEMPLATE_V1.department,
      'work.owner_role': input.ownerRole ?? 'domain_architect',
      'work.target_files': targetFiles.join(', '),
      'domain.id': ONEBASE_WORKITEM_TEMPLATE_V1.domainId,
      'onebase.document': document,
      'onebase.rule': rule,
      'verification.primary_command': ONEBASE_WORKITEM_TEMPLATE_V1.primaryCommand,
      'verification.preflight_command': ONEBASE_WORKITEM_TEMPLATE_V1.preflightCommand,
      'verification.cwd': ONEBASE_WORKITEM_TEMPLATE_V1.verificationCwd,
      ...(restEvidenceRefs.length > 0 ? { 'onebase.rest_evidence_refs': restEvidenceRefs.join(', ') } : {}),
      ...(rollbackNotes ? { 'onebase.rollback_notes': rollbackNotes.slice(0, 200) } : {}),
      'trace.status': 'pending',
      'migration.strategy': input.migrationStrategy ?? 'port',
    },
    dependsOn: [...(input.dependsOn ?? ['onebase-posting-rule-golden-path'])].sort(compareText),
  };
}

export function buildOneBaseMcpParityMatrix() {
  return {
    schema: 'onebase.access.parity.v1',
    rows: [
      {
        capability: 'metadata_scan',
        builtInTool: 'onebaseListMetadata',
        mcpTool: 'list_metadata',
        workGraphCli: 'verifyOnebaseGrossProfitWarehouseArtifacts',
        ciGate: false,
        notes: 'list_metadata prefers onebase describe --json with scan fallback',
      },
      {
        capability: 'describe_config',
        builtInTool: null,
        mcpTool: 'describe_config',
        workGraphCli: 'onebase describe --json',
        ciGate: false,
      },
      {
        capability: 'check_config',
        builtInTool: null,
        mcpTool: 'check_config',
        workGraphCli: 'onebase check',
        ciGate: false,
        notes: 'optional operator/DoD gate when OneBase CLI supports check',
      },
      {
        capability: 'ai_guide',
        builtInTool: null,
        mcpTool: 'ai_guide',
        workGraphCli: 'onebase ai-guide',
        ciGate: false,
      },
      {
        capability: 'read_config_file',
        builtInTool: 'workspace read + scan',
        mcpTool: 'read_config_file',
        workGraphCli: 'static artifact verify',
        ciGate: false,
      },
      {
        capability: 'rest_read',
        builtInTool: 'onebaseRestCall',
        mcpTool: 'rest_get',
        workGraphCli: 'optional manual',
        ciGate: false,
      },
      {
        capability: 'dev_health',
        builtInTool: 'onebaseDevStatus',
        mcpTool: 'env ONEBASE_* in MCP server',
        workGraphCli: 'go version preflight',
        ciGate: true,
      },
      {
        capability: 'deterministic_verify',
        builtInTool: null,
        mcpTool: null,
        workGraphCli: 'npm run test:optional:onebase',
        ciGate: true,
      },
    ],
    rules: [
      'CI/done gate uses work graph CLI only',
      'MCP and built-in tools are discovery/agent paths',
      'REST evidence is optional and may be blocked',
    ],
  };
}
