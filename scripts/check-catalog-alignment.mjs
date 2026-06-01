import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  buildAndValidateCatalogPassportAlignment,
} from '../src/intentHierarchy.mjs';
import { parseIntentIndexEntries } from '../src/intentTreeWorkItems.mjs';
import { parseWorkItems } from '../src/workGraphRuntime.mjs';

export async function checkCatalogPassportAlignment(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const indexPath = options.indexPath ?? 'intent/index.bvc';
  const indexText = options.indexText ?? await readFile(join(cwd, indexPath), 'utf8');
  const indexEntries = parseIntentIndexEntries(indexText);
  const entries = [];

  for (const entry of indexEntries) {
    let text;
    try {
      text = options.itemTexts?.[entry.path]
        ?? await readFile(join(cwd, entry.path), 'utf8');
    } catch (error) {
      if (error && typeof error === 'object' && error.code === 'ENOENT') {
        return {
          ok: false,
          errors: [`intent file missing for ${entry.id}: ${entry.path}`],
          mappingCount: 0,
        };
      }

      throw error;
    }

    const [item] = parseWorkItems(text);
    if (!item) {
      return {
        ok: false,
        errors: [`failed to parse WorkItem atom: ${entry.path}`],
        mappingCount: 0,
      };
    }

    entries.push({ item, path: entry.path });
  }

  const { alignment, validation } = await buildAndValidateCatalogPassportAlignment(entries, {
    cwd,
    indexEntries,
    catalogIndexPath: options.catalogIndexPath,
  });

  return {
    ok: validation.ok,
    schema: 'catalog-passport.intent-alignment.check.v1',
    indexPath,
    mappingCount: alignment.mappings.length,
    alignment,
    validation,
    errors: validation.errors,
  };
}

export function formatCatalogAlignmentReport(report) {
  const lines = [
    `catalog/passport alignment: ${report.ok ? 'ok' : 'failed'}`,
    `index: ${report.indexPath} (${report.mappingCount} mappings)`,
  ];

  if (report.errors.length > 0) {
    lines.push('errors:');
    for (const error of report.errors) {
      lines.push(`  - ${error}`);
    }
  }

  return lines.join('\n');
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const indexFlagIndex = process.argv.indexOf('--index');
  const report = await checkCatalogPassportAlignment({
    indexPath: indexFlagIndex === -1 ? undefined : process.argv[indexFlagIndex + 1],
  });

  console.log(formatCatalogAlignmentReport(report));
  if (!report.ok) {
    process.exitCode = 1;
  }
}
