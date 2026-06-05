import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { evaluateCanonWriteDiff } from './workGraphWriteAudit.mjs';

const CANON_WORK_ITEM_PATH = /^(?:intent\/(.+\/)?work\/|\.work-graph\/canon\/(.+\/)?work\/).+\.work\.bvc$/u;

export function isCanonWorkItemRelativePath(relativePath) {
  return CANON_WORK_ITEM_PATH.test(String(relativePath ?? '').replace(/\\/g, '/'));
}

export function listGitChangedPaths(cwd, { includeUntracked = false } = {}) {
  const paths = new Set();

  for (const args of [
    ['diff', '--name-only', '--diff-filter=ACMR', 'HEAD'],
    ['diff', '--cached', '--name-only', '--diff-filter=ACMR'],
  ]) {
    try {
      const output = execFileSync('git', args, {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      for (const line of output.split(/\r?\n/u)) {
        const trimmed = line.trim();
        if (trimmed !== '') {
          paths.add(trimmed.replace(/\\/g, '/'));
        }
      }
    } catch {
      // Not a git repo or git unavailable — caller may pass explicit paths.
    }
  }

  if (includeUntracked) {
    try {
      const output = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      for (const line of output.split(/\r?\n/u)) {
        const trimmed = line.trim();
        if (trimmed !== '') {
          paths.add(trimmed.replace(/\\/g, '/'));
        }
      }
    } catch {
      // ignore
    }
  }

  return [...paths].filter(isCanonWorkItemRelativePath).sort();
}

export async function lintCanonWriteBoundary(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const includeUntracked = options.includeUntracked === true;
  const paths = Array.isArray(options.paths) && options.paths.length > 0
    ? options.paths.map((entry) => String(entry).replace(/\\/g, '/'))
    : listGitChangedPaths(cwd, { includeUntracked });

  const violations = [];

  for (const relativePath of paths) {
    if (!isCanonWorkItemRelativePath(relativePath)) {
      continue;
    }

    const absolutePath = join(cwd, relativePath);
    let fileText = '';
    try {
      fileText = await readFile(absolutePath, 'utf8');
    } catch (error) {
      if (error && typeof error === 'object' && error.code === 'ENOENT') {
        continue;
      }
      throw error;
    }

    let patchText = '';
    let isNewFile = false;

    try {
      patchText = execFileSync('git', ['diff', '--no-color', 'HEAD', '--', relativePath], {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      if (patchText.trim() === '') {
        patchText = execFileSync('git', ['diff', '--no-color', '--cached', '--', relativePath], {
          cwd,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        });
      }
    } catch {
      patchText = '';
    }

    if (patchText.trim() === '') {
      try {
        execFileSync('git', ['ls-files', '--error-unmatch', relativePath], {
          cwd,
          stdio: 'ignore',
        });
      } catch {
        isNewFile = true;
        patchText = fileText.split(/\r?\n/u).map((line) => `+${line}`).join('\n');
      }
    }

    const result = evaluateCanonWriteDiff({
      path: relativePath,
      patchText,
      fileText,
      isNewFile,
    });

    if (!result.ok) {
      violations.push(result);
    }
  }

  return {
    ok: violations.length === 0,
    checkedPaths: paths,
    violationCount: violations.length,
    violations,
  };
}

export function formatCanonWriteBoundaryReport(report) {
  const lines = [
    `canon write-boundary lint: ${report.ok ? 'ok' : 'failed'} (${report.checkedPaths.length} path(s) checked)`,
  ];

  for (const violation of report.violations) {
    lines.push(`- [${violation.code}] ${violation.path}: ${violation.message}`);
    if (violation.fix) {
      lines.push(`  fix: ${violation.fix}`);
    }
  }

  return lines.join('\n');
}
