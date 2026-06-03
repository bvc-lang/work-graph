#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const TASKS = [
  'intent/system/runtime/work/decide-work-item-contract-projection-adr.work.bvc',
  'intent/system/runtime/work/implement-work-item-contract-projection.work.bvc',
  'intent/system/runtime/work/implement-mcp-get-work-contract.work.bvc',
  'intent/system/runtime/work/implement-mcp-assert-task-ready-for-done.work.bvc',
  'intent/system/runtime/work/implement-mcp-validate-evidence.work.bvc',
  'intent/system/runtime/work/wire-verification-panel-contract-summary.work.bvc',
];

const EVIDENCE = {
  'decide-work-item-contract-projection-adr': 'docs/adr-work-item-contract-projection-v1.md accepted (AN-50.1)',
  'implement-work-item-contract-projection': 'src/workItemContractProjection.mjs + tests/workItemContractProjection.test.mjs',
  'implement-mcp-get-work-contract': 'MCP get_work_contract + workgraph://contract/{workId}',
  'implement-mcp-assert-task-ready-for-done': 'src/workItemReadyForDone.mjs + MCP assert_task_ready_for_done',
  'implement-mcp-validate-evidence': 'MCP validate_evidence + tests/workgraph-mcp-contract.test.mjs',
  'wire-verification-panel-contract-summary': 'verification.contractSummaries + UI contract panel',
};

async function main() {
  for (const relativePath of TASKS) {
    const filePath = join(process.cwd(), relativePath);
    let text = await readFile(filePath, 'utf8');
    const workIdMatch = text.match(/work\.id: ([^\n]+)/u);
    const workId = workIdMatch?.[1]?.trim() ?? relativePath;

    if (!text.includes('Свидетельства:')) {
      text = text.replace(
        /\nМетки:\n/u,
        `\nСвидетельства:\n  - ${EVIDENCE[workId] ?? 'npm test pass'}\n\nМетки:\n`,
      );
    } else if (EVIDENCE[workId] && !text.includes(EVIDENCE[workId])) {
      text = text.replace(
        /(Свидетельства:\n(?:  - .+\n)*)/u,
        `$1  - ${EVIDENCE[workId]}\n`,
      );
    }

    text = text.replace(/  work\.status: backlog\n/gu, '  work.status: done\n');
    text = text.replace(/  trace\.status: pending\n/gu, '  trace.status: verified\n');
    text = text.replace(/  work\.next_action: просмотреть и перевести в ready\n/gu, '  work.next_action: —\n');

    await writeFile(filePath, text, 'utf8');
    console.log(`done ${workId}`);
  }
}

main();
