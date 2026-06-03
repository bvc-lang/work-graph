import {
  PUBLIC_DOCS,
  PUBLIC_SITE_LOCALES,
  PUBLIC_SITE_ROUTES,
  PUBLIC_SITE_THEMES,
  buildFaqJsonLd,
  buildDocsContext,
  buildLlmsTxt,
  buildMcpDiscovery,
  getLocalizedFaq,
  getPublicSiteCopy,
  getPublicSitePage,
  renderBvcExample,
  renderPublicDocMarkdown,
} from './publicSiteContent.mjs';
import { renderUiBadge, UI_BADGE_CSS } from './ui/atoms/badge.mjs';
import { renderUiButton, UI_BUTTON_CSS } from './ui/atoms/button.mjs';
import { renderInlineIcon, renderThemeIcon } from './ui/iconAssets.mjs';

const PUBLIC_SITE_SCHEMA = 'workgraph.public-site.v1';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/"/gu, '&quot;');
}

function normalizeLocale(value) {
  return PUBLIC_SITE_LOCALES.includes(value) ? value : 'en';
}

function normalizeTheme(value) {
  return PUBLIC_SITE_THEMES.includes(value) ? value : 'light';
}

function publicSiteJsonLd(page) {
  if (page.kind === 'faq') return buildFaqJsonLd(page.locale);
  return {
    '@context': 'https://schema.org',
    '@type': page.kind === 'doc' ? 'TechArticle' : 'SoftwareApplication',
    name: page.title,
    description: page.description,
    applicationCategory: 'DeveloperApplication',
    softwareHelp: '/docs',
    codeRepository: 'local-git-workspace',
  };
}

function withLangAndTheme(href, locale, theme) {
  if (href.startsWith('#') || href.endsWith('.txt') || href.includes('.well-known')) return href;
  const separator = href.includes('?') ? '&' : '?';
  return `${href}${separator}lang=${locale}&theme=${theme}`;
}

function icon(name, size = 18) {
  return renderInlineIcon(`${name}-bold.svg`, { className: 'site-icon', size });
}

function renderThemeLocaleControls(locale, theme) {
  const copy = getPublicSiteCopy(locale);
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  const localeLinks = PUBLIC_SITE_LOCALES.map((candidate) => (
    `<a class="locale-link${candidate === locale ? ' is-active' : ''}" href="?lang=${candidate}&theme=${theme}" hreflang="${candidate}" data-locale-value="${candidate}">${candidate.toUpperCase()}</a>`
  )).join('');
  return `<div class="site-controls" aria-label="${escapeAttr(copy.localeLabel)}">
    <a class="theme-toggle wg-btn wg-btn--secondary wg-btn--sm" href="?lang=${locale}&theme=${nextTheme}" data-theme-toggle data-theme-value="${nextTheme}">${renderThemeIcon(nextTheme === 'dark' ? 'moon' : 'sun')} ${escapeHtml(copy.theme[nextTheme])}</a>
    <span class="locale-links">${localeLinks}</span>
  </div>`;
}

function renderNav(locale, theme) {
  const copy = getPublicSiteCopy(locale);
  const links = [
    ['/', 'Work Graph'],
    ['/product', copy.nav.product],
    ['/evidence-ledger', copy.nav.evidence],
    ['/compare', copy.nav.compare],
    ['/faq', 'FAQ'],
    ['/docs', copy.nav.docs],
  ];
  return `<nav class="site-nav" aria-label="Work Graph public navigation">
    ${links.map(([href, label]) => `<a href="${withLangAndTheme(href, locale, theme)}">${escapeHtml(label)}</a>`).join('')}
  </nav>`;
}

const SCREENSHOTS = [
  {
    src: '/assets/img/work-graph-kanban-board-light.png',
    title: { en: 'Kanban board', ru: 'Доска задач' },
    body: { en: 'Local backlog columns with BVC work items and agent ownership.', ru: 'Локальная доска с BVC-задачами и владельцами.' },
  },
  {
    src: '/assets/img/work-graph-analytics-list.png',
    title: { en: 'Analytics list', ru: 'Аналитика' },
    body: { en: 'Decision and research records connected to implementation work.', ru: 'Решения и исследования, связанные с задачами реализации.' },
  },
  {
    src: '/assets/img/work-graph-task-drawer.png',
    title: { en: 'Task contract drawer', ru: 'Контракт задачи' },
    body: { en: 'Basis, Vector, Goal, analysis, decisions and evidence in one drawer.', ru: 'Базис, Вектор, Цель, анализ, решения и evidence в одной панели.' },
  },
  {
    src: '/assets/img/work-graph-verification-matrix.png',
    title: { en: 'Verification matrix', ru: 'Матрица проверок' },
    body: { en: 'Deterministic, optional and environment-dependent gates before done.', ru: 'Детерминированные, опциональные и environment-гейты перед done.' },
  },
  {
    src: '/assets/img/work-graph-architecture-drawer.png',
    title: { en: 'Architecture drawer', ru: 'Архитектура' },
    body: { en: 'Architecture blocks and derived projections for project navigation.', ru: 'Архитектурные блоки и производные проекции для навигации.' },
  },
  {
    src: '/assets/img/work-graph-kanban-board-dark.png',
    title: { en: 'Dark mode', ru: 'Тёмная тема' },
    body: { en: 'The same local board in dark mode.', ru: 'Та же локальная доска в тёмной теме.' },
  },
];

function screenshotText(value, locale) {
  return value[locale] ?? value.en;
}

