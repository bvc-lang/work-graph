#!/usr/bin/env node
/** Fix broken grammar and paths after rusify-analytics-jargon.mjs */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const DIR = join(import.meta.dirname, '../work/analytics');

const FIXES = [
  ['architecture-l1-freshness-управление.md', 'architecture-l1-freshness-governance.md'],
  ['# AN-17: OneBase Integration — мост к 1С/OneBase управление (vertical stack)', '# AN-17: OneBase Integration — мост к управлению 1С/OneBase (vertical stack)'],
  ['→ коммерческий 1С/OneBase управление.', '→ коммерческое управление конфигурациями 1С/OneBase.'],
  ['(1С-управление)', '(управление 1С)'],
  ['AI-агент с прослеживаемость', 'AI-агент с прослеживаемостью'],
  ['AI-agent управление + прослеживаемость', 'AI-агент с управлением и прослеживаемостью'],
  ['AI-агент с управление, прослеживаемость', 'AI-агент с управлением и прослеживаемостью'],
  ['без прослеживаемость', 'без прослеживаемости'],
  ['с прослеживаемость', 'с прослеживаемостью'],
  ['нет прослеживаемость', 'нет прослеживаемости'],
  ['прослеживаемость, gates', 'прослеживаемости, gates'],
  ['прослеживаемость и regtech', 'прослеживаемости и regtech'],
  ['прослеживаемость, no', 'прослеживаемости, без'],
  ['прослеживаемость matrix', 'матрица прослеживаемости'],
  ['requirements прослеживаемость', 'прослеживаемость требований'],
  ['рабочий процессs', 'рабочие процессы'],
  ['Рабочий процессs', 'Рабочие процессы'],
  ['runtime рабочие процессы', 'среда рабочих процессов'],
  ['готовый bridge с тестами', 'готовая интеграция с тестами'],
  ['— bridge переносим', '— интеграция переносима'],
  [': bridge в ioHasC', ': мост в ioHasC'],
  ['PM над bridge', 'PM над мостом'],
  ['Project switcher', 'Переключатель проектов'],
  ['project switcher', 'переключатель проектов'],
  ['Subgraph extraction', 'Извлечение подграфа'],
  ['subgraph extraction', 'извлечение подграфа'],
  ['Pre-built rails', 'Готовая инфраструктура'],
  ['Pre-built `', 'Готовые `'],
  ['Skill gating tests', 'Тесты ограничения по навыку'],
  ['MCP exposure', 'Доступ через MCP'],
  ['mass adopted IDE', 'массово используемая IDE'],
  ['open communication', 'открытое общение'],
  ['не coordinated', 'без согласования'],
  ['contacted.', '— связь установлена.'],
  ['Hybrid theme', 'Гибридная тема'],
  ['external traction', 'внешнего интереса'],
  ['блокирует adoption', 'блокирует распространение'],
  ['получат traction', 'получат интерес'],
  ['traction OneBase', 'интереса к OneBase'],
  ['Work truth + прослеживаемость', 'учёт работ и прослеживаемость'],
  ['Work truth', 'учёт работ'],
  [' bridge между', ' мост между'],
  [' bridge с ', ' мост с '],
  [' bridge для', ' мост для'],
  [' bridge сохраняет', ' мост сохраняет'],
  ['legacy bridge', 'наследуемый мост'],
  [' bridge к ', ' мост к '],
  [' bridge каталога', ' мост каталога'],
  ['import bridge', 'мост импорта'],
  ['высокая для продвижение в сообществе', 'высокая, для продвижения в сообществе'],
  ['для продвижение в сообществе', 'для продвижения в сообществе'],
  ['без открытый канон', 'без открытого канона'],
  ['open IDE-agents', 'открытые IDE-агенты'],
  ['no привязка к поставщику', 'без привязки к поставщику'],
];

async function main() {
  const files = (await readdir(DIR)).filter((f) => f.endsWith('.md'));
  let changed = 0;
  for (const file of files) {
    const path = join(DIR, file);
    const before = await readFile(path, 'utf8');
    let after = before;
    for (const [from, to] of FIXES) {
      after = after.split(from).join(to);
    }
    if (after !== before) {
      changed += 1;
      await writeFile(path, after, 'utf8');
      console.log(file);
    }
  }
  console.log(JSON.stringify({ changed, files: files.length }, null, 2));
}

main();
