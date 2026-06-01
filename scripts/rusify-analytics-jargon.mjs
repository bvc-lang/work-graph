#!/usr/bin/env node
/**
 * Replace common English jargon in work/analytics/*.md with Russian prose.
 * Code paths, package names, and competitor product names are left as-is.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ANALYTICS_DIR = join(import.meta.dirname, '../work/analytics');

/** Longest phrases first. */
const REPLACEMENTS = [
  ['Source of truth', 'Единый источник правды'],
  ['source of truth', 'единый источник правды'],
  ['Multi-workspace switcher', 'Переключатель нескольких рабочих областей'],
  ['multi-workspace switcher', 'переключатель нескольких рабочих областей'],
  ['Golden path', 'Эталонный сценарий'],
  ['golden path', 'эталонный сценарий'],
  ['letter of intent', 'письмо о намерениях'],
  ['seat-based pricing', 'оплата за каждое рабочее место'],
  ['Skill-gating proven', 'Ограничение по навыку проверено'],
  ['Skill-gating', 'Ограничение по навыку'],
  ['skill-gated', 'с ограничением по навыку'],
  ['early adopter teams', 'команды ранних пользователей'],
  ['early adopter team', 'команда раннего пользователя'],
  ['Early adopters', 'Ранние пользователи'],
  ['early adopters', 'ранние пользователи'],
  ['early adopter', 'ранний пользователь'],
  ['breaking change', 'ломающее изменение'],
  ['Breaking rename', 'Ломающее переименование'],
  ['breaking rename', 'ломающее переименование'],
  ['negative feedback loop', 'негативный контур обратной связи'],
  ['feedback loop', 'контур обратной связи'],
  ['mission-control', 'центр-управления'],
  ['mission control', 'центр управления'],
  ['Mission control', 'Центр управления'],
  ['saved views', 'сохранённые представления'],
  ['Saved views', 'Сохранённые представления'],
  ['split view', 'разделённый экран'],
  ['Split view', 'Разделённый экран'],
  ['bulk actions', 'массовые действия'],
  ['Bulk actions', 'Массовые действия'],
  ['project-switcher', 'переключатель проектов'],
  ['Project switcher', 'Переключатель проектов'],
  ['single-tenant', 'для одного арендатора'],
  ['Single-tenant', 'Для одного арендатора'],
  ['multi-tenant', 'мультитенантный'],
  ['Multi-tenant', 'Мультитенантный'],
  ['trackable work', 'учётная работа'],
  ['trackable ', 'учётная '],
  ['Trackable ', 'Учётная '],
  ['use cases', 'сценарии применения'],
  ['use case', 'сценарий применения'],
  ['Use case', 'Сценарий применения'],
  ['CLI-first', 'сначала через CLI'],
  ['embedded, host-console или hybrid', 'встроенный, консоль-хост или гибрид'],
  ['embedded, host-console or hybrid', 'встроенный, консоль-хост или гибрид'],
  ['host-console', 'консоль-хост'],
  ['Host-console', 'Консоль-хост'],
  ['power-user', 'опытный пользователь'],
  ['drill-down', 'углубление'],
  ['Drill-down', 'Углубление'],
  ['### Вариант A — Embedded', '### Вариант A — Встроенный в проект'],
  ['overkill', 'избыточно'],
  ['standalone', 'автономный'],
  ['Standalone', 'Автономный'],
  ['open-source toolkit', 'набор инструментов с открытым кодом'],
  ['open-source core', 'ядро с открытым кодом'],
  ['open-source', 'с открытым исходным кодом'],
  ['Open source', 'Открытый исходный код'],
  ['open source', 'открытый исходный код'],
  ['open-canon', 'открытый канон'],
  ['open canon', 'открытый канон'],
  ['Open canon', 'Открытый канон'],
  ['evangelism', 'продвижение в сообществе'],
  ['upstream collaboration', 'сотрудничество с авторами проекта'],
  ['upstream contact', 'контакт с авторами проекта'],
  ['upstream PRs', 'PR в основной репозиторий'],
  ['OneBase upstream', 'авторы OneBase'],
  ['upstream без координации', 'в основной репозиторий без согласования'],
  ['seat-based', 'по числу рабочих мест'],
  ['enterprise add-ons', 'корпоративные дополнения'],
  ['enterprise console', 'корпоративная консоль'],
  ['Governance Console', 'консоль управления'],
  ['governance console', 'консоль управления'],
  ['operator console', 'консоль оператора'],
  ['Operator console', 'Консоль оператора'],
  ['Reverse ingest', 'Обратный импорт'],
  ['reverse ingest', 'обратный импорт'],
  ['reverse-ingest', 'обратный импорт'],
  ['fallback', 'запасной вариант'],
  ['Fallback', 'Запасной вариант'],
  ['workflow', 'рабочий процесс'],
  ['Workflow', 'Рабочий процесс'],
  ['onboarding', 'подключение'],
  ['Onboarding', 'Подключение'],
  ['trade-off', 'компромисс'],
  ['trade-offs', 'компромиссы'],
  ['Deliverable', 'Результат'],
  ['deliverable', 'результат'],
  ['list-first mission control', 'списки и центр управления'],
  ['real-time event stream', 'поток событий в реальном времени'],
  ['top-row KPI tiles', 'плитки KPI в верхней строке'],
  ['system health', 'состояние подсистем'],
  ['default landing', 'стартовый экран по умолчанию'],
  ['scope creep', 'раздувание объёма'],
  ['low-hanging', 'быстрые'],
  ['handoff', 'передача'],
  ['rollout', 'развёртывание'],
  ['stakeholder', 'заинтересованная сторона'],
  ['greenfield', 'с нуля'],
  ['brownfield', 'на существующей базе'],
  [' open-source moat', ' преимущество открытого кода'],
  [' moat', ' конкурентное преимущество'],
  ['mass adoption', 'массовое распространение'],
  ['vendor lock', 'привязка к поставщику'],
  ['vendor support', 'поддержка поставщика'],
  ['community, скорость', 'сообщество, скорость'],
  ['rough estimate', 'грубая оценка'],
  ['low risk', 'низкий риск'],
  ['high visibility', 'высокая видимость'],
  ['coordination', 'согласование'],
  ['ко-маркетингу', 'совместному маркетингу'],
  ['ко-маркетинг', 'совместный маркетинг'],
  ['community', 'сообщество'],
  ['embedded в IDE', 'встроенный в IDE'],
  ['embedded scripts', 'встроенные скрипты'],
  ['embedded static', 'встроенная статика'],
  ['embedded webview', 'встроенный webview'],
  ['embedded в 1С', 'встроенный в 1С'],
  ['embedded autonomous', 'автономный с открытым кодом'],
  ['Hot-reload', 'Горячая перезагрузка'],
  ['hot-reload', 'горячая перезагрузка'],
  ['allow-list', 'список разрешений'],
  ['ad-hoc', 'ручной'],
  ['mainstream', 'мейнстрим'],
  ['main thread block', 'блокировка основного потока'],
  ['follow-up', 'продолжение'],
  ['Follow-up', 'Продолжение'],
  ['self-описателен', 'описывает сам себя'],
  ['самоописателен', 'описывает сам себя'],
  ['автономный-инстанс', 'автономный инстанс'],
  ['Hybrid (рекомендация)', 'Гибрид (рекомендация)'],
  ['Hybrid просто', 'Гибрид просто'],
  ['### Вариант C — Hybrid', '### Вариант C — Гибрид'],
  ['Чистый embedded', 'Чистый встроенный вариант'],
  [' host со switcher', ' хост с переключателем'],
  ['federation доменов', 'федерация доменов'],
  ['federation', 'федерация'],
  ['central single-point-of-failure', 'единая точка отказа'],
  ['single-point-of-failure', 'единая точка отказа'],
  ['pointing на', 'указание на'],
  ['in-repo канон', 'канон в репозитории'],
  ['in-repo', 'в репозитории'],
  [' variant A', ' вариант A'],
  [' variant B', ' вариант B'],
  [' variant C', ' вариант C'],
  ['Open Canon Only', 'Только открытый канон'],
  ['downstream content', 'зависимое содержимое'],
  [' не blocker', ' не блокирует'],
  ['drift', 'расхождение'],
  ['backup', 'резервная копия'],
  ['Host должен', 'Хост должен'],
  ['Host-режим', 'Режим хоста'],
  ['Host читает', 'Хост читает'],
  ['CLI/host', 'CLI/хост'],
  ['UI/host', 'UI/хост'],
  ['Один UI/host', 'Один UI/хост'],
  ['WG-host', 'WG-хост'],
  ["host'а", 'хоста'],
  [' host ', ' хост '],
  ['(host)', '(хост)'],
  ['полноценный bridge', 'полноценная интеграция'],
  ['OneBase + ioHasC bridge', 'OneBase + мост ioHasC'],
  ['OneBase bridge', 'мост OneBase'],
  ['ioHasC bridge', 'мост ioHasC'],
  [' готовый bridge ', ' готовая интеграция '],
  ['Конфигуратор bridge', 'Конфигуратор — мост'],
  ['mental model', 'модель работы'],
  [' не наберёт adoption', ' не получит распространение'],
  ['adoption неизвестен', 'распространение неизвестно'],
  ['не получает traction', 'не набирает интерес'],
  ['plan B', 'запасной план'],
  ['traceability', 'прослеживаемость'],
  ['standardize', 'стандартизировать'],
  ['throughput', 'пропускная способность'],
  ['burndown', 'сгорание бэклога'],
  ['deprecated', 'устаревший'],
  ['superseded', 'заменён'],
  ['scaffold', 'каркас'],
  ['sandbox', 'песочница'],
  ['mandate', 'мандат'],
  ['embedder', 'встраивающая среда'],
];

function applyReplacements(text) {
  let result = text;
  for (const [from, to] of REPLACEMENTS) {
    result = result.split(from).join(to);
  }
  return result;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const files = (await readdir(ANALYTICS_DIR)).filter((name) => name.endsWith('.md'));
  let changed = 0;

  for (const file of files) {
    const path = join(ANALYTICS_DIR, file);
    const before = await readFile(path, 'utf8');
    const after = applyReplacements(before);
    if (after !== before) {
      changed += 1;
      if (!dryRun) {
        await writeFile(path, after, 'utf8');
      }
      console.log(dryRun ? '[dry-run] ' : '', file);
    }
  }

  console.log(JSON.stringify({
    schema: 'workgraph.rusify-analytics-jargon.v1',
    files: files.length,
    changed,
    dryRun,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