function renderSection(section, copy) {
  const items = section.items
    ? `<ol class="flow-list">${section.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ol>`
    : '';
  const docs = section.docs
    ? `<ul class="doc-list">${section.docs.map((doc) => `<li><a href="/docs/${escapeAttr(doc.slug)}">${escapeHtml(doc.title)}</a><p>${escapeHtml(doc.description)}</p></li>`).join('')}</ul>`
    : '';
  const competitors = section.competitors
    ? `<table><thead><tr><th>${escapeHtml(copy.labels.tableCompetitor)}</th><th>${escapeHtml(copy.labels.tableLayer)}</th><th>${escapeHtml(copy.labels.tableEvidence)}</th><th>${escapeHtml(copy.labels.tableStance)}</th></tr></thead><tbody>${section.competitors.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    : '';
  const badges = section.badges
    ? `<div class="badge-row">${section.badges.map((badge) => renderUiBadge(badge)).join('')}</div>`
    : '';
  const iconHtml = section.icon ? `<span class="section-icon">${icon(section.icon, 22)}</span>` : '';
  return `<section class="site-section">
    <div class="section-heading">${iconHtml}<h2>${escapeHtml(section.title)}</h2></div>
    <p>${escapeHtml(section.body)}</p>
    ${badges}
    ${items}${docs}${competitors}
  </section>`;
}

function renderHeroVisual(locale) {
  return `<figure class="template-visual screenshot-hero" aria-label="Work Graph board preview">
    <img src="/assets/img/work-graph-kanban-board-light.png" alt="${escapeAttr(locale === 'ru' ? 'Доска Work Graph' : 'Work Graph kanban board')}" loading="eager" decoding="async">
    <figcaption>${escapeHtml(locale === 'ru' ? 'Локальная доска Work Graph: backlog, ready, in progress and done.' : 'Local Work Graph board: backlog, ready, in progress and done.')}</figcaption>
  </figure>`;
}

function renderScreenshotGallery(locale) {
  return `<section class="screenshot-gallery" aria-label="${escapeAttr(locale === 'ru' ? 'Скриншоты Work Graph' : 'Work Graph screenshots')}">
    <div class="wide-heading">
      <p class="eyebrow">${escapeHtml(locale === 'ru' ? 'Интерфейс' : 'Interface')}</p>
      <h2>${escapeHtml(locale === 'ru' ? 'Как выглядит Work Graph' : 'What Work Graph looks like')}</h2>
      <p>${escapeHtml(locale === 'ru' ? 'Реальные экраны локального UI: доска, аналитика, контракты задач, проверки и архитектура.' : 'Real local UI screens: board, analytics, task contracts, verification and architecture.')}</p>
    </div>
    <div class="screenshot-grid">
      ${SCREENSHOTS.map((shot) => `<figure class="screenshot-card">
        <img src="${escapeAttr(shot.src)}" alt="${escapeAttr(screenshotText(shot.title, locale))}" loading="lazy" decoding="async">
        <figcaption>
          <strong>${escapeHtml(screenshotText(shot.title, locale))}</strong>
          <span>${escapeHtml(screenshotText(shot.body, locale))}</span>
        </figcaption>
      </figure>`).join('')}
    </div>
  </section>`;
}

function renderTemplateAside(copy, locale, theme) {
  const title = locale === 'ru' ? 'Шаблон доказуемой разработки' : 'Evidence-led development template';
  const meta = locale === 'ru'
    ? ['Локально в git', 'BVC-контракты', 'MCP-ready', 'Без БД']
    : ['Local git', 'BVC contracts', 'MCP-ready', 'No database'];
  return `<aside class="template-aside" aria-label="${escapeAttr(title)}">
    <div class="aside-card">
      <div class="aside-icon">${icon('kanban', 22)}</div>
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(copy.hero.body)}</p>
      ${renderUiButton({ href: '#install', label: copy.hero.primary, variant: 'primary', size: 'sm' })}
      <dl>${meta.map((entry) => `<div><dt>${escapeHtml(entry)}</dt><dd>${renderUiBadge({ label: 'WG', tone: 'accent' })}</dd></div>`).join('')}</dl>
    </div>
  </aside>`;
}

function renderSteps(copy, locale) {
  const steps = locale === 'ru'
    ? [
      ['Зафиксируйте решение', 'Создайте AN-разбор: почему работа нужна, какие риски и где границы.'],
      ['Добавьте контракт задачи', 'Переведите решение в BVC-атом с Базисом, Вектором, Целью и проверками.'],
      ['Назначьте агента', 'Cursor, Claude Code или другой MCP-клиент берёт задачу, но не становится источником правды.'],
      ['Приложите доказательства', 'Команды, файлы, проверки и доменный контекст попадают в evidence.'],
      ['Сохраните память', 'После готовности результат становится проверенной памятью проекта.'],
    ]
    : [
      ['Capture the decision', 'Write an AN analysis: why the work matters, what can go wrong and where the boundary is.'],
      ['Add the work contract', 'Turn the decision into a BVC atom with Basis, Vector, Goal and checks.'],
      ['Assign the agent', 'Cursor, Claude Code or another MCP client can execute without becoming the source of truth.'],
      ['Attach evidence', 'Commands, files, checks and domain context become task evidence.'],
      ['Preserve memory', 'After readiness, the outcome becomes verified project memory.'],
    ];
  return `<section class="steps-section">
    <h2>${escapeHtml(locale === 'ru' ? 'Как начать с Work Graph' : 'How to get started with Work Graph')}</h2>
    <ol class="jira-steps">${steps.map(([title, body], index) => `<li>
      <span class="step-number">${index + 1}</span>
      <div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p></div>
    </li>`).join('')}</ol>
  </section>`;
}

function renderRelatedTemplates(locale, theme) {
  const cards = locale === 'ru'
    ? [
      ['Контракт задачи', 'BVC-атом с Базисом, Вектором, Целью и проверками.', '/docs/bvc-spec'],
      ['Матрица проверок', 'Tier A/B/C readiness для работы агентов.', '/docs/verification-matrix'],
      ['MCP-инструменты', 'Контракты tools для Cursor и Claude Code.', '/docs/mcp-tools'],
    ]
    : [
      ['Work contract', 'BVC atom with Basis, Vector, Goal and checks.', '/docs/bvc-spec'],
      ['Verification matrix', 'Tier A/B/C readiness for agent work.', '/docs/verification-matrix'],
      ['MCP tools', 'Tool contracts for Cursor and Claude Code.', '/docs/mcp-tools'],
    ];
  return `<section class="related-templates">
    <div class="related-inner">
      <h2>${escapeHtml(locale === 'ru' ? 'Связанные шаблоны' : 'Related templates')}</h2>
      <div class="related-grid">${cards.map(([title, body, href]) => `<article class="related-card">
        <div class="related-preview"><span></span><span></span><span></span></div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(body)}</p>
        <a href="${withLangAndTheme(href, locale, theme)}">${escapeHtml(locale === 'ru' ? 'Открыть →' : 'Open →')}</a>
      </article>`).join('')}</div>
    </div>
  </section>`;
}

function renderBottomCta(copy, locale, theme) {
  return `<section class="bottom-cta">
    <h2>${escapeHtml(locale === 'ru' ? 'Готовы поставить Work Graph локально?' : 'Ready to install Work Graph locally?')}</h2>
    ${renderUiButton({ href: '#install', label: copy.hero.primary, variant: 'primary', size: 'sm' })}
  </section>`;
}

function renderFooterColumns(locale) {
  const columns = locale === 'ru'
    ? [
      ['Продукт', ['Аналитика', 'Задачи', 'Доска', 'Проверки']],
      ['Документация', ['BVC', 'MCP', 'Проверки', 'Ошибки']],
      ['Для агентов', ['llms.txt', 'Markdown', 'MCP discovery', 'JSON contexts']],
      ['Сравнение', ['Cursor', 'Linear', 'Mem0', 'Devin']],
    ]
    : [
      ['Product', ['Analytics', 'Work items', 'Board', 'Verification']],
      ['Docs', ['BVC', 'MCP', 'Verification', 'Errors']],
      ['For agents', ['llms.txt', 'Markdown', 'MCP discovery', 'JSON contexts']],
      ['Compare', ['Cursor', 'Linear', 'Mem0', 'Devin']],
    ];
  return `<div class="footer-columns">${columns.map(([title, items]) => `<div><h3>${escapeHtml(title)}</h3>${items.map((item) => `<a href="/docs">${escapeHtml(item)}</a>`).join('')}</div>`).join('')}</div>`;
}

function renderProofStats(locale) {
  const stats = locale === 'ru'
    ? [
      ['100%', 'локально в репозитории'],
      ['5', 'шагов от решения до памяти'],
      ['3', 'MCP-инструмента для агента'],
      ['0', 'обязательных SaaS/БД'],
    ]
    : [
      ['100%', 'local in the repository'],
      ['5', 'steps from decision to memory'],
      ['3', 'MCP tools for agents'],
      ['0', 'required SaaS/database'],
    ];
  return `<section class="proof-stats" aria-label="Work Graph facts">
    ${stats.map(([value, label]) => `<div><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`).join('')}
  </section>`;
}

function renderGraphTrinity(locale) {
  const graphs = locale === 'ru'
    ? [
      ['Граф намерений', 'Что и зачем', 'BVC-атомы, AN → Epic → Work Item, связи depends_on и trace.*.'],
      ['Граф исполнения', 'Как и кем', 'Задачи work.id, evidence, статусы todo → ready → doing → done/blocked и гейты.'],
      ['Граф памяти', 'Что решили и почему', 'Закрытые задачи с валидными свидетельствами, аудит-след и RAG-контекст из git.'],
    ]
    : [
      ['Intent Graph', 'What and why', 'BVC atoms, AN → Epic → Work Item, depends_on and trace.* links.'],
      ['Execution Graph', 'How and by whom', 'work.id tasks, evidence, todo → ready → doing → done/blocked states and gates.'],
      ['Memory Graph', 'What was decided and why', 'Closed tasks with valid evidence, audit trail and RAG context from git.'],
    ];
  return `<section class="graph-trinity">
    <div class="wide-heading">
      <p class="eyebrow">${escapeHtml(locale === 'ru' ? 'Модель продукта' : 'Product model')}</p>
      <h2>${escapeHtml(locale === 'ru' ? 'Три графа — один цикл разработки' : 'Three graphs, one development loop')}</h2>
      <p>${escapeHtml(locale === 'ru' ? 'Каждый граф — самостоятельный слой с чётким контрактом. Вместе они дают цикл, который агент может исполнять, а человек — аудировать.' : 'Each graph is a standalone layer with a clear contract. Together they form a loop an agent can execute and a human can audit.')}</p>
    </div>
    <div class="graph-flow">${graphs.map(([title, subtitle, body], index) => `<article>
      <span>${index + 1}</span>
      <h3>${escapeHtml(title)}</h3>
      <strong>${escapeHtml(subtitle)}</strong>
      <p>${escapeHtml(body)}</p>
    </article>`).join('')}</div>
  </section>`;
}

function renderProductPillars(locale) {
  const pillars = locale === 'ru'
    ? [
      ['Атомы намерения', 'BVC: Basis · Vector · Goal — минимальная единица смысла, которую понимает человек, git и агент.'],
      ['Контракт исполнения', 'Projection даёт input.targetFiles, output.evidenceRequired, verification.tier и матрицу разрешённых проверок.'],
      ['Гейты готовности', 'done без evidence = ошибка политики. assert_task_ready_for_done возвращает ok или violations[].'],
      ['Аудит-память', 'Память выводится из закрытых задач с валидными свидетельствами, а не из пересказа чата.'],
    ]
    : [
      ['Intent atoms', 'BVC: Basis · Vector · Goal is the smallest unit of meaning readable by humans, git and agents.'],
      ['Execution contract', 'Projection gives input.targetFiles, output.evidenceRequired, verification.tier and allowed checks.'],
      ['Readiness gates', 'done without evidence is a policy error. assert_task_ready_for_done returns ok or violations[].'],
      ['Audit memory', 'Memory is derived from closed tasks with valid evidence, not from a chat summary.'],
    ];
  return `<section class="pillar-section">
    <div class="wide-heading">
      <p class="eyebrow">${escapeHtml(locale === 'ru' ? 'Что внутри' : 'What is inside')}</p>
      <h2>${escapeHtml(locale === 'ru' ? 'Контрактный контур: намерение → исполнение → память' : 'Contract loop: intent → execution → memory')}</h2>
    </div>
    <div class="pillar-grid">${pillars.map(([title, body], index) => `<article>
      <span>${index + 1}</span>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(body)}</p>
    </article>`).join('')}</div>
  </section>`;
}

function renderCodeShowcase(locale) {
  const bvc = locale === 'ru'
    ? `#ImplementTraceLinksV1@ru<[\\nБазис:\\n  Текущая трассировка шагов не валидируется в CI\\n  Нет связи work.id ↔ файлы ↔ тесты\\nВектор:\\n  Реализовать валидатор трассировки\\n  Добавить MCP-инструмент get_unified_linkage\\nЦель:\\n  Любая задача с trace.* метками имеет автоматическую проверку целостности\\n\\nМетки:\\n  profile: work_item\\n  tier: A\\n  trace.codegen: false\\n\\nChecks:\\n  npm run test:deterministic\\n  bvc lint intent/**/implement-trace-links-v1.work.bvc\\n]>`
    : `#ImplementTraceLinksV1@en<[\\nBasis:\\n  Current step tracing is not validated in CI\\n  There is no work.id ↔ files ↔ tests linkage\\nVector:\\n  Implement trace validator\\n  Add MCP tool get_unified_linkage\\nGoal:\\n  Any task with trace.* labels has automatic integrity checks\\n\\nLabels:\\n  profile: work_item\\n  tier: A\\n  trace.codegen: false\\n\\nChecks:\\n  npm run test:deterministic\\n  bvc lint intent/**/implement-trace-links-v1.work.bvc\\n]>`;
  const mcp = `claim_work_item("implement-trace-links-v1")\\n→ get_work_contract(work_id)\\n→ edit target_files\\n→ run allowed commands\\n→ validate_evidence(structured_json)\\n→ assert_task_ready_for_done(work_id)\\n→ add_work_item_evidence + complete`;
  return `<section class="code-showcase">
    <div>
      <p class="eyebrow">${escapeHtml(locale === 'ru' ? 'Посмотрите на контракт' : 'Look at the contract')}</p>
      <h2>${escapeHtml(locale === 'ru' ? 'Задача читается человеком, git и агентом' : 'A task is readable by humans, git and agents')}</h2>
      <p>${escapeHtml(locale === 'ru' ? 'BVC описывает намерение, projection задаёт исполнение, evidence превращает результат в память.' : 'BVC describes intent, projection defines execution and evidence turns the result into memory.')}</p>
    </div>
    <div class="code-tabs">
      <div><strong>work.bvc</strong><pre><code>${escapeHtml(bvc)}</code></pre></div>
      <div><strong>MCP flow</strong><pre><code>${escapeHtml(mcp)}</code></pre></div>
    </div>
  </section>`;
}

