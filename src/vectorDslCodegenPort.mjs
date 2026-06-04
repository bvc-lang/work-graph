import { runCompilerRoundTrip } from './compilerRoundTripCli.mjs';

export const VECTOR_DSL_CODEGEN_PORT_SCHEMA = 'vector.dsl.codegen.port.v1';

export async function runVectorDslCodegenPort(options = {}) {
  const stepPath = String(options.stepPath ?? '').trim();
  if (stepPath === '') {
    throw new TypeError('stepPath is required');
  }

  const roundtrip = await runCompilerRoundTrip({
    cwd: options.cwd,
    stepPath,
    stepText: options.stepText,
    taskId: options.taskId,
    command: options.command,
  });

  return {
    schema: VECTOR_DSL_CODEGEN_PORT_SCHEMA,
    stepPath,
    engine: 'compiler-roundtrip-bridge',
    roundtrip: roundtrip.result,
    evidence: roundtrip.evidence,
    validationErrors: roundtrip.validationErrors,
    warnings: roundtrip.warnings,
  };
}
