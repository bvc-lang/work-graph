import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

export const LOWCODE_SCAFFOLD_MANIFEST_SCHEMA = 'workgraph.lowcode.scaffold.manifest.v1';
export const LOWCODE_SCAFFOLD_SUMMARY_SCHEMA = 'workgraph.lowcode.scaffold.summary.v1';

export const DEFAULT_ARCH_RULES_PATH = 'tests/fixtures/low-code-charter/arch-rules.bvc';
export const DEFAULT_SCAFFOLD_OUTPUT_DIR = 'generated/arch-scaffold';

const ARCH_RULE_BLOCK_PATTERN = /^#([^\n<]+)<\[\n([\s\S]*?)\n\]>/gmu;
const METADATA_TAG_PATTERN = /\/\*([^:]+):\s*([^*]+)\*\//gu;

export function parseArchRulesStepText(text) {
  if (typeof text !== 'string') {
    throw new TypeError('text must be a string');
  }

  const rules = [];
  const errors = [];

  for (const match of text.matchAll(ARCH_RULE_BLOCK_PATTERN)) {
    const [, rawName, body] = match;
    const name = rawName.trim();

    if (name === 'ioHascSync' || name.startsWith('ioHasc')) {
      continue;
    }

    const parsed = parseArchRuleBody(name, body);
    if (parsed.errors.length > 0) {
      errors.push(...parsed.errors.map((detail) => `${name}: ${detail}`));
      continue;
    }

    if (parsed.rule) {
      rules.push(parsed.rule);
    }
  }

  if (rules.length === 0) {
    errors.push('no arch rules found in charter text');
  }

  return {
    ok: errors.length === 0,
    rules,
    errors,
  };
}

function parseArchRuleBody(name, body) {
  const errors = [];
  const rule = {
    id: name,
    name,
    basis: '',
    vector: '',
    goal: '',
    metadata: {},
    metadataRaw: '',
  };

  for (const rawLine of body.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (line === '') {
      continue;
    }

    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
      errors.push(`unsupported line: ${line}`);
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (key === 'Базис') {
      rule.basis = value;
      continue;
    }

    if (key === 'Вектор') {
      rule.vector = value;
      continue;
    }

    if (key === 'Цель') {
      rule.goal = value;
      continue;
    }

    if (key === 'Метаданные') {
      rule.metadataRaw = value;
      rule.metadata = parseMetadataTags(value);
      continue;
    }

    errors.push(`unknown field ${key}`);
  }

  if (!rule.basis || !rule.vector || !rule.goal) {
    errors.push('missing basis/vector/goal');
    return { rule: null, errors };
  }

  return { rule, errors };
}

export function parseMetadataTags(value) {
  const metadata = {};

  for (const match of String(value).matchAll(METADATA_TAG_PATTERN)) {
    metadata[match[1].trim()] = match[2].trim();
  }

  return metadata;
}

export function buildArchRulesScaffoldSummary(options = {}) {
  const charterPath = normalizeRepoPath(options.charterPath ?? DEFAULT_ARCH_RULES_PATH);
  const outputDir = normalizeRepoPath(options.outputDir ?? DEFAULT_SCAFFOLD_OUTPUT_DIR);
  const parsed = options.parsed ?? parseArchRulesStepText(options.charterText ?? '');

  return {
    schema: LOWCODE_SCAFFOLD_SUMMARY_SCHEMA,
    ok: parsed.ok,
    charterPath,
    outputDir,
    ruleCount: parsed.rules.length,
    rules: parsed.rules.map((rule) => ({
      id: rule.id,
      domain: rule.metadata.domain ?? null,
      severity: rule.metadata.severity ?? null,
      pattern: rule.metadata.pattern ?? null,
    })),
    errors: parsed.errors,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
  };
}

export function buildArchRuleStubModule(rule) {
  const domain = rule.metadata.domain ?? 'unknown';
  const severity = rule.metadata.severity ?? 'unknown';
  const pattern = rule.metadata.pattern ?? null;

  return `// Generated arch guard stub for ${rule.id}
export const ruleId = ${JSON.stringify(rule.id)};
export const domain = ${JSON.stringify(domain)};
export const severity = ${JSON.stringify(severity)};
export const pattern = ${pattern ? JSON.stringify(pattern) : 'null'};
export const summary = ${JSON.stringify({
    basis: rule.basis,
    vector: rule.vector,
    goal: rule.goal,
  }, null, 2)};

export function guardPlaceholder() {
  return {
    status: 'stub',
    ruleId,
    message: 'Wire arch guard scanner in sidecar or CI optional gate.',
  };
}
`;
}

export function buildScaffoldManifest(summary, filesWritten) {
  return {
    schema: LOWCODE_SCAFFOLD_MANIFEST_SCHEMA,
    charterPath: summary.charterPath,
    outputDir: summary.outputDir,
    generatedAt: summary.generatedAt,
    ruleCount: summary.ruleCount,
    rules: summary.rules,
    filesWritten,
  };
}