function renderAudience(locale) {
  const groups = locale === 'ru'
    ? [
      ['Для техлида / архитектора', 'Канон смысла в .bvc, аудит по умолчанию, локальность в вашем git.'],
      ['Для разработчика', 'Один бэклог, меньше импровизации, понятный get_work_contract перед реализацией.'],
      ['Для агента', 'Явный input/output/verification, allowlist команд и structured evidence без фейка.'],
    ]
    : [
      ['For tech leads / architects', 'Meaning canon in .bvc, audit by default and local source of truth in your git.'],
      ['For developers', 'One backlog, less improvisation and clear get_work_contract before implementation.'],
      ['For agents', 'Explicit input/output/verification, command allowlist and structured evidence without fake done.'],
    ];
  return `<section class="audience-section">
    <h2>${escapeHtml(locale === 'ru' ? 'Для кого Work Graph' : 'Who Work Graph is for')}</h2>
    <div>${groups.map(([title, body]) => `<article><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p></article>`).join('')}</div>
  </section>`;
}

function renderInstallInstructions(locale) {
  const steps = locale === 'ru'
    ? [
      ['Инициализируйте MCP', 'npx @work-graph/mcp init'],
      ['Добавьте в mcp.json', '"command": "npx @work-graph/mcp", "args": ["--workspace", "."]'],
      ['Проверьте подключение', 'Покажи список задач в статусе ready'],
      ['Соберите статический сайт', 'npm run build:public-site'],
    ]
    : [
      ['Initialize MCP', 'npx @work-graph/mcp init'],
      ['Add to mcp.json', '"command": "npx @work-graph/mcp", "args": ["--workspace", "."]'],
      ['Check connection', 'Show ready work items'],
      ['Build the static site', 'npm run build:public-site'],
    ];
  return `<section id="install" class="install-section">
    <div>
      <p class="eyebrow">${escapeHtml(locale === 'ru' ? 'Установка' : 'Installation')}</p>
      <h2>${escapeHtml(locale === 'ru' ? 'Как установить Work Graph' : 'How to install Work Graph')}</h2>
      <p>${escapeHtml(locale === 'ru' ? 'Быстрый путь — подключить Work Graph как MCP-сервер к Cursor или Claude Code. Данные остаются локально в git, сайт собирается в dist/public-site без базы данных.' : 'The fastest path is to connect Work Graph as an MCP server to Cursor or Claude Code. Data stays local in git, and the site exports to dist/public-site without a database.')}</p>
    </div>
    <ol>${steps.map(([title, command]) => `<li>
      <strong>${escapeHtml(title)}</strong>
      <code>${escapeHtml(command)}</code>
    </li>`).join('')}</ol>
  </section>`;
}

