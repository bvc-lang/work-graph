import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

export const CODE_GAP_REPORT_SCHEMA = 'code-gap.report.v1';

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'coverage',
  'out',
  'build',
  '.vite',
  'vendor',
]);

const STEP_BLOCK_PATTERN = /^#([^\n<]+)<\[\n([\s\S]*?)\n\]>/gmu;
const LINK_MODE_RE = /(?:^|\n)\s*(?:compiler\.mode|mode):\s*link\s*(?:\n|$)/iu;
const GUID_LABEL_RE = /(?:^|\n)\s*guid:\s*([a-fA-F0-9-]{8}-[a-fA-F0-9-]{4}-[a-fA-F0-9-]{4}-[a-fA-F0-9-]{4}-[a-fA-F0-9-]{12})/iu;
const TUR_ID_LABEL_RE = /(?:^|\n)\s*tur_id:\s*([A-Za-z0-9_.-]+)/iu;
const EXPORT_PATTERN = /^\s*export\s+(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gmu;

function posixRel(root, absPath) {
  return relative(root, absPath).replace(/\\/g, '/');
}

function walkFiles(absDir, predicate, out = []) {
  if (!existsSync(absDir)) {
    return out;
  }

  for (const entry of readdirSync(absDir, { withFileTypes: true })) {
    const entryPath = join(absDir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) {
        continue;
      }
      walkFiles(entryPath, predicate, out);
      continue;
    }

    if (entry.isFile() && predicate(entry.name)) {
      out.push(entryPath);
    }
  }

  return out;
}

export function collectStepFilePaths(repoRoot, relDirs) {
  const out = [];
  for (const relDir of relDirs) {
    walkFiles(join(repoRoot, relDir), (name) => name.endsWith('.bvc'), out);
  }

  return out.sort();
}

export function collectCodeFilePaths(repoRoot, relDirs) {
  const out = [];
  for (const relDir of relDirs) {
    walkFiles(
      join(repoRoot, relDir),
      (name) => /\.(mjs|cjs|js|ts|mts)$/u.test(name) && !/\.(test|spec)\.[cm]?[jt]s$/iu.test(name),
      out,
    );
  }

  return out.sort();
}

function extractStepBlocks(text) {
  return [...text.matchAll(STEP_BLOCK_PATTERN)].map((match) => ({
    name: match[1].trim(),
    body: match[2],
  }));
}

function parseLinkSteps(stepAbsPaths, repoRoot) {
  const linkSteps = [];

  for (const absPath of stepAbsPaths) {
    let text;
    try {
      text = readFileSync(absPath, 'utf8');
    } catch {
      continue;
    }

    for (const block of extractStepBlocks(text)) {
      if (!LINK_MODE_RE.test(block.body)) {
        continue;
      }

      linkSteps.push({
        stepName: block.name,
        stepGuid: block.body.match(GUID_LABEL_RE)?.[1] ?? '',
        stepFile: posixRel(repoRoot, absPath),
        stepTurId: block.body.match(TUR_ID_LABEL_RE)?.[1] ?? block.name,
      });
    }
  }

  return linkSteps;
}

function collectStepNames(stepAbsPaths) {
  const names = new Set();
  for (const absPath of stepAbsPaths) {
    try {
      for (const block of extractStepBlocks(readFileSync(absPath, 'utf8'))) {
        names.add(block.name);
      }
    } catch {
      continue;
    }
  }

  return names;
}

function scanTurImplementations(codeAbsPaths, repoRoot) {
  const implementations = [];

  for (const absPath of codeAbsPaths) {
    let text;
    try {
      text = readFileSync(absPath, 'utf8');
    } catch {
      continue;
    }

    const lines = text.split(/\r?\n/u);
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const turMatch = lines[lineIndex].match(/@iohasc-tur:\s*([A-Za-z0-9_.-]+)/u);
      if (!turMatch) {
        continue;
      }

      const stepGuidMatch = lines.slice(lineIndex, lineIndex + 6).join('\n').match(
        /@iohasc-step:\s*([a-fA-F0-9-]{8}-[a-fA-F0-9-]{4}-[a-fA-F0-9-]{4}-[a-fA-F0-9-]{4}-[a-fA-F0-9-]{12})/iu,
      );

      const fnMatch = lines.slice(lineIndex, lineIndex + 4).join('\n').match(/(?:function|const)\s+([A-Za-z_$][\w$]*)/u);

      implementations.push({
        turId: turMatch[1],
        stepGuid: stepGuidMatch?.[1] ?? '',
        filePath: posixRel(repoRoot, absPath),
        lineNumber: lineIndex + 1,
        functionName: fnMatch?.[1] ?? turMatch[1],
      });
    }
  }

  return implementations;
}

function listExportedSymbols(text) {
  const symbols = new Set();
  for (const match of text.matchAll(EXPORT_PATTERN)) {
    symbols.add(match[1]);
  }

  return [...symbols];
}

function shouldSkipUntrackedSymbol(name) {
  return !name || name.startsWith('_');
}