export async function writeArchRulesScaffold(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const charterPath = resolve(cwd, options.charterPath ?? DEFAULT_ARCH_RULES_PATH);
  const outputDir = resolve(cwd, options.outputDir ?? DEFAULT_SCAFFOLD_OUTPUT_DIR);
  const dryRun = options.dryRun === true;
  const charterText = options.charterText ?? await readFile(charterPath, 'utf8');
  const parsed = parseArchRulesStepText(charterText);

  const summary = buildArchRulesScaffoldSummary({
    charterPath: relative(cwd, charterPath).replace(/\\/g, '/'),
    outputDir: relative(cwd, outputDir).replace(/\\/g, '/'),
    parsed,
    generatedAt: options.generatedAt,
  });

  if (!parsed.ok) {
    return {
      ok: false,
      summary,
      manifest: null,
      filesWritten: [],
      errors: parsed.errors,
    };
  }

  const filesWritten = [];
  const plannedFiles = [];

  for (const rule of parsed.rules) {
    const stubName = `${rule.id}.guard.stub.mjs`;
    plannedFiles.push({
      relativePath: `rules/${stubName}`,
      contents: buildArchRuleStubModule(rule),
    });
  }

  plannedFiles.push({
    relativePath: 'README.md',
    contents: buildScaffoldReadme(summary, parsed.rules),
  });

  if (dryRun) {
    return {
      ok: true,
      summary,
      manifest: buildScaffoldManifest(summary, plannedFiles.map((file) => file.relativePath)),
      filesWritten: plannedFiles.map((file) => file.relativePath),
      errors: [],
      dryRun: true,
    };
  }

  await mkdir(outputDir, { recursive: true });
  await mkdir(resolve(outputDir, 'rules'), { recursive: true });

  for (const file of plannedFiles) {
    const absolutePath = resolve(outputDir, file.relativePath);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, file.contents, 'utf8');
    filesWritten.push(relative(cwd, absolutePath).replace(/\\/g, '/'));
  }

  const manifest = buildScaffoldManifest(summary, filesWritten);
  const manifestPath = resolve(outputDir, 'manifest.json');
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  filesWritten.push(relative(cwd, manifestPath).replace(/\\/g, '/'));

  return {
    ok: true,
    summary,
    manifest,
    filesWritten,
    errors: [],
    dryRun: false,
  };
}

function buildScaffoldReadme(summary, rules) {
  const lines = [
    '# Arch rules scaffold (Work Graph low-code MVP)',
    '',
    `Charter: \`${summary.charterPath}\``,
    `Generated: ${summary.generatedAt}`,
    `Rules: ${summary.ruleCount}`,
    '',
    'This directory is a deterministic stub scaffold. Full TurIr/Handlebars generation remains deferred to ../project until sidecar boundary closes.',
    '',
    '## Rules',
    '',
    ...rules.map((rule) => `- \`${rule.id}\` (${rule.metadata.domain ?? 'unknown'} / ${rule.metadata.severity ?? 'unknown'})`),
    '',
  ];

  return `${lines.join('\n')}\n`;
}

export async function validateArchRulesCharter(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const charterPath = resolve(cwd, options.charterPath ?? DEFAULT_ARCH_RULES_PATH);

  try {
    const charterText = await readFile(charterPath, 'utf8');
    const parsed = parseArchRulesStepText(charterText);

    return {
      ok: parsed.ok,
      charterPath: relative(cwd, charterPath).replace(/\\/g, '/'),
      ruleCount: parsed.rules.length,
      errors: parsed.errors,
    };
  } catch (error) {
    return {
      ok: false,
      charterPath: relative(cwd, charterPath).replace(/\\/g, '/'),
      ruleCount: 0,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

export async function runLowcodeVerify(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const charterPath = options.charterPath ?? DEFAULT_ARCH_RULES_PATH;
  const charterValidation = await validateArchRulesCharter({ cwd, charterPath });

  if (!charterValidation.ok) {
    return {
      ok: false,
      schema: 'workgraph.lowcode.verify.v1',
      charter: charterValidation,
      scaffoldDryRun: null,
      errors: charterValidation.errors,
    };
  }

  const charterText = await readFile(resolve(cwd, charterPath), 'utf8');
  const scaffoldDryRun = await writeArchRulesScaffold({
    cwd,
    charterPath,
    charterText,
    dryRun: true,
    outputDir: options.outputDir ?? DEFAULT_SCAFFOLD_OUTPUT_DIR,
    generatedAt: options.generatedAt,
  });

  const ok = scaffoldDryRun.ok;
  const errors = ok ? [] : [...charterValidation.errors, ...scaffoldDryRun.errors];

  return {
    ok,
    schema: 'workgraph.lowcode.verify.v1',
    charter: charterValidation,
    scaffoldDryRun: {
      ok: scaffoldDryRun.ok,
      ruleCount: scaffoldDryRun.summary.ruleCount,
      filesPlanned: scaffoldDryRun.filesWritten,
    },
    errors,
  };
}

export function parseLowcodeCliArgs(argv) {
  const options = {
    charterPath: DEFAULT_ARCH_RULES_PATH,
    outputDir: DEFAULT_SCAFFOLD_OUTPUT_DIR,
    dryRun: false,
    json: false,
    command: 'scaffold',
  };

  const args = [...argv];

  if (args[0] === 'verify') {
    options.command = 'verify';
    args.shift();
  }

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === '--charter' && args[index + 1]) {
      options.charterPath = args[++index];
      continue;
    }

    if (token === '--output' && args[index + 1]) {
      options.outputDir = args[++index];
      continue;
    }

    if (token === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (token === '--json') {
      options.json = true;
      continue;
    }
  }

  return options;
}

function normalizeRepoPath(value) {
  return String(value).replace(/\\/g, '/');
}