function renderComparisonStrip(locale) {
  const rows = locale === 'ru'
    ? [
      ['Обычный AI-воркфлоу', 'намерение в голове или чате', 'готово = слова агента'],
      ['Таск-трекер', 'планирует работу и статусы', 'не хранит машинный контракт evidence'],
      ['CI / тесты', 'проверяет команды', 'не знает зачем была задача'],
      ['Work Graph', 'связывает намерение, исполнение и память', 'готово = evidence + verified gate'],
    ]
    : [
      ['Plain AI workflow', 'intent lives in heads or chats', 'done = agent words'],
      ['Task tracker', 'plans work and statuses', 'does not store machine evidence contract'],
      ['CI / tests', 'checks commands', 'does not know why the task exists'],
      ['Work Graph', 'links intent, execution and memory', 'done = evidence + verified gate'],
    ];
  return `<section class="comparison-strip">
    <h2>${escapeHtml(locale === 'ru' ? 'Ключевое отличие от обычного AI-воркфлоу' : 'What changes compared to a plain AI workflow')}</h2>
    <div>${rows.map(([name, does, gap]) => `<article>
      <h3>${escapeHtml(name)}</h3>
      <p>${escapeHtml(does)}</p>
      <strong>${escapeHtml(gap)}</strong>
    </article>`).join('')}</div>
  </section>`;
}

