#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const TASKS = [
  {
    path: 'intent/ui/dashboard/work/wire-icon-asset-pipeline.work.bvc',
    evidence: 'src/ui/iconAssets.mjs + tryServePublicIconsAsset /assets/icons/*',
  },
  {
    path: 'intent/ui/dashboard/work/wire-sidebar-nav-icons.work.bvc',
    evidence: 'renderNavTab labelHtml with nav-tab-icon for all sidebar views',
  },
  {
    path: 'intent/ui/dashboard/work/wire-header-theme-toggle-phosphor-icons.work.bvc',
    evidence: 'renderThemeIcon moon/sun + applyTheme THEME_ICON_* from SSR',
  },
  {
    path: 'intent/ui/dashboard/work/write-closing-epic-work-graph-ui-icons-v1.work.bvc',
    evidence: 'work/analytics/closing-epic-work-graph-ui-icons-v1.md',
  },
  {
    path: 'intent/ui/dashboard/work/epic-work-graph-ui-icons-v1.work.bvc',
    evidence: '4/4 subtasks done; closing-epic-work-graph-ui-icons-v1.md',
  },
];

async function markDone(relativePath, evidence) {
  const filePath = join(process.cwd(), relativePath);
  let text = await readFile(filePath, 'utf8');

  if (!text.includes('Свидетельства:')) {
    text = text.replace(
      /\nМетки:\n/u,
      `\nСвидетельства:\n  - ${evidence}\n\nМетки:\n`,
    );
  } else if (!text.includes(evidence)) {
    text = text.replace(/(Свидетельства:\n(?:  - .+\n)*)/u, `$1  - ${evidence}\n`);
  }

  text = text.replace(/  work\.status: backlog\n/gu, '  work.status: done\n');
  text = text.replace(/  trace\.status: pending\n/gu, '  trace.status: verified\n');
  text = text.replace(/  work\.next_action: просмотреть и перевести в ready\n/gu, '  work.next_action: —\n');

  await writeFile(filePath, text, 'utf8');
  const workId = text.match(/work\.id: ([^\n]+)/u)?.[1]?.trim();
  console.log(`done ${workId ?? relativePath}`);
}

for (const task of TASKS) {
  await markDone(task.path, task.evidence);
}
