#!/usr/bin/env node
/**
 * Генерирует src/workItemTitleRuCatalog.mjs — канон русских work.title для всех WorkItem.
 */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BACKLOG_ITEMS } from './all-phases-backlog-items.mjs';
import { readWorkItemAtomFromRepo, readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { parseWorkItems } from '../src/workGraphRuntime.mjs';
import {
  NEXT_ACTION_MAP,
  TITLE_OVERRIDES,
  buildTitleFromWorkId,
  pickBestTitle,
  rusifyLine,
} from '../src/workItemTextRusify.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

async function loadSeedTitles() {
  const map = new Map();
  const scriptsDir = join(repoRoot, 'scripts');
  const files = (await readdir(scriptsDir)).filter((name) => name.startsWith('seed') && name.endsWith('.mjs'));
  const pairRe = /workId:\s*['"]([^'"]+)['"][\s\S]{0,600}?title:\s*['"]([^'"]+)['"]/g;

  for (const file of files) {
    const text = await readFile(join(scriptsDir, file), 'utf8');
    for (const match of text.matchAll(pairRe)) {
      map.set(match[1], match[2]);
    }
  }

  for (const item of BACKLOG_ITEMS) {
    if (item.workId && item.title) {
      map.set(item.workId, item.title);
    }
  }

  return map;
}

const SEED_TITLE_EXACT_RU = {
  'Implement UI locale resolution (cookie + Accept-Language)': 'Реализовать выбор локали UI (cookie + Accept-Language)',
  'Implement ICU UI message catalog + t() helper': 'Реализовать каталог UI-сообщений ICU + t()',
  'Extract backlog shell strings to UI catalog (nav, theme, close)': 'Вынести строки shell бэkлога в UI catalog',
  'Extract kanban and workflow list labels to UI catalog': 'Вынести подписи kanban и workflow в UI catalog',
  'Atom inspector: dialect-aware section titles (AN-20 B11)': 'Atom inspector: заголовки секций с учётом dialect (AN-20 B11)',
  'Extract detail drawer + verification + analytics chrome i18n': 'Вынести i18n detail drawer, verification и analytics chrome',
  'Add pseudolocalization locale + CI key-parity guard': 'Добавить pseudolocale + CI guard паритета ключей',
  'Closing: epic-work-graph-ui-i18n-v1 (AN-55)': 'Закрыть разбор после эпика i18n UI (AN-55)',
  'ADR: Work Graph UI i18n — locale policy and BVC boundary': 'ADR: i18n UI Work Graph — политика locale и граница BVC',
  'Work Graph UI i18n v1: EN + RU chrome via ICU catalogs (AN-55)': 'i18n UI Work Graph v1: chrome EN+RU через ICU catalogs (AN-55)',
  'Work Graph UI realtime v1: live kanban + revision sync (AN-56)': 'Realtime UI Work Graph v1: live kanban + sync revision (AN-56)',
  'UI Settings v1: sidebar Настройки, header theme, язык, версия (AN-55)': 'Настройки UI v1: sidebar, тема, язык, версия (AN-55)',
  'Kanban incremental patcher (delta → DOM move)': 'Kanban: инкрементальный патч (delta → DOM move)',
  'Client: view-scoped live sync coordinator': 'Клиент: координатор live-sync по активному view',
  'Chat work scope (read-only): информативность без TodoWrite sync': 'Scope чата (read-only): без sync TodoWrite',
  'Agent Work Graph enforcement: единый бэклог, без обхода через chat todo': 'Контроль Work Graph: единый бэkлог без chat todo',
  'Few-shot примеры Work Graph в ioHasC (claim→evidence, русский)': 'Few-shot Work Graph в ioHasC (claim → evidence, русский)',
  'Eval fixture: Cursor MCP usefulness (rules + primer path)': 'Eval-фикстура полезности Cursor MCP',
};

function cyrillicScore(text) {
  return (String(text ?? '').match(/[\u0400-\u04FF]/g) ?? []).length;
}

function latinScore(text) {
  return (String(text ?? '').match(/[A-Za-z]/g) ?? []).length;
}

function translateSeedTitle(title, workId) {
  const raw = String(title ?? '').trim();
  if (!raw) return '';
  if (SEED_TITLE_EXACT_RU[raw]) return SEED_TITLE_EXACT_RU[raw];
  return rusifyLine(raw);
}

function normalizeGoalText(goal) {
  if (Array.isArray(goal)) {
    return goal.join(' ').trim();
  }
  return String(goal ?? '').trim();
}

function titleFromGoal(goal) {
  const raw = normalizeGoalText(goal);
  if (!raw || cyrillicScore(raw) < 6) return '';

  let title = raw.split(/\n/)[0].split(/[.;](?=\s+[А-ЯA-Z«])/u)[0].trim();
  const prefixMap = [
    [/^Пользователь может /iu, ''],
    [/^Оператор видит /iu, ''],
    [/^Оператор может /iu, ''],
    [/^Агент /iu, ''],
    [/^Cursor(?: IDE)? agent(?: получает)? /iu, 'Cursor: '],
    [/^Единый канон /iu, 'Канон '],
    [/^Governance-слой для /iu, 'Governance: '],
    [/^Нет противоречивых /iu, 'Устранить противоречия: '],
    [/^Existing code можно /iu, 'Code-gap feeder: '],
    [/^Project Memory становится /iu, 'Project Memory: '],
    [/^UI может отрисовать /iu, 'UI: '],
    [/^Work Graph может объяснить /iu, 'Evidence model: '],
    [/^GFS остаётся полезным /iu, 'GFS overlay: '],
    [/^Определить memory extraction loop /iu, 'Memory extraction loop: '],
    [/^System prompt ioHasC\/Cursor /iu, 'Few-shot в system prompt: '],
    [/^Layout overflow from longer strings caught in deterministic tests\.?$/iu, 'Pseudolocale + CI: ловить overflow от длинных строк'],
    [/^Step discovery и бэклог routing используют один consistent identity layer\.?$/iu, 'Согласовать catalog passport с intent-графом'],
    [/^Leaf-задачи можно фильтровать /iu, 'Метки migration.strategy для leaf-задач'],
    [/^MCP /iu, 'MCP: '],
  ];
  for (const [pattern, repl] of prefixMap) {
    title = title.replace(pattern, repl);
  }

  if (title.length > 110) {
    title = `${title.slice(0, 107).trim()}…`;
  }

  if (cyrillicScore(title) < 5) return '';
  return title.charAt(0).toUpperCase() + title.slice(1);
}

function titleFromWorkIdPattern(workId) {
  if (workId.startsWith('write-closing-epic-')) {
    const slug = workId.slice('write-closing-epic-'.length);
    return `Закрыть разбор после эпика ${slug.replace(/-/g, ' ')}`;
  }
  if (workId.startsWith('write-an') && workId.includes('closing')) {
    const m = workId.match(/^write-(an[\d.]+)-closing[-_]?(.+)$/i);
    if (m) {
      return `Закрыть разбор ${m[1].toUpperCase()}: ${m[2].replace(/-/g, ' ')}`;
    }
  }
  if (workId.startsWith('decide-') && workId.endsWith('-adr')) {
    const topic = workId.slice('decide-'.length, -'-adr'.length).replace(/-/g, ' ');
    return `ADR: ${topic}`;
  }
  return '';
}

function resolveTitle(workId, { seedTitle, goal, currentTitle }) {
  if (TITLE_OVERRIDES[workId]) {
    return TITLE_OVERRIDES[workId];
  }

  const candidates = [];
  if (NEXT_ACTION_MAP[workId]) {
    const mapped = NEXT_ACTION_MAP[workId];
    candidates.push(mapped.charAt(0).toUpperCase() + mapped.slice(1));
  }
  if (seedTitle) {
    candidates.push(translateSeedTitle(seedTitle, workId));
  }
  const goalTitle = titleFromGoal(goal);
  if (goalTitle && (!seedTitle || goalTitle.length <= 90)) {
    candidates.push(goalTitle);
  }
  candidates.push(titleFromWorkIdPattern(workId));
  candidates.push(rusifyLine(buildTitleFromWorkId(workId)));
  if (currentTitle) {
    candidates.push(rusifyLine(String(currentTitle).trim()));
  }
  candidates.push(rusifyLine(workId.replace(/-/g, ' ')));

  return pickBestTitle(candidates);
}

async function main() {
  const seedMap = await loadSeedTitles();
  const summaries = await readWorkItemsFromRepo({ cwd: repoRoot });
  /** @type {Record<string, string>} */
  const catalog = {};

  for (const summary of summaries) {
    const source = await readWorkItemAtomFromRepo(summary.id, { cwd: repoRoot });
    const [item] = parseWorkItems(source.text);
    catalog[summary.id] = resolveTitle(summary.id, {
      seedTitle: seedMap.get(summary.id),
      goal: item?.goal ?? '',
      currentTitle: item?.title ?? summary.title,
    });
  }

  const outPath = join(repoRoot, 'src/workItemTitleRuCatalog.mjs');
  const body = `/** Auto-generated by scripts/generate-work-item-title-catalog.mjs — do not edit by hand. */
export const WORK_ITEM_TITLE_RU_CATALOG = ${JSON.stringify(catalog, null, 2)};

export function getRussianWorkItemTitle(workId, fallbackTitle = '') {
  return WORK_ITEM_TITLE_RU_CATALOG[workId] ?? fallbackTitle;
}
`;
  await writeFile(outPath, body, 'utf8');

  const bad = Object.entries(catalog).filter(([, title]) => {
    const lat = latinScore(title);
    const cyr = cyrillicScore(title);
    return lat > 14 && lat > cyr * 0.45;
  });

  console.log(JSON.stringify({
    schema: 'workgraph.generate-work-item-title-catalog.v1',
    total: summaries.length,
    seedTitles: seedMap.size,
    weakTitles: bad.length,
    outPath,
  }, null, 2));

  if (bad.length > 0) {
    console.log('\nWeak titles (first 30):');
    for (const [id, title] of bad.slice(0, 30)) {
      console.log(`${id} | ${title}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