function renderRoadmapFaq(locale) {
  const roadmap = locale === 'ru'
    ? ['BVC-задачи и доска', 'MCP-инструменты для агентов', 'Evidence для изменений в репозитории', 'Ready-for-done gate', 'Статический сайт и llms.txt', 'Дальше: шаблоны проектов, доменные профили, публичные демо-кейсы']
    : ['BVC work items and board', 'MCP tools for agents', 'Repository-change evidence', 'Ready-for-done gate', 'Static site and llms.txt', 'Next: project templates, domain profiles, public demo cases'];
  const faq = locale === 'ru'
    ? [
      ['Это замена Jira?', 'Нет. Jira планирует. Work Graph хранит локальный контракт работы, evidence и проверенную память рядом с кодом.'],
      ['Это IDE или агент?', 'Нет. Cursor и Claude Code исполняют. Work Graph задаёт контракт и проверяет готовность результата.'],
      ['Нужна база данных?', 'Для публичного сайта нет. Static export собирается в отдельную папку и хостится как обычные файлы.'],
    ]
    : [
      ['Is this a Jira replacement?', 'Work Graph is a contract platform around AI work: it can take intent from trackers, but the source of truth is the BVC contract and evidence in git.'],
      ['Is this an IDE or agent?', 'Cursor and Claude Code execute work. Work Graph links intent, execution and memory, then verifies readiness.'],
      ['Does it need a database?', 'Not for the public site. Static export builds a folder that can be hosted as plain files.'],
    ];
  return `<section class="roadmap-faq">
    <div>
      <h2>${escapeHtml(locale === 'ru' ? 'Roadmap' : 'Roadmap')}</h2>
      <ul>${roadmap.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    </div>
    <div>
      <h2>${escapeHtml(locale === 'ru' ? 'Вопросы и ответы' : 'FAQ')}</h2>
      ${faq.map(([question, answer]) => `<details><summary>${escapeHtml(question)}</summary><p>${escapeHtml(answer)}</p></details>`).join('')}
    </div>
  </section>`;
}

function renderFaqPage(locale) {
  const faq = getLocalizedFaq(locale);
  return `<section class="faq-page" aria-labelledby="faq-title">
    <div class="wide-heading">
      <p class="eyebrow">${escapeHtml(locale === 'ru' ? 'FAQ' : 'FAQ')}</p>
      <h2 id="faq-title">${escapeHtml(locale === 'ru' ? 'Вопрос-ответ (FAQ) — Work Graph' : 'FAQ — Work Graph')}</h2>
      <p>${escapeHtml(locale === 'ru' ? 'Раздел структурирован для быстрого поиска человеком и для точного парсинга LLM-агентами.' : 'Structured for fast human search and precise LLM-agent parsing.')}</p>
    </div>
    ${faq.map((category) => `<section class="faq-category">
      <h3>${escapeHtml(category.category)}</h3>
      ${category.items.map((item) => `<details>
        <summary>${escapeHtml(item.question)}</summary>
        <p>${escapeHtml(item.answer)}</p>
      </details>`).join('')}
    </section>`).join('')}
    <section class="faq-json-note">
      <h3>${escapeHtml(locale === 'ru' ? 'Для разработчиков и LLM' : 'For developers and LLMs')}</h3>
      <p>${escapeHtml(locale === 'ru' ? 'Структурированная версия доступна как Schema.org FAQPage по адресу /faq.json.' : 'A structured Schema.org FAQPage version is available at /faq.json.')}</p>
      <a href="/faq.json">/faq.json</a>
    </section>
  </section>`;
}

function renderHomeExpansion(locale) {
  return `${renderProofStats(locale)}
    ${renderGraphTrinity(locale)}
    ${renderProductPillars(locale)}
    ${renderInstallInstructions(locale)}
    ${renderCodeShowcase(locale)}
    ${renderAudience(locale)}
    ${renderComparisonStrip(locale)}
    ${renderRoadmapFaq(locale)}`;
}

