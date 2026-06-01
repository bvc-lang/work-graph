import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import { readWorkItemAtomFromRepo, readWorkItemsFromIntentTree } from '../src/intentTreeWorkItems.mjs';

const DONE_STATUSES = new Set(['done', 'verified']);

function patchTraceStatus(text, nextStatus = 'verified') {
  if (!text.includes('trace.status: pending')) {
    return text;
  }

  return text.replace(/trace\.status:\s*pending/gu, `trace.status: ${nextStatus}`);
}

export async function backfillTraceStatusVerified(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const items = options.items ?? await readWorkItemsFromIntentTree({ cwd });
  const candidates = items.filter(
    (item) => DONE_STATUSES.has(item.status) && String(item.labels?.['trace.status'] ?? '').trim() === 'pending',
  );
  const patched = [];

  for (const item of candidates) {
    const atom = await readWorkItemAtomFromRepo(item.id, { cwd });
    const nextText = patchTraceStatus(atom.text);
    if (nextText === atom.text) {
      continue;
    }

    await writeFile(atom.path, nextText, 'utf8');
    patched.push({ workId: item.id, path: atom.relativePath ?? atom.path });
  }

  return {
    schema: 'workgraph.trace-status.backfill.v1',
    candidateCount: candidates.length,
    patchedCount: patched.length,
    patched,
  };
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = await backfillTraceStatusVerified();
  console.log(`trace.status backfill: patched ${report.patchedCount}/${report.candidateCount}`);
  for (const entry of report.patched) {
    console.log(`  ${entry.workId} → ${entry.path}`);
  }
}
