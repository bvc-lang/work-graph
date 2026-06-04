import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const PVRG_CORE_SCAN_ADAPTER_SCHEMA = 'pvrg.core.scan.adapter.v1';

function normalizeSymbol(symbol = {}) {
  return {
    name: String(symbol.name ?? symbol.id ?? 'unknown'),
    kind: String(symbol.kind ?? 'symbol'),
    line: Number.isFinite(symbol.line) ? symbol.line : null,
    path: String(symbol.path ?? symbol.file ?? ''),
  };
}

export function parsePvrgCoreScanOutput(raw) {
  const payload = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!payload || typeof payload !== 'object') {
    throw new TypeError('scan output must be an object');
  }

  const files = Array.isArray(payload.files) ? payload.files : [];
  const symbols = Array.isArray(payload.symbols) ? payload.symbols : [];

  return {
    schema: payload.schema ?? 'pvrg.core.scan.v1',
    root: String(payload.root ?? ''),
    files: files.map((file) => ({
      path: String(file.path ?? file.file ?? ''),
      language: String(file.language ?? 'unknown'),
      symbolCount: Number.isFinite(file.symbolCount) ? file.symbolCount : 0,
    })),
    symbols: symbols.map(normalizeSymbol),
  };
}

export function buildAdapterFactsFromScan(scan, options = {}) {
  const workId = String(options.workId ?? '').trim();
  const facts = [];

  for (const file of scan.files) {
    if (!file.path) {
      continue;
    }

    const fileSymbols = scan.symbols.filter((symbol) =>
      symbol.path === file.path || symbol.path.endsWith(file.path),
    );

    facts.push({
      schema: 'workgraph.language-file-facts.v1',
      filePath: file.path,
      adapterId: 'pvrg-core-scan',
      languageId: file.language,
      status: 'ok',
      confidence: 'high',
      symbols: fileSymbols.map((symbol) => ({
        name: symbol.name,
        kind: symbol.kind,
        line: symbol.line,
      })),
      imports: [],
      domainMetadata: workId ? { workId } : {},
      source: 'pvrg-core-scanner',
    });
  }

  return {
    schema: PVRG_CORE_SCAN_ADAPTER_SCHEMA,
    workId: workId || null,
    facts,
    summary: {
      fileCount: facts.length,
      symbolCount: scan.symbols.length,
    },
  };
}

export async function loadPvrgCoreScanFromPath(scanPath, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const absolutePath = resolve(cwd, scanPath);
  const text = options.scanText ?? await readFile(absolutePath, 'utf8');
  const scan = parsePvrgCoreScanOutput(text);
  return buildAdapterFactsFromScan(scan, options);
}

export function mergePvrgScanFactsWithBatch(batch, adapterResult) {
  const existing = Array.isArray(batch?.facts) ? batch.facts : [];
  const merged = [...existing];

  for (const fact of adapterResult.facts) {
    const index = merged.findIndex((entry) => entry.filePath === fact.filePath);
    if (index >= 0) {
      merged[index] = {
        ...merged[index],
        symbols: [...(merged[index].symbols ?? []), ...(fact.symbols ?? [])],
        domainMetadata: { ...(merged[index].domainMetadata ?? {}), ...(fact.domainMetadata ?? {}) },
        source: fact.source,
      };
    } else {
      merged.push(fact);
    }
  }

  return {
    schema: batch?.schema ?? 'workgraph.language-file-facts.batch.v1',
    facts: merged,
    summary: {
      total: merged.length,
      degraded: merged.filter((fact) => fact.status === 'degraded').length,
      languages: [...new Set(merged.map((fact) => fact.languageId))].sort(),
      pvrgCoreAugmented: adapterResult.facts.length,
    },
  };
}