export function renderPublicSiteHtml(page, options = {}) {
  const locale = normalizeLocale(options.locale);
  const theme = normalizeTheme(options.theme);
  page.locale = locale;
  const copy = getPublicSiteCopy(locale);
  const jsonLd = JSON.stringify(publicSiteJsonLd(page));
  const primaryButton = renderUiButton({
    href: '#install',
    label: copy.hero.primary,
    variant: 'primary',
    size: 'lg',
  });
  const secondaryButton = renderUiButton({
    href: '/llms.txt',
    labelHtml: `${icon('robot', 18)} ${escapeHtml(copy.hero.secondary)}`,
    variant: 'secondary',
    size: 'lg',
  });
  return `<!doctype html>
<html lang="${locale}" data-theme="${theme}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(page.title)} · Work Graph</title>
  <meta name="description" content="${escapeAttr(page.description)}">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/fonts/GraphikLCG/stylesheet.css">
  <link rel="stylesheet" href="/assets/design-tokens-workgraph-dark.css">
  <script>
    (function () {
      var params = new URLSearchParams(window.location.search);
      var allowedLang = ['en', 'ru'];
      var allowedTheme = ['light', 'dark'];
      var lang = params.get('lang') || localStorage.getItem('workGraphPublicSiteLocale') || '${locale}';
      var theme = params.get('theme') || localStorage.getItem('workGraphPublicSiteTheme') || '${theme}';
      if (!allowedLang.includes(lang)) lang = 'en';
      if (!allowedTheme.includes(theme)) theme = 'light';
      localStorage.setItem('workGraphPublicSiteLocale', lang);
      localStorage.setItem('workGraphPublicSiteTheme', theme);
      document.documentElement.lang = lang;
      document.documentElement.dataset.theme = theme;
      if (!params.get('lang') || !params.get('theme')) {
        var next = new URL(window.location.href);
        next.searchParams.set('lang', lang);
        next.searchParams.set('theme', theme);
        window.history.replaceState(null, '', next);
      }
    })();
  </script>
  <script type="application/ld+json">${jsonLd}</script>
  <style>
    :root {
      color-scheme: light;
      --bg: #ffffff;
      --header-bg: #ffffff;
      --card: #ffffff;
      --card-muted: #f4f5f7;
      --text: #172b4d;
      --muted: #5e6c84;
      --border: #dfe1e6;
      --accent: #0052cc;
      --accent-soft: #deebff;
      --shadow: 0 1px 2px rgba(9, 30, 66, .12), 0 0 1px rgba(9, 30, 66, .24);
      --shadow-raised: 0 8px 24px rgba(9, 30, 66, .14);
      --brand-border-rgb: 223 225 230;
      --ui-accent-rgb: 0 82 204;
      --ui-accent-hover-rgb: 0 101 255;
      --ui-accent-foreground-rgb: 255 255 255;
      --ui-text-rgb: 23 43 77;
      --ui-muted-rgb: 94 108 132;
      --ui-surface-rgb: 255 255 255;
      --ui-control-bg-rgb: 244 245 247;
      --ui-control-bg-hover-rgb: 235 236 240;
      --ui-radius-control: 3px;
    }
    html[data-theme="dark"] {
      color-scheme: dark;
      --bg: #1d2125;
      --header-bg: #161a1d;
      --card: #282e33;
      --card-muted: #22272b;
      --text: #d6dde5;
      --muted: #9fadbc;
      --border: #3d474d;
      --accent: #85b8ff;
      --accent-soft: #092957;
      --shadow: 0 1px 1px rgba(0, 0, 0, .32);
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); font-family: var(--brand-font-sans, 'Graphik LCG', ui-sans-serif, system-ui, sans-serif); line-height: 1.55; }
    a { color: var(--accent); }
    .site-header, .site-footer { border-color: var(--border); padding: 16px clamp(18px, 5vw, 72px); }
    .site-header { align-items: center; background: color-mix(in srgb, var(--header-bg) 96%, transparent); backdrop-filter: blur(14px); border-bottom: 1px solid var(--border); display: flex; gap: 22px; justify-content: space-between; position: sticky; top: 0; z-index: 10; }
    .site-brand { color: var(--text); font-size: 15px; font-weight: 800; text-decoration: none; }
    .site-nav { display: flex; flex-wrap: wrap; gap: 4px; }
    .site-nav a, .locale-link { border-radius: 3px; color: var(--text); font-size: 14px; font-weight: 600; padding: 8px 10px; text-decoration: none; }
    .site-nav a:hover, .locale-link:hover, .locale-link.is-active { background: #ebecf0; }
    .site-controls { align-items: center; display: flex; gap: 8px; }
    .site-icon, .header-theme-toggle-icon { fill: currentColor; flex: none; vertical-align: -0.15em; }
    .site-main { padding: 0; }
    .site-shell { margin: 0 auto; max-width: 1360px; padding: clamp(34px, 6vw, 78px) clamp(18px, 5vw, 72px); }
    .hero { margin: 0 auto 30px; max-width: 980px; text-align: left; }
    .eyebrow { color: var(--accent); font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
    h1 { font-size: clamp(2.25rem, 4.8vw, 4rem); letter-spacing: -.035em; line-height: 1.04; margin: 12px 0 18px; }
    h2 { font-size: clamp(1.35rem, 2.2vw, 1.9rem); letter-spacing: -.015em; line-height: 1.18; margin: 0 0 10px; }
    .hero p { color: var(--muted); font-size: 1.125rem; line-height: 1.7; max-width: 820px; }
    .cta-row { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
    .template-visual { background: var(--card); border: 1px solid var(--border); border-radius: 4px; box-shadow: var(--shadow-raised); margin: 0 auto 56px; max-width: 1040px; overflow: hidden; }
    .screenshot-hero img { display: block; height: auto; width: 100%; }
    .screenshot-hero figcaption { border-top: 1px solid var(--border); color: var(--muted); font-size: 13px; padding: 12px 16px; }
    .visual-toolbar { align-items: center; background: #fafbfc; border-bottom: 1px solid var(--border); display: flex; gap: 8px; padding: 12px 14px; }
    .visual-toolbar span { background: var(--border); border-radius: 999px; height: 8px; width: 8px; }
    .visual-board { background: #f4f5f7; display: grid; gap: 12px; grid-template-columns: repeat(4, 1fr); min-height: 310px; padding: 18px; }
    .visual-column { background: #ebecf0; border-radius: 3px; padding: 10px; }
    .visual-column h3 { color: var(--muted); font-size: 11px; font-weight: 800; letter-spacing: .04em; margin: 0 0 10px; text-transform: uppercase; }
    .visual-card { background: var(--card); border-left: 3px solid var(--accent); border-radius: 3px; box-shadow: var(--shadow); display: grid; gap: 7px; margin-bottom: 10px; min-height: 66px; padding: 10px; }
    .visual-card.is-1 { border-left-color: #36b37e; }
    .visual-card.is-2 { border-left-color: #ffab00; }
    .visual-card.is-3 { border-left-color: #6554c0; }
    .visual-card span, .visual-card p, .visual-card small, .related-preview span { background: var(--border); border-radius: 999px; display: block; height: 6px; }
    .visual-card p { width: 80%; }
    .visual-card small { width: 44%; }
    .content-layout { align-items: start; display: grid; gap: 56px; grid-template-columns: 300px minmax(0, 820px); justify-content: center; }
    .template-aside { position: sticky; top: 92px; }
    .aside-card { background: var(--card); border: 1px solid var(--border); border-radius: 4px; box-shadow: var(--shadow); padding: 22px; }
    .aside-icon { align-items: center; background: var(--accent-soft); border-radius: 4px; color: var(--accent); display: flex; height: 42px; justify-content: center; margin-bottom: 14px; width: 42px; }
    .aside-card h2 { font-size: 22px; line-height: 1.18; }
    .aside-card p { color: var(--muted); font-size: 14px; }
    .aside-card .wg-btn { justify-content: center; width: 100%; }
    .aside-card dl { display: grid; gap: 0; margin: 20px 0 0; }
    .aside-card dl div { align-items: center; border-top: 1px solid var(--border); display: flex; justify-content: space-between; padding: 11px 0 0; margin-top: 11px; }
    .aside-card dt { color: var(--muted); font-size: 12px; }
    .aside-card dd { margin: 0; }
    .article-column { min-width: 0; }
    .section-grid { display: grid; gap: 36px; grid-template-columns: 1fr; margin-top: 0; }
    .site-section { background: transparent; border: 0; border-bottom: 1px solid var(--border); border-radius: 0; box-shadow: none; padding: 0 0 34px; }
    .section-heading { align-items: center; display: flex; gap: 10px; }
    .section-icon { align-items: center; background: var(--accent-soft); border-radius: 4px; color: var(--accent); display: inline-flex; height: 34px; justify-content: center; width: 34px; }
    .site-section p, .doc-list p { color: var(--muted); font-size: 16px; line-height: 1.7; }
    .badge-row { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0; }
    .flow-list { display: grid; gap: 8px; padding-left: 22px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border-top: 1px solid var(--border); padding: 8px; text-align: left; vertical-align: top; }
    .proof-stats { display: grid; gap: 14px; grid-template-columns: repeat(4, 1fr); margin: 56px auto 10px; max-width: 1200px; }
    .proof-stats div { background: var(--card); border: 1px solid var(--border); border-radius: 4px; box-shadow: none; padding: 20px; }
    .proof-stats strong { color: var(--accent); display: block; font-size: clamp(1.8rem, 4vw, 3rem); letter-spacing: -.04em; line-height: 1; }
    .proof-stats span { color: var(--muted); display: block; font-size: 13px; margin-top: 8px; }
    .graph-trinity, .pillar-section, .install-section, .code-showcase, .audience-section, .comparison-strip, .roadmap-faq { margin: 58px auto 0; max-width: 1200px; }
    .screenshot-gallery { margin: 58px auto 0; max-width: 1200px; }
    .screenshot-grid { display: grid; gap: 18px; grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: 18px; }
    .screenshot-card { background: var(--card); border: 1px solid var(--border); border-radius: 4px; box-shadow: var(--shadow); margin: 0; overflow: hidden; }
    .screenshot-card img { display: block; height: auto; width: 100%; }
    .screenshot-card figcaption { border-top: 1px solid var(--border); display: grid; gap: 4px; padding: 14px; }
    .screenshot-card figcaption span { color: var(--muted); font-size: 13px; }
    .wide-heading { max-width: 900px; }
    .graph-flow { display: grid; gap: 18px; grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 20px; }
    .graph-flow article { background: var(--card); border: 1px solid var(--border); border-radius: 12px; box-shadow: var(--shadow); padding: 22px; position: relative; }
    .graph-flow article + article::before { color: var(--accent); content: '→'; font-size: 28px; font-weight: 800; left: -26px; position: absolute; top: 42px; }
    .graph-flow span { align-items: center; background: var(--accent-soft); border-radius: 999px; color: var(--accent); display: inline-flex; font-weight: 800; height: 30px; justify-content: center; width: 30px; }
    .graph-flow strong { color: var(--text); display: block; margin-bottom: 8px; }
    .graph-flow p, .graph-trinity .wide-heading p { color: var(--muted); }
    .pillar-grid { display: grid; gap: 16px; grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: 18px; }
    .pillar-grid article, .comparison-strip article, .roadmap-faq > div { background: var(--card); border: 1px solid var(--border); border-radius: 4px; box-shadow: none; padding: 22px; }
    .pillar-grid article span { align-items: center; background: var(--accent-soft); border-radius: 999px; color: var(--accent); display: inline-flex; font-weight: 800; height: 28px; justify-content: center; width: 28px; }
    .pillar-grid h3, .comparison-strip h3 { margin-bottom: 6px; }
    .pillar-grid p, .comparison-strip p, .roadmap-faq p, .code-showcase p { color: var(--muted); }
    .install-section { align-items: start; background: var(--card-muted); border: 1px solid var(--border); border-radius: 4px; display: grid; gap: 28px; grid-template-columns: .9fr 1.1fr; padding: 28px; }
    .install-section p { color: var(--muted); }
    .install-section ol { counter-reset: install; display: grid; gap: 12px; list-style: none; margin: 0; padding: 0; }
    .install-section li { background: var(--card); border: 1px solid var(--border); border-radius: 4px; box-shadow: none; display: grid; gap: 8px; padding: 14px; }
    .install-section li::before { align-items: center; background: var(--accent-soft); border-radius: 999px; color: var(--accent); content: counter(install); counter-increment: install; display: inline-flex; font-weight: 800; height: 24px; justify-content: center; width: 24px; }
    .install-section code { background: #101214; border-radius: 6px; color: #dfe1e6; display: block; padding: 10px; }
    .code-showcase { align-items: start; display: grid; gap: 24px; grid-template-columns: minmax(0, .8fr) minmax(0, 1.2fr); }
    .code-tabs { display: grid; gap: 14px; }
    .code-tabs > div { background: #101214; border-radius: 4px; color: #dfe1e6; overflow: hidden; }
    .code-tabs strong { background: #1f2428; color: #fff; display: block; padding: 10px 14px; }
    pre { margin: 0; overflow-x: auto; padding: 14px; white-space: pre-wrap; }
    code { font-family: ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', monospace; font-size: 12px; }
    .comparison-strip > div { display: grid; gap: 14px; grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .comparison-strip strong { color: var(--text); display: block; font-size: 13px; }
    .audience-section > div { display: grid; gap: 16px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .audience-section article { background: var(--card); border: 1px solid var(--border); border-radius: 4px; box-shadow: none; padding: 22px; }
    .audience-section p { color: var(--muted); }
    .roadmap-faq { align-items: start; display: grid; gap: 22px; grid-template-columns: 1fr 1fr; }
    .faq-page { margin: 0 auto; max-width: 1000px; }
    .faq-category { margin-top: 34px; }
    .faq-category h3 { border-bottom: 1px solid var(--border); padding-bottom: 10px; }
    .faq-category details { background: var(--card); border: 1px solid var(--border); border-radius: 8px; box-shadow: var(--shadow); margin: 10px 0; padding: 14px 16px; }
    .faq-json-note { background: var(--card-muted); border: 1px solid var(--border); border-radius: 10px; margin-top: 32px; padding: 18px; }
    .faq-json-note p { color: var(--muted); }
    .roadmap-faq ul { display: grid; gap: 8px; padding-left: 20px; }
    details { border-top: 1px solid var(--border); padding: 12px 0; }
    summary { cursor: pointer; font-weight: 700; }
    .steps-section { margin-top: 32px; }
    .jira-steps { counter-reset: steps; display: grid; gap: 18px; list-style: none; padding: 0; }
    .jira-steps li { display: grid; gap: 14px; grid-template-columns: 32px 1fr; }
    .step-number { align-items: center; background: #deebff; border-radius: 999px; color: #0747a6; display: inline-flex; font-weight: 700; height: 28px; justify-content: center; width: 28px; }
    .jira-steps h3 { font-size: 17px; margin: 0 0 4px; }
    .jira-steps p { color: var(--muted); margin: 0; }
    .related-templates { background: var(--card-muted); margin-top: 68px; padding: 54px 0; }
    .related-inner { margin: 0 auto; max-width: 1200px; padding: 0 24px; }
    .related-grid { display: grid; gap: 18px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .related-card { background: var(--card); border: 1px solid var(--border); border-radius: 4px; box-shadow: var(--shadow); padding: 18px; }
    .related-preview { background: var(--card-muted); border-radius: 3px; display: grid; gap: 8px; margin-bottom: 14px; padding: 18px; }
    .related-card h3 { margin: 0 0 8px; }
    .related-card p { color: var(--muted); }
    .bottom-cta { background: #101214; color: #fff; margin: 0 auto; max-width: 1200px; padding: 32px; text-align: center; }
    .bottom-cta h2 { color: #fff; }
    .site-footer { border-top: 1px solid var(--border); color: var(--muted); }
    .footer-columns { display: grid; gap: 20px; grid-template-columns: repeat(4, minmax(0, 1fr)); margin: 0 auto; max-width: 1200px; }
    .footer-columns h3 { color: var(--text); font-size: 13px; }
    .footer-columns a { color: var(--muted); display: block; font-size: 13px; margin: 5px 0; text-decoration: none; }
    ${UI_BUTTON_CSS}
    ${UI_BADGE_CSS}
    @media (max-width: 760px) {
      .site-header { align-items: flex-start; flex-direction: column; gap: 12px; position: static; }
      .site-nav { display: grid; gap: 6px; grid-template-columns: repeat(2, minmax(0, 1fr)); width: 100%; }
      .site-controls { justify-content: space-between; width: 100%; }
      h1 { font-size: clamp(2rem, 12vw, 3.1rem); }
      .visual-board { grid-template-columns: repeat(2, 1fr); }
      .content-layout { grid-template-columns: 1fr; }
      .template-aside { position: static; }
      .proof-stats, .graph-flow, .pillar-grid, .install-section, .code-showcase, .audience-section > div, .comparison-strip > div, .roadmap-faq, .related-grid, .footer-columns, .screenshot-grid { grid-template-columns: 1fr; }
      .graph-flow article + article::before { content: none; }
      table { display: block; overflow-x: auto; white-space: nowrap; }
    }
  </style>
</head>
<body>
  <header class="site-header">
    <a class="site-brand" href="/">Work Graph</a>
    ${renderNav(locale, theme)}
    ${renderThemeLocaleControls(locale, theme)}
  </header>
  <main class="site-main">
    <article class="site-shell">
      <header class="hero">
        <p class="eyebrow">${escapeHtml(copy.hero.eyebrow)}</p>
        <h1>${escapeHtml(page.title)}</h1>
        <p>${escapeHtml(page.description)}</p>
        <div class="cta-row">
          ${primaryButton}
          ${secondaryButton}
        </div>
      </header>
      ${page.kind === 'faq' ? renderFaqPage(locale) : `${renderHeroVisual(locale)}
      <div class="content-layout">
        ${renderTemplateAside(copy, locale, theme)}
        <div class="article-column">
          <div class="section-grid">${page.sections.map((section) => renderSection(section, copy)).join('')}</div>
          ${renderSteps(copy, locale)}
        </div>
      </div>
      ${page.kind === 'home' ? `${renderScreenshotGallery(locale)}${renderHomeExpansion(locale)}` : ''}`}
    </article>
    ${renderRelatedTemplates(locale, theme)}
    ${renderBottomCta(copy, locale, theme)}
  </main>
  <footer class="site-footer">
    ${renderFooterColumns(locale)}
    <span>schema: ${PUBLIC_SITE_SCHEMA}</span>
  </footer>
  <script>
    document.addEventListener('click', function (event) {
      var link = event.target.closest('a[data-locale-value], a[data-theme-toggle]');
      if (!link) return;
      if (link.dataset.localeValue) localStorage.setItem('workGraphPublicSiteLocale', link.dataset.localeValue);
      if (link.dataset.themeValue) localStorage.setItem('workGraphPublicSiteTheme', link.dataset.themeValue);
    });
  </script>
</body>
</html>`;
}

