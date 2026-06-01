import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export const GVM_VERIFY_ENV = 'IOHASC_GVM_VERIFY';
export const GVM_VERIFY_PREFLIGHT_SCHEMA = 'gvm.verify.preflight.v1';

export const GVM_WASM_PROBE_PATHS = [
  {
    id: 'module-object-slice-gbc',
    relativePath: '.iohasc/cache/module-object-slice.gbc',
    role: 'wasm-registry-transport',
  },
  {
    id: 'step-file-slice-b64',
    relativePath: '.iohasc/cache/step-file-slice.b64',
    role: 'step-slice-transport',
  },
];

export function isGvmVerifyEnabled(options = {}) {
  const env = options.env ?? process.env;
  return (options.enabled ?? env[GVM_VERIFY_ENV]) === '1';
}

export function probeGvmWasmArtifacts(options = {}) {
  const cwd = resolve(options.cwd ?? process.cwd());
  const probes = [];

  for (const entry of GVM_WASM_PROBE_PATHS) {
    const absolutePath = resolve(cwd, entry.relativePath);
    const exists = existsSync(absolutePath);

    probes.push({
      ...entry,
      absolutePath,
      exists,
    });
  }

  const foundCount = probes.filter((entry) => entry.exists).length;

  return {
    cwd,
    probes,
    foundCount,
    wasmPresent: foundCount > 0,
  };
}

export function runGvmVerifyPreflight(options = {}) {
  if (!isGvmVerifyEnabled(options)) {
    return {
      schema: GVM_VERIFY_PREFLIGHT_SCHEMA,
      status: 'skipped',
      ok: true,
      skipped: true,
      reason: `${GVM_VERIFY_ENV} is not set; GVM verify gate inactive`,
      evidence: [],
    };
  }

  const probe = probeGvmWasmArtifacts(options);

  if (!probe.wasmPresent) {
    return {
      schema: GVM_VERIFY_PREFLIGHT_SCHEMA,
      status: 'skipped',
      ok: true,
      skipped: true,
      reason: 'GVM wasm/module slice missing; stub preflight only (full verify deferred)',
      probe,
      evidence: [{
        kind: 'gvm_verify',
        source: 'gvm-verify-gate',
        result: 'skipped',
        summary: 'IOHASC_GVM_VERIFY=1 but no wasm artifacts found under .iohasc/cache',
      }],
    };
  }

  return {
    schema: GVM_VERIFY_PREFLIGHT_SCHEMA,
    status: 'stub',
    ok: true,
    skipped: false,
    reason: 'GVM verify preflight acknowledged; mandate enforcement deferred to ioHasC GVM Lite',
    probe,
    evidence: [{
      kind: 'gvm_verify',
      source: 'gvm-verify-gate',
      result: 'stub',
      summary: `GVM artifacts present (${probe.foundCount}); full wasm verify not ported to Work Graph worker`,
    }],
  };
}
