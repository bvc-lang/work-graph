import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { buildCodegenRoundtripEvidence } from './codegenEvidence.mjs';
import {
  formatStepAtomDraft,
  parseStepAtomDrafts,
  validateStepAtomDraft,
} from './stepAtomFormatter.mjs';

export const COMPILER_ROUNDTRIP_RESULT_SCHEMA = 'compiler.roundtrip.result.v1';
export const COMPILER_ROUNDTRIP_ENGINE_VERSION = 'workgraph-compiler-roundtrip-mvp.v1';

function isCompilerModeDraft(draft) {
  const labels = draft?.labels ?? {};
  return labels['compiler.mode'] !== undefined || draft?.profile === 'compiler';
}

export async function runCompilerRoundTrip(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const stepPath = String(options.stepPath ?? '').trim();

  if (stepPath === '') {
    throw new TypeError('stepPath is required');
  }

  const absoluteStepPath = resolve(cwd, stepPath);
  const command = options.command ?? `npm run compiler:roundtrip -- ${stepPath.replace(/\\/g, '/')}`;
  const stepText = options.stepText ?? await readFile(absoluteStepPath, 'utf8');
  const imports = parseStepAtomDrafts(stepText);
  const primary = imports[0];

  if (!primary?.draft || !isCompilerModeDraft(primary.draft)) {
    const result = {
      schema: COMPILER_ROUNDTRIP_RESULT_SCHEMA,
      stepPath: stepPath.replace(/\\/g, '/'),
      generatedPaths: [],
      status: 'skipped',
      command,
      exitCode: 0,
      diffSummary: 'Step is not compiler-mode; round-trip skipped.',
      engineVersion: COMPILER_ROUNDTRIP_ENGINE_VERSION,
      taskId: options.taskId ?? null,
      skippedReason: 'not_compiler_mode',
    };

    return {
      result,
      evidence: buildCodegenRoundtripEvidence(result),
      validationErrors: [],
      warnings: primary?.warnings ?? [],
    };
  }

  const validationErrors = [
    ...(primary.errors ?? []),
    ...validateStepAtomDraft(primary.draft),
  ];

  if (validationErrors.length > 0) {
    const result = {
      schema: COMPILER_ROUNDTRIP_RESULT_SCHEMA,
      stepPath: stepPath.replace(/\\/g, '/'),
      generatedPaths: [],
      status: 'failed',
      command,
      exitCode: 1,
      diffSummary: `StepAtomDraft validation failed: ${validationErrors.join('; ')}`,
      engineVersion: COMPILER_ROUNDTRIP_ENGINE_VERSION,
      taskId: options.taskId ?? primary.draft.labels?.['work.id'] ?? primary.draft.name,
    };

    return {
      result,
      evidence: buildCodegenRoundtripEvidence(result),
      validationErrors,
      warnings: primary.warnings ?? [],
    };
  }

  const formattedOnce = formatStepAtomDraft(primary.draft);
  const reparsed = parseStepAtomDrafts(formattedOnce)[0];
  const formattedTwice = formatStepAtomDraft(reparsed.draft);
  const stable = formattedOnce === formattedTwice;
  const reparsedErrors = [
    ...(reparsed.errors ?? []),
    ...validateStepAtomDraft(reparsed.draft),
  ];

  const result = {
    schema: COMPILER_ROUNDTRIP_RESULT_SCHEMA,
    stepPath: stepPath.replace(/\\/g, '/'),
    generatedPaths: [stepPath.replace(/\\/g, '/')],
    status: stable && reparsedErrors.length === 0 ? 'passed' : 'failed',
    command,
    exitCode: stable && reparsedErrors.length === 0 ? 0 : 1,
    diffSummary: stable && reparsedErrors.length === 0
      ? 'format(parse(format(draft))) stable for compiler-mode step'
      : 'Round-trip invariant failed for compiler-mode step',
    engineVersion: COMPILER_ROUNDTRIP_ENGINE_VERSION,
    taskId: options.taskId ?? primary.draft.labels?.['work.id'] ?? primary.draft.name,
  };

  return {
    result,
    evidence: buildCodegenRoundtripEvidence(result),
    validationErrors: reparsedErrors,
    warnings: [...(primary.warnings ?? []), ...(reparsed.warnings ?? [])],
  };
}

export async function runCompilerRoundTripCli(argv = process.argv) {
  const args = argv.slice(2);
  let stepPath;
  let taskId;
  let jsonOnly = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--json') {
      jsonOnly = true;
      continue;
    }
    if (arg === '--task-id') {
      taskId = args[index + 1];
      index += 1;
      continue;
    }
    if (!arg.startsWith('-') && stepPath === undefined) {
      stepPath = arg;
    }
  }

  if (!stepPath) {
    stepPath = 'tests/fixtures/compiler-roundtrip/sample.compiler.bvc';
  }

  const output = await runCompilerRoundTrip({ stepPath, taskId });

  if (jsonOnly) {
    console.log(JSON.stringify({
      result: output.result,
      evidence: output.evidence,
      validationErrors: output.validationErrors,
      warnings: output.warnings,
    }, null, 2));
  } else {
    console.log(JSON.stringify({
      schema: output.result.schema,
      status: output.result.status,
      stepPath: output.result.stepPath,
      evidenceId: output.evidence.id,
      diffSummary: output.result.diffSummary,
    }, null, 2));
  }

  return output.result.status === 'failed' ? 1 : 0;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const exitCode = await runCompilerRoundTripCli();
  process.exitCode = exitCode;
}