export function analyzeCodeGaps(options = {}) {
  const repoRoot = String(options.repoRoot ?? process.cwd()).replace(/\\/g, '/').replace(/\/+$/, '');
  const codeRelDirs = options.codeRelDirs?.length ? options.codeRelDirs : ['src'];
  const stepRelDirs = options.stepSearchRelDirs?.length
    ? options.stepSearchRelDirs
    : ['steps', 'charter', 'protocols', 'intent'];

  const stepFiles = collectStepFilePaths(repoRoot, stepRelDirs);
  const codeFiles = collectCodeFilePaths(repoRoot, codeRelDirs);
  const linkSteps = parseLinkSteps(stepFiles, repoRoot);
  const stepNames = collectStepNames(stepFiles);
  const implementations = scanTurImplementations(codeFiles, repoRoot);

  const implByGuid = new Map(
    implementations
      .filter((entry) => entry.stepGuid)
      .map((entry) => [entry.stepGuid, entry]),
  );
  const implTurIds = new Set(implementations.map((entry) => entry.turId));
  const implFunctionNames = new Set(implementations.map((entry) => entry.functionName));

  const entries = [];

  for (const linkStep of linkSteps) {
    if (!implByGuid.has(linkStep.stepGuid)) {
      entries.push({
        kind: 'missing_implementation',
        filePath: linkStep.stepFile,
        stepGuid: linkStep.stepGuid,
        reason: `Link step «${linkStep.stepName}» without @iohasc-tur implementation (guid ${linkStep.stepGuid}).`,
      });
    }
  }

  for (const impl of implementations) {
    const linked = linkSteps.some((step) => step.stepGuid === impl.stepGuid);
    if (!linked) {
      entries.push({
        kind: 'orphaned_tur',
        filePath: impl.filePath,
        symbol: impl.functionName,
        line: impl.lineNumber,
        turId: impl.turId,
        stepGuid: impl.stepGuid,
        reason: `@iohasc-tur «${impl.turId}» is not linked to a link-mode .bvc block.`,
      });
    }

    const linkedStep = linkSteps.find((step) => step.stepGuid === impl.stepGuid);
    if (linkedStep && linkedStep.stepTurId && linkedStep.stepTurId !== impl.turId) {
      entries.push({
        kind: 'tur_id_mismatch',
        filePath: impl.filePath,
        symbol: impl.functionName,
        line: impl.lineNumber,
        turId: impl.turId,
        stepGuid: impl.stepGuid,
        reason: `tur_id «${linkedStep.stepTurId}» in step ≠ @iohasc-tur «${impl.turId}».`,
      });
    }
  }

  for (const absPath of codeFiles) {
    let text;
    try {
      text = readFileSync(absPath, 'utf8');
    } catch {
      continue;
    }

    const rel = posixRel(repoRoot, absPath);
    for (const symbol of listExportedSymbols(text)) {
      if (shouldSkipUntrackedSymbol(symbol)) {
        continue;
      }

      if (stepNames.has(symbol) || implTurIds.has(symbol) || implFunctionNames.has(symbol)) {
        continue;
      }

      entries.push({
        kind: 'untracked_export',
        filePath: rel,
        symbol,
        reason: 'Export is not covered by step block name or known @iohasc-tur marker.',
      });
    }
  }

  entries.sort((left, right) => {
    const kind = left.kind.localeCompare(right.kind);
    if (kind !== 0) {
      return kind;
    }

    return `${left.filePath}:${left.symbol ?? ''}`.localeCompare(`${right.filePath}:${right.symbol ?? ''}`);
  });

  const summary = {
    total: entries.length,
    untrackedExports: entries.filter((entry) => entry.kind === 'untracked_export').length,
    missingImplementation: entries.filter((entry) => entry.kind === 'missing_implementation').length,
    orphanedTur: entries.filter((entry) => entry.kind === 'orphaned_tur').length,
    turIdMismatch: entries.filter((entry) => entry.kind === 'tur_id_mismatch').length,
  };

  return {
    schema: CODE_GAP_REPORT_SCHEMA,
    summary,
    entries,
    tur: {
      linkStepCount: linkSteps.length,
      implementationCount: implementations.length,
    },
  };
}

export function formatCodeGapReportMarkdown(report) {
  const lines = [
    '## Code gap',
    '',
    `- missing_implementation: **${report.summary.missingImplementation}**`,
    `- orphaned_tur: **${report.summary.orphanedTur}**`,
    `- tur_id_mismatch: **${report.summary.turIdMismatch}**`,
    `- untracked_export: **${report.summary.untrackedExports}**`,
    `- **total entries:** ${report.summary.total}`,
    '',
  ];

  for (const entry of report.entries) {
    const location = entry.line != null ? `${entry.filePath}:${entry.line}` : entry.filePath;
    const symbol = entry.symbol ? ` \`${entry.symbol}\`` : '';
    lines.push(`- **${entry.kind}**${symbol} — ${location}: ${entry.reason}`);
  }

  return lines.join('\n');
}
