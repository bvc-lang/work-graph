import { VERIFICATION_MATRIX } from './verificationLoop.mjs';

const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

export const RELEASE_GATE_TIERS = ['mandatory', 'mandatory-integration', 'optional-env', 'optional-llm'];

export const RELEASE_GATE_ROWS = [
  {
    id: 'deterministic-test-suite',
    tier: 'mandatory',
    title: 'Work Graph deterministic test suite',
    command: 'npm run test:deterministic',
    registerPhase: 'all',
    blocksRelease: true,
  },
  {
    id: 'backlog-schema-lint',
    tier: 'mandatory',
    title: 'Backlog schema lint',
    command: 'npm run lint:backlog',
    registerPhase: 'all',
    blocksRelease: true,
  },
  {
    id: 'ci-mandatory-bundle',
    tier: 'mandatory',
    title: 'CI mandatory bundle (tests + lint)',
    command: 'npm run ci:mandatory',
    registerPhase: 'all',
    blocksRelease: true,
  },
  {
    id: 'daemon-live-loop-integration',
    tier: 'mandatory-integration',
    title: 'Daemon tick + live-loop integration fixtures',
    command: 'tests/workGraphDaemonIntegration.test.mjs',
    registerPhase: 'phase-2+',
    blocksRelease: true,
  },
  {
    id: 'intent-tree-parity',
    tier: 'mandatory-integration',
    title: 'Intent tree migration snapshot parity',
    command: 'tests/intentTreeMigration.test.mjs (equivalence)',
    registerPhase: 'phase-3+',
    blocksRelease: true,
  },
  {
    id: 'compiler-roundtrip-fixture',
    tier: 'mandatory-integration',
    title: 'Compiler round-trip CLI on fixture step',
    command: 'npm run compiler:roundtrip -- tests/fixtures/compiler-roundtrip/sample.compiler.bvc',
    registerPhase: 'phase-5+',
    blocksRelease: true,
  },
  {
    id: 'code-gap-analyzer-fixture',
    tier: 'mandatory-integration',
    title: 'Code-gap analyzer CLI on fixture repo',
    command: 'node --test tests/codeGapAnalyzer.test.mjs',
    registerPhase: 'phase-5+',
    blocksRelease: true,
  },
  {
    id: 'onebase-go-optional',
    tier: 'optional-env',
    title: 'OneBase go test (environment)',
    command: 'npm run test:optional:onebase',
    registerPhase: 'phase-7+',
    blocksRelease: false,
  },
  {
    id: 'onebase-check-optional',
    tier: 'optional-env',
    title: 'OneBase config check (CLI)',
    command: 'npm run test:optional:onebase-check',
    registerPhase: 'phase-7+',
    blocksRelease: false,
  },
  {
    id: 'optional-blocked-onebase-go-preflight',
    tier: 'optional-env',
    title: 'OneBase go preflight blocked evidence fixture',
    command: 'npm run eval:optional:blocked-onebase-go',
    registerPhase: 'phase-7+',
    blocksRelease: false,
  },
  {
    id: 'lowcode-verify-optional',
    tier: 'optional-env',
    title: 'Low-code arch-rules scaffold verify',
    command: 'npm run verify:lowcode',
    registerPhase: 'audit-gap+',
    blocksRelease: false,
  },
  {
    id: 'golden-path-llm-optional',
    tier: 'optional-llm',
    title: 'Golden path LLM eval',
    command: 'npm run test:optional:golden-path-llm',
    registerPhase: 'phase-8+',
    blocksRelease: false,
  },
  {
    id: 'optional-llm-claim-no-eligible',
    tier: 'optional-llm',
    title: 'Optional LLM: claim-no-eligible fixture',
    command: 'npm run eval:optional:claim-no-eligible',
    registerPhase: 'phase-8+',
    blocksRelease: false,
  },
  {
    id: 'optional-llm-loop-hint',
    tier: 'optional-llm',
    title: 'Optional LLM: loop-hint repeat-tool fixture',
    command: 'npm run eval:optional:loop-hint',
    registerPhase: 'phase-8+',
    blocksRelease: false,
  },
  {
    id: 'optional-llm-live-eval',
    tier: 'optional-llm',
    title: 'Live LLM eval (golden path rubric)',
    command: 'npm run eval:live-llm',
    registerPhase: 'phase-8+',
    blocksRelease: false,
  },
  {
    id: 'operator-dashboard-e2e',
    tier: 'optional-env',
    title: 'Playwright operator dashboard smoke',
    command: 'npm run test:e2e',
    registerPhase: 'phase-10+',
    blocksRelease: false,
  },
  {
    id: 'optional-gvm-verify',
    tier: 'optional-env',
    title: 'Optional GVM verify worker preflight stub',
    command: 'npm run eval:optional:gvm-verify',
    registerPhase: 'phase-11+',
    blocksRelease: false,
  },
  {
    id: 'gbc-module-slice-pilot',
    tier: 'optional-env',
    title: 'GBC module slice pilot probe (read-only)',
    command: 'npm run probe:gbc-module-slice-pilot',
    registerPhase: 'phase-11+',
    blocksRelease: false,
  },
];

export function buildReleaseGateMatrix() {
  const rows = [...RELEASE_GATE_ROWS].sort((left, right) => compareText(left.id, right.id));
  const byTier = Object.fromEntries(
    RELEASE_GATE_TIERS.map((tier) => [tier, rows.filter((row) => row.tier === tier)]),
  );

  return {
    schema: 'workgraph.release.gate.matrix.v1',
    tiers: [...RELEASE_GATE_TIERS],
    rows,
    byTier,
    verificationMatrix: VERIFICATION_MATRIX,
    policy: {
      mandatoryCommand: 'npm run ci:mandatory',
      deterministicCommand: 'npm run test:deterministic',
      backlogLintCommand: 'npm run lint:backlog',
      optionalEnvCommand: 'npm run test:optional:onebase',
      optionalBlockedOnebaseGoCommand: 'npm run eval:optional:blocked-onebase-go',
      optionalBlockedOnebaseGoEnv: 'Deterministic stub; no Go toolchain or live LLM required',
      optionalLlmCommands: [
        'npm run test:optional:golden-path-llm',
        'npm run eval:optional:claim-no-eligible',
        'npm run eval:optional:loop-hint',
        'npm run eval:live-llm',
      ],
      optionalLlmCommand: 'npm run test:optional:golden-path-llm',
      optionalE2eCommand: 'npm run test:e2e',
      optionalE2eEnv: 'IOHASC_E2E_REAL_LLM not required; Playwright uses isolated fixture via WORKGRAPH_E2E_ROOT',
      optionalGvmVerifyCommand: 'npm run eval:optional:gvm-verify',
      optionalGvmVerifyEnv: 'IOHASC_GVM_VERIFY=1 enables stub preflight; skips when .iohasc/cache wasm slices missing',
      optionalGbcPilotCommand: 'npm run probe:gbc-module-slice-pilot',
      modelQualityNeverBlocksMandatory: true,
    },
  };
}