function sendText(response, statusCode, body, contentType) {
  response.writeHead(statusCode, {
    'content-type': `${contentType}; charset=utf-8`,
    'cache-control': 'no-store',
  });
  response.end(body);
}

function sendJson(response, statusCode, payload) {
  sendText(response, statusCode, JSON.stringify(payload, null, 2), 'application/json');
}

export function handlePublicSiteRequest(request, response, url) {
  const method = request.method ?? 'GET';
  if (method !== 'GET') return false;

  const locale = normalizeLocale(url.searchParams.get('lang') ?? 'en');
  const theme = normalizeTheme(url.searchParams.get('theme') ?? 'light');

  if (url.pathname === '/llms.txt') {
    sendText(response, 200, buildLlmsTxt(), 'text/plain');
    return true;
  }

  if (url.pathname === '/.well-known/mcp.json') {
    sendJson(response, 200, buildMcpDiscovery());
    return true;
  }

  if (url.pathname === '/faq.json') {
    sendJson(response, 200, buildFaqJsonLd(locale));
    return true;
  }

  if (url.pathname === '/api/docs/bvc-authoring-context') {
    sendJson(response, 200, buildDocsContext('bvc-authoring'));
    return true;
  }

  if (url.pathname === '/api/docs/mcp-tools-context') {
    sendJson(response, 200, buildDocsContext('mcp-tools'));
    return true;
  }

  if (url.pathname === '/api/docs/errors-context') {
    sendJson(response, 200, buildDocsContext('errors'));
    return true;
  }

  const markdownMatch = url.pathname.match(/^\/docs\/([^/.]+)\.md$/u);
  if (markdownMatch) {
    const markdown = renderPublicDocMarkdown(markdownMatch[1], locale);
    if (markdown == null) return false;
    sendText(response, 200, markdown, 'text/markdown');
    return true;
  }

  const bvcExampleMatch = url.pathname.match(/^\/docs\/([^/.]+)\.bvc\.example$/u);
  if (bvcExampleMatch) {
    const example = renderBvcExample(bvcExampleMatch[1]);
    if (example == null) return false;
    sendText(response, 200, example, 'text/plain');
    return true;
  }

  if (url.pathname === '/docs.md') {
    const body = `# Work Graph Docs\n\n${PUBLIC_DOCS.map((doc) => {
      const localized = getPublicSitePage(`/docs/${doc.slug}`, locale);
      return `- [${localized.title}](/docs/${doc.slug}.md?lang=${locale}): ${localized.description}`;
    }).join('\n')}\n`;
    sendText(response, 200, body, 'text/markdown');
    return true;
  }

  if (url.searchParams.get('format') === 'markdown') {
    const docSlug = url.pathname === '/docs' ? null : url.pathname.match(/^\/docs\/([^/.]+)$/u)?.[1];
    const markdown = docSlug
      ? renderPublicDocMarkdown(docSlug, locale)
      : `# Work Graph\n\n${buildLlmsTxt()}`;
    if (markdown == null) return false;
    sendText(response, 200, markdown, 'text/markdown');
    return true;
  }

  const page = getPublicSitePage(url.pathname, locale);
  if (!page) return false;
  sendText(response, 200, renderPublicSiteHtml(page, { locale, theme }), 'text/html');
  return true;
}

