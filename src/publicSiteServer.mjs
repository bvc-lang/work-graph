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
  getPublicSiteCompetitors,
  getPublicSiteCopy,
  getPublicSitePage,
  renderBvcExample,
  renderPublicDocMarkdown,
} from './publicSiteContent.mjs';
import { getProductScreenshotGalleryOptions } from './publicSitePageContent.mjs';
import { renderPublicDocArticleHtml } from './publicSiteDocs.mjs';
import {
  localeFromPathname,
  renderPublicSiteBootstrapScript,
  renderPublicSiteControlsScript,
  stripLocalePathPrefix,
  withLocalePath,
} from './publicSitePreferences.mjs';
import { renderUiBadge, UI_BADGE_CSS } from './ui/atoms/badge.mjs';
import { renderUiButton, UI_BUTTON_CSS } from './ui/atoms/button.mjs';
import { highlightBvcBlock, highlightMcpFlow } from './codeSyntaxHighlight.mjs';
import { renderInlineIcon, renderThemeIcon } from './ui/iconAssets.mjs';

const PUBLIC_SITE_SCHEMA = 'workgraph.public-site.v1';
const PUBLIC_SITE_GITHUB_URL = 'https://github.com/bvc-lang/work-graph';

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
  if (page.kind === 'home') {
    const faqLd = buildFaqJsonLd(page.locale);
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'SoftwareApplication',
          name: page.title,
          description: page.description,
          applicationCategory: 'DeveloperApplication',
          softwareHelp: '/docs',
          codeRepository: 'local-git-workspace',
        },
        { '@type': faqLd['@type'], mainEntity: faqLd.mainEntity },
      ],
    };
  }
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

function icon(name, size = 18) {
  return renderInlineIcon(`${name}-bold.svg`, { className: 'site-icon', size });
}

const STEP_NUMBER_ICON_NAMES = [
  'number-one',
  'number-two',
  'number-three',
  'number-four',
  'number-five',
  'number-six',
];

function renderStepNumberIcon(index) {
  const name = STEP_NUMBER_ICON_NAMES[index] ?? 'number-one';
  return renderInlineIcon(`${name}-fill.svg`, { className: 'step-number-icon-svg', size: 32 }, 'fill');
}

function featureIcon(name) {
  return renderInlineIcon(`${name}-fill.svg`, { className: 'feature-column-icon-svg', size: 40 }, 'fill');
}

function comparisonStripIcon(name) {
  return renderInlineIcon(`${name}-fill.svg`, { className: 'comparison-strip-icon-svg', size: 40 }, 'fill');
}

function workflowPipelineIcon(name) {
  return renderInlineIcon(`${name}-fill.svg`, { className: 'workflow-pipeline-icon-svg', size: 32 }, 'fill');
}

function renderFeatureColumns({ title, items }) {
  return `<section class="feature-columns-section">
    <h2 class="feature-columns-heading">${escapeHtml(title)}</h2>
    <div class="feature-columns">${items.map(({ iconName, heading, body }) => `<article class="feature-column">
      <span class="feature-column-icon" aria-hidden="true">${featureIcon(iconName)}</span>
      <h3>${escapeHtml(heading)}</h3>
      <p>${escapeHtml(body)}</p>
    </article>`).join('')}</div>
  </section>`;
}

function renderIconLabelGridIcon() {
  return renderInlineIcon('check-bold.svg', { className: 'icon-label-grid-icon-svg', size: 22 }, 'bold');
}

/** Full-viewport background band; content stays in __inner max-width column. */
function wrapSiteSectionBand(content, { tone = 'muted', innerClass = '' } = {}) {
  const innerAttr = innerClass ? ` ${innerClass}` : '';
  return `<div class="site-section-band site-section-band--${tone}">
    <div class="site-section-band__inner${innerAttr}">${content}</div>
  </div>`;
}

function renderIconLabelGrid({ title, body, items }) {
  return `<section class="icon-label-grid-section">
    <div class="icon-label-grid-heading">
      <h2>${escapeHtml(title)}</h2>
      ${body ? `<p>${escapeHtml(body)}</p>` : ''}
    </div>
    <div class="icon-label-grid">${items.map((label) => `<div class="icon-label-grid-item">
      <span class="icon-label-grid-icon" aria-hidden="true"><span class="icon-label-grid-icon-box">${renderIconLabelGridIcon()}</span></span>
      <span class="icon-label-grid-label">${escapeHtml(label)}</span>
    </div>`).join('')}</div>
  </section>`;
}

function renderThemeToggleIcons() {
  const moon = renderThemeIcon('moon', { className: 'site-icon theme-icon theme-icon-moon', size: 18 });
  const sun = renderThemeIcon('sun', { className: 'site-icon theme-icon theme-icon-sun', size: 18 });
  return `<span class="theme-toggle-icons" aria-hidden="true">${moon}${sun}</span>`;
}

function renderNavToggle(locale) {
  const copy = getPublicSiteCopy(locale);
  return `<button type="button" class="site-nav-toggle site-control-btn" data-nav-toggle aria-controls="site-nav" aria-expanded="false" aria-label="${escapeAttr(copy.nav.menuOpen)}" data-label-open="${escapeAttr(copy.nav.menuOpen)}" data-label-close="${escapeAttr(copy.nav.menuClose)}"><span class="site-nav-toggle-bars" aria-hidden="true"></span></button>`;
}

function renderHeaderGithubButton(locale) {
  const label = locale === 'ru' ? 'GitHub репозиторий Work Graph' : 'Work Graph on GitHub';
  const icon = renderInlineIcon('github-logo-fill.svg', { className: 'site-github-icon-svg', size: 20 }, 'fill');
  return `<a class="site-control-btn site-github-btn" href="${escapeAttr(PUBLIC_SITE_GITHUB_URL)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeAttr(label)}">${icon}</a>`;
}

function renderThemeLocaleControls(locale, theme) {
  const localeLabel = locale === 'ru' ? 'En' : 'Ru';
  const themeAriaDark = locale === 'ru' ? 'Тёмная тема' : 'Dark theme';
  const themeAriaLight = locale === 'ru' ? 'Светлая тема' : 'Light theme';
  const localeAria = locale === 'ru' ? 'English' : 'Русский';
  return `<div class="site-controls" aria-label="${escapeAttr(getPublicSiteCopy(locale).localeLabel)}">
    <button type="button" class="site-control-btn theme-toggle" data-theme-toggle data-label-dark="${escapeAttr(themeAriaDark)}" data-label-light="${escapeAttr(themeAriaLight)}" aria-label="${escapeAttr(theme === 'dark' ? themeAriaLight : themeAriaDark)}">${renderThemeToggleIcons()}</button>
    <button type="button" class="site-control-btn locale-toggle" data-locale-toggle aria-label="${escapeAttr(localeAria)}">${escapeHtml(localeLabel)}</button>
  </div>`;
}

function renderSiteBrand(locale) {
  const home = withLocalePath('/', locale);
  const label = 'Work Graph';
  return `<a class="site-brand" href="${escapeAttr(home)}" aria-label="${escapeAttr(label)}">
    <img class="site-brand-logo" src="/assets/workgraph-logo.svg" width="188" height="24" alt="${escapeAttr(label)}" decoding="async">
    <img class="site-brand-emblem" src="/assets/workgraph-emblem.svg" width="41" height="24" alt="" aria-hidden="true" decoding="async">
  </a>`;
}

function isNavLinkActive(href, activeRoute) {
  if (href === '/') return activeRoute === '/';
  if (href === '/docs') return activeRoute === '/docs' || activeRoute.startsWith('/docs/');
  return activeRoute === href;
}

function renderNav(locale, activeRoute = '/') {
  const copy = getPublicSiteCopy(locale);
  const links = [
    ['/product', copy.nav.product],
    ['/evidence-ledger', copy.nav.evidence],
    ['/compare', copy.nav.compare],
    ['/docs', copy.nav.docs],
  ];
  return `<nav class="site-nav" id="site-nav" aria-label="Work Graph public navigation">
    ${links.map(([href, label]) => {
      const active = isNavLinkActive(href, activeRoute);
      const current = active ? ' aria-current="page"' : '';
      return `<a href="${withLocalePath(href, locale)}"${current}>${escapeHtml(label)}</a>`;
    }).join('')}
  </nav>`;
}

const SCREENSHOT_KEY_INDEX = {
  analytics: 0,
  tasks: 1,
  board: 2,
  verification: 3,
  memory: 4,
  architecture: 5,
};

const SCREENSHOTS = [
  {
    src: '/assets/img/work-graph-analytics-list.png',
    title: { en: 'Analytics', ru: 'Аналитика' },
    headline: { en: 'Analytics links decisions to delivery work', ru: 'Аналитика связывает решения с задачами реализации' },
    body: {
      en: 'AN records capture reasoning, options and boundaries before work enters the backlog. Lineage, epic links and implementation ties stay in the intent graph inside git — not in a separate doc or chat summary.',
      ru: 'AN-записи фиксируют аргументацию, варианты и границы до появления work items. Видны lineage, связи с эпиками и реализацией — не отдельный документ, а часть графа намерений в репозитории.',
    },
  },
  {
    src: '/assets/img/work-graph-task-drawer.png',
    title: { en: 'Tasks', ru: 'Задачи' },
    headline: { en: 'A task is a machine-readable BVC contract', ru: 'Задача — машиночитаемый BVC-контракт, а не тикет из чата' },
    body: {
      en: 'The drawer shows Basis, Vector, Goal, analysis, decisions, checks and evidence in one place. Agents read projection via get_work_contract and know which files, commands and gates are required before done.',
      ru: 'В панели задачи: Базис, Вектор, Цель, анализ, решения, проверки и evidence. Агент читает projection через get_work_contract и знает, какие файлы, команды и гейты обязательны до закрытия.',
    },
  },
  {
    src: '/assets/img/work-graph-kanban-board-light.png',
    title: { en: 'Kanban board', ru: 'Доска задач' },
    headline: { en: 'The board shows how work is moving', ru: 'Доска показывает, как движется работа' },
    body: {
      en: 'Columns from backlog through ready, doing and done with BVC work items and owners. Status follows contract and evidence — not an arbitrary label someone typed in a thread.',
      ru: 'Колонки от backlog до ready, doing и done с BVC-задачами и владельцами. Статус — следствие контракта и evidence, а не произвольная метка в переписке.',
    },
  },
  {
    src: '/assets/img/work-graph-verification-matrix.png',
    title: { en: 'Verification', ru: 'Проверки' },
    headline: { en: 'Verification decides when a task can close', ru: 'Проверки решают, можно ли закрыть задачу' },
    body: {
      en: 'Tier A/B/C matrix: deterministic commands, optional checks and environment gates. assert_task_ready_for_done returns violations[] — a contract verdict, not agent prose.',
      ru: 'Матрица tier A/B/C: детерминированные команды, опциональные проверки и environment-гейты. assert_task_ready_for_done возвращает violations[] — вердикт контракта, а не слова агента.',
    },
  },
  {
    src: '/assets/img/work-graph-memory-list.png',
    title: { en: 'Project memory', ru: 'Память проекта' },
    headline: { en: 'Project memory keeps verified outcomes', ru: 'Память проекта хранит проверенные результаты' },
    body: {
      en: 'Closed tasks with valid evidence become memory records linked to work.id and files. The next session pulls context from git, not from a recap of what the model said last time.',
      ru: 'Закрытые задачи с валидным evidence становятся записями памяти со ссылками на work.id и файлы. Следующая сессия опирается на git, а не на пересказ прошлого чата.',
    },
  },
  {
    src: '/assets/img/work-graph-architecture-drawer.png',
    title: { en: 'Architecture', ru: 'Архитектура' },
    headline: { en: 'Architecture orients you in a large repo', ru: 'Архитектура помогает ориентироваться в большом репозитории' },
    body: {
      en: 'Blocks from architecture/main.bvc and derived projections map domains and containers without breaking away from the intent graph and backlog you execute against.',
      ru: 'Блоки architecture/main.bvc и производные проекции показывают домены и контейнеры без отрыва от intent-графа и бэклога, по которому идёт работа.',
    },
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
    ? `<div class="table-scroll" tabindex="0"><table><thead><tr><th>${escapeHtml(copy.labels.tableCompetitor)}</th><th>${escapeHtml(copy.labels.tableLayer)}</th><th>${escapeHtml(copy.labels.tableEvidence)}</th><th>${escapeHtml(copy.labels.tableStance)}</th></tr></thead><tbody>${section.competitors.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
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

function renderHeroVisual(locale, theme) {
  const lightSrc = '/assets/img/work-graph-kanban-board-light.png';
  const darkSrc = '/assets/img/work-graph-kanban-board-dark.png';
  const src = theme === 'dark' ? darkSrc : lightSrc;
  return `<figure class="template-visual screenshot-hero" aria-label="Work Graph board preview">
    <img src="${escapeAttr(src)}" data-hero-screenshot data-light-src="${escapeAttr(lightSrc)}" data-dark-src="${escapeAttr(darkSrc)}" alt="${escapeAttr(locale === 'ru' ? 'Доска Work Graph' : 'Work Graph kanban board')}" loading="eager" decoding="async">
    <figcaption>${escapeHtml(locale === 'ru' ? 'Локальная доска Work Graph: backlog, ready, in progress and done.' : 'Local Work Graph board: backlog, ready, in progress and done.')}</figcaption>
  </figure>`;
}

function resolveScreenshotList(shotKeys) {
  if (!shotKeys?.length) return SCREENSHOTS;
  return shotKeys
    .map((key) => SCREENSHOTS[SCREENSHOT_KEY_INDEX[key]])
    .filter(Boolean);
}

function renderScreenshotGallery(locale, options = {}) {
  const shots = resolveScreenshotList(options.shotKeys);
  const tablistLabel = locale === 'ru' ? 'Экраны Work Graph' : 'Work Graph screens';
  const tabs = shots.map((shot, index) => {
    const id = `screenshot-${index}`;
    const label = screenshotText(shot.title, locale);
    const active = index === 0;
    return `<button type="button" class="screenshot-tab${active ? ' is-active' : ''}" role="tab" id="${id}-tab" data-screenshot-tab="${id}" aria-selected="${active ? 'true' : 'false'}" aria-controls="${id}-panel">${escapeHtml(label)}</button>`;
  }).join('');
  const panels = shots.map((shot, index) => {
    const id = `screenshot-${index}`;
    const title = screenshotText(shot.title, locale);
    const headline = screenshotText(shot.headline ?? shot.title, locale);
    const body = screenshotText(shot.body, locale);
    const active = index === 0;
    return `<article class="screenshot-panel${active ? ' is-active' : ''}" role="tabpanel" id="${id}-panel" data-screenshot-panel="${id}" aria-labelledby="${id}-tab"${active ? '' : ' hidden'}>
      <div class="screenshot-panel-copy">
        <h3>${escapeHtml(headline)}</h3>
        <p>${escapeHtml(body)}</p>
      </div>
      <div class="screenshot-panel-visual">
        <div class="screenshot-panel-frame">
          <img src="${escapeAttr(shot.src)}" alt="${escapeAttr(title)}" loading="${active ? 'eager' : 'lazy'}" decoding="async">
        </div>
      </div>
    </article>`;
  }).join('');
  const sectionIntro = options.lead ?? (locale === 'ru'
    ? 'Локальный UI Work Graph ведёт полный цикл: от аналитического разбора и BVC-задач до доски, проверок, памяти и архитектуры. Переключайте экраны и смотрите, как решения, контракты и доказательства связаны в одном репозитории.'
    : 'The local Work Graph UI runs the full loop: from analytics review and BVC tasks to the board, verification, memory and architecture. Switch screens to see how decisions, contracts and evidence connect in one repository.');
  const galleryTitle = options.title ?? (locale === 'ru' ? 'Как выглядит Work Graph' : 'What Work Graph looks like');
  const gallery = `<section class="screenshot-gallery" aria-label="${escapeAttr(locale === 'ru' ? 'Скриншоты Work Graph' : 'Work Graph screenshots')}">
    <div class="screenshot-gallery-heading">
      <h2>${escapeHtml(galleryTitle)}</h2>
      <p class="screenshot-gallery-lead">${escapeHtml(sectionIntro)}</p>
    </div>
    <div class="screenshot-switcher" data-screenshot-switcher>
      <div class="screenshot-tablist" role="tablist" aria-label="${escapeAttr(tablistLabel)}">${tabs}</div>
      <div class="screenshot-panels">${panels}</div>
    </div>
  </section>`;
  return wrapSiteSectionBand(gallery, { tone: 'muted' });
}

function renderStepsSection(title, steps) {
  return `<section class="steps-section">
    <h2>${escapeHtml(title)}</h2>
    <ol class="jira-steps">${steps.map(([stepTitle, body], index) => `<li>
      <span class="step-number" aria-hidden="true">${renderStepNumberIcon(index)}</span>
      <h3><strong>${escapeHtml(stepTitle)}</strong> ${escapeHtml(body)}</h3>
    </li>`).join('')}</ol>
  </section>`;
}

function renderSteps(copy, locale) {
  const steps = locale === 'ru'
    ? [
      ['Установите Work Graph в проект', 'Выполните npx @work-graph/cli init . и npm install — появятся intent/, конфиг и MCP для Cursor или другого клиента.'],
      ['Исследуйте вопрос', 'Попросите ИИ провести аналитический разбор — он оформит его как AN-запись в проекте.'],
      ['Добавьте задачи', 'Попросите ИИ на основе разбора создать задачи или целый эпик с BVC-контрактами.'],
      ['Выполнение', 'Агент захватывает work.id, меняет код в рамках контракта и прикладывает evidence; статусы видны на доске.'],
      ['Проверки', 'Детерминированные и опциональные гейты решают, можно ли закрыть задачу — не слова агента, а контракт.'],
      ['Память', 'После готовности проверенный результат становится памятью проекта со связями к задачам и файлам.'],
    ]
    : [
      ['Install Work Graph in your repo', 'Run npx @work-graph/cli init . and npm install — you get intent/, config, and MCP for Cursor or another client.'],
      ['Explore the question', 'Ask the agent for an analytics review — it records the outcome as an AN entry in the project.'],
      ['Add work items', 'Ask the agent to create tasks or a full epic from the review, each with a BVC contract.'],
      ['Execution', 'The agent claims a work.id, edits code within the contract, and attaches evidence; the board shows progress.'],
      ['Verification', 'Deterministic and optional gates decide when a task can close — contract verdict, not agent prose.'],
      ['Memory', 'After readiness, the verified outcome becomes project memory linked to work items and files.'],
    ];
  const title = locale === 'ru' ? 'Как начать с Work Graph' : 'How to get started with Work Graph';
  return renderStepsSection(title, steps);
}

function renderBottomCta(copy, locale, theme) {
  const installHref = `${withLocalePath('/', locale)}#install`;
  return `<section class="bottom-cta">
    <div class="bottom-cta__inner">
      <h2>${escapeHtml(locale === 'ru' ? 'Готовы поставить Work Graph локально?' : 'Ready to install Work Graph locally?')}</h2>
      ${renderUiButton({ href: installHref, label: copy.hero.primary, variant: 'primary', size: 'lg' })}
    </div>
  </section>`;
}

function renderFooter(locale) {
  const year = new Date().getFullYear();
  const home = withLocalePath('/', locale);
  const brandLinks = locale === 'ru'
    ? [
      ['https://github.com/bvc-lang/work-graph', 'GitHub'],
      [withLocalePath('/docs', locale), 'Документация'],
      ['/llms.txt', 'llms.txt'],
    ]
    : [
      ['https://github.com/bvc-lang/work-graph', 'GitHub'],
      [withLocalePath('/docs', locale), 'Documentation'],
      ['/llms.txt', 'llms.txt'],
    ];
  const columns = locale === 'ru'
    ? [
      ['Продукт', [
        [withLocalePath('/product', locale), 'Аналитика'],
        [withLocalePath('/product', locale), 'Задачи BVC'],
        [withLocalePath('/product', locale), 'Доска'],
        [withLocalePath('/evidence-ledger', locale), 'Проверки'],
      ]],
      ['Документация', [
        [withLocalePath('/docs/bvc-spec', locale), 'BVC'],
        [withLocalePath('/docs/mcp-tools', locale), 'MCP'],
        [withLocalePath('/docs/verification-matrix', locale), 'Матрица проверок'],
        [withLocalePath('/docs', locale), 'Все документы'],
      ]],
      ['Для агентов', [
        ['/llms.txt', 'llms.txt'],
        [withLocalePath('/docs', locale), 'Markdown'],
        ['/.well-known/mcp.json', 'MCP discovery'],
        [withLocalePath('/docs', locale), 'JSON contexts'],
      ]],
    ]
    : [
      ['Product', [
        [withLocalePath('/product', locale), 'Analytics'],
        [withLocalePath('/product', locale), 'Work items'],
        [withLocalePath('/product', locale), 'Board'],
        [withLocalePath('/evidence-ledger', locale), 'Verification'],
      ]],
      ['Docs', [
        [withLocalePath('/docs/bvc-spec', locale), 'BVC'],
        [withLocalePath('/docs/mcp-tools', locale), 'MCP'],
        [withLocalePath('/docs/verification-matrix', locale), 'Verification matrix'],
        [withLocalePath('/docs', locale), 'All docs'],
      ]],
      ['For agents', [
        ['/llms.txt', 'llms.txt'],
        [withLocalePath('/docs', locale), 'Markdown'],
        ['/.well-known/mcp.json', 'MCP discovery'],
        [withLocalePath('/docs', locale), 'JSON contexts'],
      ]],
    ];
  const legal = locale === 'ru'
    ? [
      [withLocalePath('/docs', locale), 'Документация'],
      ['https://github.com/bvc-lang/work-graph', 'GitHub'],
    ]
    : [
      [withLocalePath('/docs', locale), 'Documentation'],
      ['https://github.com/bvc-lang/work-graph', 'GitHub'],
    ];
  const external = (href) => href.startsWith('http');
  return `<footer class="site-footer">
    <div class="site-footer__panel">
      <div class="site-footer__grid">
        <div class="site-footer__brand">
          <a class="site-footer__logo" href="${escapeAttr(home)}" aria-label="Work Graph">
            <img src="/assets/workgraph-logo.svg" width="148" height="22" alt="Work Graph" decoding="async">
          </a>
          <nav class="site-footer__brand-links" aria-label="${escapeAttr(locale === 'ru' ? 'Быстрые ссылки' : 'Quick links')}">
            ${brandLinks.map(([href, label]) => `<a href="${escapeAttr(href)}"${external(href) ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(label)}</a>`).join('')}
          </nav>
        </div>
        <div class="footer-columns">${columns.map(([title, items]) => `<div class="footer-column">
          <h3>${escapeHtml(title)}</h3>
          ${items.map(([href, label]) => `<a href="${escapeAttr(href)}"${external(href) ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(label)}</a>`).join('')}
        </div>`).join('')}</div>
      </div>
    </div>
    <div class="site-footer__bottom">
      <p class="site-footer__copy">${escapeHtml(locale === 'ru' ? `© ${year} Work Graph` : `Copyright © ${year} Work Graph`)}</p>
      <nav class="site-footer__legal" aria-label="${escapeAttr(locale === 'ru' ? 'Правовая информация' : 'Legal')}">
        ${legal.map(([href, label]) => `<a href="${escapeAttr(href)}"${external(href) ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(label)}</a>`).join('')}
      </nav>
    </div>
  </footer>`;
}

function renderGraphTrinity(locale, options = {}) {
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
  const title = options.title ?? (locale === 'ru' ? 'Три графа — один цикл разработки' : 'Three graphs, one development loop');
  const body = options.body ?? (locale === 'ru'
    ? 'Каждый граф — самостоятельный слой с чётким контрактом. Вместе они дают цикл, который агент может исполнять, а человек — аудировать.'
    : 'Each graph is a standalone layer with a clear contract. Together they form a loop an agent can execute and a human can audit.');
  const cards = graphs.map(([graphTitle, subtitle, graphBody], index) => `<article class="graph-flow-card">
      <span class="graph-flow-step" aria-hidden="true">${index + 1}</span>
      <h3 class="graph-flow-card-title">${escapeHtml(graphTitle)}</h3>
      <p class="graph-flow-card-lead">${escapeHtml(subtitle)}</p>
      <p class="graph-flow-card-body">${escapeHtml(graphBody)}</p>
    </article>`);
  const flow = cards
    .flatMap((card, index) => (index < cards.length - 1 ? [card, '<span class="graph-flow-arrow" aria-hidden="true">→</span>'] : [card]))
    .join('');
  return `<section class="graph-trinity">
    <div class="graph-trinity-heading">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(body)}</p>
    </div>
    <div class="graph-flow">${flow}</div>
  </section>`;
}

function renderProductPillars(locale) {
  const items = locale === 'ru'
    ? ['Аналитика', 'Задачи BVC', 'Доска задач', 'Проверки', 'Память проекта', 'MCP-инструменты']
    : ['Analytics', 'BVC work items', 'Kanban board', 'Verification', 'Project memory', 'MCP tools'];
  return renderIconLabelGrid({
    title: locale === 'ru' ? 'Контрактный контур: намерение → исполнение → память' : 'Contract loop: intent → execution → memory',
    body: locale === 'ru'
      ? 'Свяжите стратегию с исполнением: от AN-разбора до проверенной памяти в git — в одном локальном графе работ.'
      : 'Connect strategy to execution: from AN review to verified memory in git — in one local work graph.',
    items,
  });
}

function renderCodeShowcase(locale, options = {}) {
  const bvc = locale === 'ru'
    ? `#ImplementTraceLinksV1@ru<[
Базис:
  Текущая трассировка шагов не валидируется в CI
  Нет связи work.id ↔ файлы ↔ тесты
Вектор:
  Реализовать валидатор трассировки
  Добавить MCP-инструмент get_unified_linkage
Цель:
  Любая задача с trace.* метками имеет автоматическую проверку целостности

Метки:
  profile: work_item
  tier: A
  trace.codegen: false

Checks:
  npm run test:deterministic
  bvc lint intent/**/implement-trace-links-v1.work.bvc
]>`
    : `#ImplementTraceLinksV1@en<[
Basis:
  Current step tracing is not validated in CI
  There is no work.id ↔ files ↔ tests linkage
Vector:
  Implement trace validator
  Add MCP tool get_unified_linkage
Goal:
  Any task with trace.* labels has automatic integrity checks

Labels:
  profile: work_item
  tier: A
  trace.codegen: false

Checks:
  npm run test:deterministic
  bvc lint intent/**/implement-trace-links-v1.work.bvc
]>`;
  const mcp = `claim_work_item("implement-trace-links-v1")
→ get_work_contract(work_id)
→ edit target_files
→ run allowed commands
→ validate_evidence(structured_json)
→ assert_task_ready_for_done(work_id)
→ add_work_item_evidence + complete`;
  const title = options.title ?? (locale === 'ru' ? 'Задача читается человеком, git и агентом' : 'A task is readable by humans, git and agents');
  const body = options.body ?? (locale === 'ru'
    ? 'BVC описывает намерение, projection задаёт исполнение, evidence превращает результат в память.'
    : 'BVC describes intent, projection defines execution and evidence turns the result into memory.');
  return `<section class="code-showcase">
    <div>
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(body)}</p>
    </div>
    <div class="code-tabs">
      <div><strong>work.bvc</strong><pre><code class="code-block language-bvc">${highlightBvcBlock(bvc)}</code></pre></div>
      <div><strong>MCP flow</strong><pre><code class="code-block language-mcp">${highlightMcpFlow(mcp)}</code></pre></div>
    </div>
  </section>`;
}

function renderAudience(locale, copy) {
  const ru = locale === 'ru';
  return renderSiteSectionsBlock(
    {
      title: ru ? 'Для кого Work Graph' : 'Who Work Graph is for',
      sections: ru
        ? [
          { title: 'Для техлида и архитектора', body: 'Видите связь решений, задач и evidence в одном графе: AN-разборы, BVC-контракты и проверки остаются в git, а не в пересказе чата.', icon: 'eye' },
          { title: 'Для разработчика', body: 'Один бэклог и понятный get_work_contract перед кодом: меньше импровизации, ясные targetFiles и статусы на доске.', icon: 'users-three' },
          { title: 'Для агента', body: 'Явные input/output/verification, allowlist команд и structured evidence: агент исполняет контракт, а не объявляет «готово» словами.', icon: 'chart-line-up' },
        ]
        : [
          { title: 'For tech leads and architects', body: 'See decisions, work items and evidence in one graph: AN reviews, BVC contracts and checks stay in git, not in chat summaries.', icon: 'eye' },
          { title: 'For developers', body: 'One backlog and a clear get_work_contract before coding: less improvisation, explicit targetFiles and board states.', icon: 'users-three' },
          { title: 'For agents', body: 'Explicit input/output/verification, command allowlists and structured evidence: the agent executes the contract instead of saying done in prose.', icon: 'chart-line-up' },
        ],
    },
    copy,
    locale,
  );
}

function renderInstallCopyIcon() {
  return renderInlineIcon('copy-bold.svg', { className: 'install-copy-icon', size: 18 });
}

function renderInstallCodeBlock(command, locale) {
  const copyLabel = locale === 'ru' ? 'Копировать' : 'Copy';
  const copiedLabel = locale === 'ru' ? 'Скопировано' : 'Copied';
  return `<div class="install-code">
    <code>${escapeHtml(command)}</code>
    <button type="button" class="install-copy-btn" data-copy-text="${escapeAttr(command)}" data-copy-label="${escapeAttr(copyLabel)}" data-copied-label="${escapeAttr(copiedLabel)}" aria-label="${escapeAttr(copyLabel)}" title="${escapeAttr(copyLabel)}">${renderInstallCopyIcon()}<span class="install-copy-btn-text">${escapeHtml(copyLabel)}</span></button>
  </div>`;
}

function renderInstallInstructions(locale) {
  const copy = locale === 'ru'
    ? {
      title: 'Как установить Work Graph',
      lead: 'Установка в существующий репозиторий: локальный бэклог, UI и MCP для агента. Нужны Node.js 20+ и npm.',
      projectDir: 'В каталоге проекта выполните:',
      script: 'cd /path/to/your-project\nnpx @work-graph/cli init .\nnpm install\nnpm run workgraph:ui',
      openUi: 'Откройте в браузере:',
      uiUrl: 'http://localhost:4177/',
      agentLead: 'Для агентов:',
      agentQuote: 'Установи Work Graph в этот проект https://www.npmjs.com/package/@work-graph/cli и открой локальный UI.',
      detail: 'Команда init создаёт .work-graph/config.json, intent/, npm-скрипты и при необходимости .cursor/mcp.json (npx -y @work-graph/mcp, WORKGRAPH_ROOT). Существующие intent/index.bvc и architecture/main.bvc сохраняются. После npm install перезагрузите MCP в IDE.',
      verify: 'Проверка: npm run workgraph:doctor',
      guideLabel: 'Подробная инструкция',
      guideHref: 'https://github.com/bvc-lang/work-graph/blob/main/docs/getting-started.md',
    }
    : {
      title: 'How to install Work Graph',
      lead: 'Install into an existing repository: local backlog, operator UI, and MCP for your agent. Requires Node.js 20+ and npm.',
      projectDir: 'In your project directory, run:',
      script: 'cd /path/to/your-project\nnpx @work-graph/cli init .\nnpm install\nnpm run workgraph:ui',
      openUi: 'Then open:',
      uiUrl: 'http://localhost:4177/',
      agentLead: 'For agents:',
      agentQuote: 'Install Work Graph in this project https://www.npmjs.com/package/@work-graph/cli and open the local UI.',
      detail: 'init writes .work-graph/config.json, intent/, npm scripts, and optional IDE files (for example .cursor/mcp.json with npx -y @work-graph/mcp and WORKGRAPH_ROOT). Existing intent/index.bvc and architecture/main.bvc are preserved. Reload MCP in your IDE after npm install.',
      verify: 'Verify: npm run workgraph:doctor',
      guideLabel: 'Detailed install guide',
      guideHref: 'https://github.com/bvc-lang/work-graph/blob/main/docs/getting-started.md',
    };
  return `<section id="install" class="install-section">
    <div class="install-section__inner">
      <h2>${escapeHtml(copy.title)}</h2>
      <p class="install-lead">${escapeHtml(copy.lead)}</p>
      <div class="install-block">
        <p class="install-block-label">${escapeHtml(copy.agentLead)}</p>
        ${renderInstallCodeBlock(copy.agentQuote, locale)}
      </div>
      <div class="install-block">
        <p class="install-block-label">${escapeHtml(copy.projectDir)}</p>
        ${renderInstallCodeBlock(copy.script, locale)}
      </div>
      <div class="install-block">
        <p class="install-block-label">${escapeHtml(copy.openUi)}</p>
        ${renderInstallCodeBlock(copy.uiUrl, locale)}
      </div>
      <p class="install-detail">${escapeHtml(copy.detail)}</p>
      <p class="install-detail">${escapeHtml(copy.verify)}</p>
      <p class="install-guide"><a class="install-guide-link" href="${escapeAttr(copy.guideHref)}" target="_blank" rel="noopener noreferrer">${escapeHtml(copy.guideLabel)} →</a></p>
    </div>
  </section>`;
}

function renderComparisonStrip(locale) {
  const rows = locale === 'ru'
    ? [
      { iconName: 'robot', name: 'Обычный AI-воркфлоу', does: 'намерение в голове или чате', gap: 'готово = слова агента' },
      { iconName: 'kanban', name: 'Jira / Linear', does: 'планирует работу и статусы в облаке', gap: 'контракт и evidence не в git-репозитории' },
      { iconName: 'test-tube', name: 'CI / тесты', does: 'проверяет команды', gap: 'не знает зачем была задача' },
      { iconName: 'graph', name: 'Work Graph', does: 'связывает намерение, исполнение и память', gap: 'готово = evidence + verified gate' },
    ]
    : [
      { iconName: 'robot', name: 'Plain AI workflow', does: 'intent lives in heads or chats', gap: 'done = agent words' },
      { iconName: 'kanban', name: 'Jira / Linear', does: 'plans work and statuses in the cloud', gap: 'contract and evidence live outside the repo' },
      { iconName: 'test-tube', name: 'CI / tests', does: 'checks commands', gap: 'does not know why the task exists' },
      { iconName: 'graph', name: 'Work Graph', does: 'links intent, execution and memory', gap: 'done = evidence + verified gate' },
    ];
  return `<section class="comparison-strip">
    <h2 class="comparison-strip-heading">${escapeHtml(locale === 'ru' ? 'Ключевое отличие от обычного AI-воркфлоу' : 'What changes compared to a plain AI workflow')}</h2>
    <div class="comparison-strip-grid">${rows.map(({ iconName, name, does, gap }) => `<article class="comparison-strip-card">
      <span class="comparison-strip-icon" aria-hidden="true">${comparisonStripIcon(iconName)}</span>
      <h3 class="comparison-strip-card-title">${escapeHtml(name)}</h3>
      <p class="comparison-strip-card-lead">${escapeHtml(does)}</p>
      <p class="comparison-strip-card-gap">${escapeHtml(gap)}</p>
    </article>`).join('')}</div>
  </section>`;
}

function renderFaqToggleIcon() {
  return '<span class="faq-toggle" aria-hidden="true"></span>';
}

function renderHomeFaq(locale) {
  const items = getLocalizedFaq(locale).flatMap((category) => category.items);
  return `<section id="faq" class="home-faq" aria-labelledby="home-faq-title">
    <h2 id="home-faq-title" class="home-faq-title">FAQ</h2>
    <div class="faq-accordion">
      ${items.map((item) => `<details class="faq-item">
        <summary><span class="faq-question">${escapeHtml(item.question)}</span>${renderFaqToggleIcon()}</summary>
        <div class="faq-answer"><p>${escapeHtml(item.answer)}</p></div>
      </details>`).join('')}
    </div>
    <p class="faq-json-note">${escapeHtml(locale === 'ru' ? 'Для LLM и интеграций: ' : 'For LLMs and integrations: ')}<a href="/faq.json">/faq.json</a></p>
  </section>`;
}

function renderPageSectionsGrid(sections, copy) {
  return `<div class="content-layout page-sections">
    <div class="article-column">
      <div class="section-grid">${sections.map((section) => renderSection(section, copy)).join('')}</div>
    </div>
  </div>`;
}

function renderSiteSectionsBlock(block, copy, locale) {
  const sections = resolveSiteSections(block.sections ?? [], locale);
  const heading = block.title
    ? `<div class="wide-heading site-sections-block__heading"><h2>${escapeHtml(block.title)}</h2>${block.intro ? `<p>${escapeHtml(block.intro)}</p>` : ''}</div>`
    : '';
  return `${heading}${renderPageSectionsGrid(sections, copy)}`;
}

function featureColumnsToSiteSections(block) {
  return {
    title: block.title,
    intro: block.intro,
    sections: (block.items ?? []).map(({ iconName, heading, body, badges }) => ({
      title: heading,
      body,
      icon: iconName,
      badges,
    })),
  };
}

function renderPageLead(block) {
  return `<section class="page-lead wide-heading"><p>${escapeHtml(block.text)}</p></section>`;
}

function renderWorkflowPipeline(block) {
  return `<section class="workflow-pipeline">
    <div class="wide-heading">
      <h2>${escapeHtml(block.title)}</h2>
      ${block.intro ? `<p>${escapeHtml(block.intro)}</p>` : ''}
    </div>
    <ol class="workflow-pipeline-steps">${block.steps.map(({ label, detail, iconName }) => `<li>
      ${iconName ? `<span class="workflow-pipeline-icon" aria-hidden="true">${workflowPipelineIcon(iconName)}</span>` : ''}
      <span class="workflow-pipeline-label">${escapeHtml(label)}</span>
      <span class="workflow-pipeline-detail">${escapeHtml(detail)}</span>
    </li>`).join('')}</ol>
  </section>`;
}

function renderCompareBoundaries(block) {
  const muted = block.variant === 'muted';
  return `<section class="compare-boundaries${muted ? ' compare-boundaries--muted' : ''}">
    <h2 class="compare-boundaries-heading">${escapeHtml(block.title)}</h2>
    <div class="compare-boundaries-grid">${block.items.map(({ iconName, heading, body }) => `<article>
      <span class="compare-boundaries-icon" aria-hidden="true">${featureIcon(iconName)}</span>
      <h3>${escapeHtml(heading)}</h3>
      <p>${escapeHtml(body)}</p>
    </article>`).join('')}</div>
  </section>`;
}

function resolveSiteSections(sections, locale) {
  return sections.map((section) => {
    if (section.competitors) {
      const { competitors: _flag, ...rest } = section;
      return { ...rest, competitors: getPublicSiteCompetitors(locale) };
    }
    return section;
  });
}

function renderPageBlock(block, locale, copy) {
  switch (block.type) {
    case 'lead':
      return renderPageLead(block);
    case 'steps':
      return renderStepsSection(
        String(block.title ?? ''),
        (block.items ?? []).map((item) => [String(item.title ?? ''), String(item.body ?? '')]),
      );
    case 'pipeline':
      return renderWorkflowPipeline(block);
    case 'featureColumns':
      return renderSiteSectionsBlock(featureColumnsToSiteSections(block), copy, locale);
    case 'iconLabelGrid':
      return renderIconLabelGrid(block);
    case 'screenshotGallery':
      return renderScreenshotGallery(locale, block);
    case 'graphTrinity':
      return renderGraphTrinity(locale, block);
    case 'codeShowcase':
      return renderCodeShowcase(locale, block);
    case 'comparisonStrip':
      return renderComparisonStrip(locale);
    case 'siteSections':
      return renderSiteSectionsBlock(block, copy, locale);
    case 'boundaries':
      return renderCompareBoundaries(block);
    default:
      return '';
  }
}

function renderDocArticleFooter(doc, locale, copy) {
  const markdownHref = withLocalePath(`/docs/${doc.slug}.md`, locale);
  const markdownLabel = locale === 'ru' ? 'Версия Markdown' : 'Markdown version';
  const toolsLabel = copy.labels.relatedMcpTools;
  const tools = doc.relatedTools?.length
    ? `<p class="doc-article-tools">${escapeHtml(toolsLabel)}: ${doc.relatedTools.map((name) => `<code>${escapeHtml(name)}</code>`).join(', ')}</p>`
    : '';
  return `<footer class="doc-article-footer">
    <p><a class="doc-article-markdown-link" href="${escapeAttr(markdownHref)}">${escapeHtml(markdownLabel)}</a></p>
    ${tools}
  </footer>`;
}

function renderDocArticle(page, locale, copy) {
  const articleHtml = renderPublicDocArticleHtml(page.doc.slug, locale);
  if (!articleHtml) {
    return `<div class="page-flow page-flow--narrow"><p class="page-lead">${escapeHtml(locale === 'ru' ? 'Статья не найдена.' : 'Article not found.')}</p></div>`;
  }
  return `<div class="page-flow page-flow--narrow">
    <div class="doc-article">${articleHtml}${renderDocArticleFooter(page.doc, locale, copy)}</div>
  </div>`;
}

function renderPageBlocks(page, locale, copy) {
  if (page.kind === 'doc') {
    return renderDocArticle(page, locale, copy);
  }
  const blocks = page.blocks ?? [];
  if (blocks.length === 0 && page.sections?.length) {
    return `<div class="page-flow">${renderPageSectionsGrid(page.sections, copy)}</div>`;
  }
  return `<div class="page-flow">${blocks.map((block) => renderPageBlock(block, locale, copy)).join('')}</div>`;
}

function renderHomePageSections(locale, copy, page) {
  const introSections = page.sections.map((section) => renderSection(section, copy)).join('');
  return `${renderSteps(copy, locale)}
    ${renderInstallInstructions(locale)}
    ${renderGraphTrinity(locale)}
    ${renderScreenshotGallery(locale)}
    ${renderProductPillars(locale)}
    <div class="content-layout home-pillars">
      <div class="article-column">
        <div class="section-grid">${introSections}</div>
      </div>
    </div>
    ${renderCodeShowcase(locale)}
    ${renderComparisonStrip(locale)}
    ${renderAudience(locale, copy)}
    ${renderHomeFaq(locale)}`;
}

function renderYandexMetrika() {
  return `<!-- Yandex.Metrika counter -->
<script type="text/javascript">
    (function(m,e,t,r,i,k,a){
        m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();
        for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
        k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
    })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=109644335', 'ym');

    ym(109644335, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
</script>
<noscript><div><img src="https://mc.yandex.ru/watch/109644335" style="position:absolute; left:-9999px;" alt="" /></div></noscript>
<!-- /Yandex.Metrika counter -->`;
}

export function renderPublicSiteHtml(page, options = {}) {
  const locale = normalizeLocale(options.locale);
  const theme = normalizeTheme(options.theme);
  page.locale = locale;
  const copy = getPublicSiteCopy(locale);
  const jsonLd = JSON.stringify(publicSiteJsonLd(page));
  const installHref = page.kind === 'home' ? '#install' : `${withLocalePath('/', locale)}#install`;
  const primaryButton = renderUiButton({
    href: installHref,
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
  const documentTitle = page.documentTitle
    ?? (/^Work Graph\b/u.test(page.title) ? page.title : `${page.title} · Work Graph`);
  return `<!doctype html>
<html lang="${locale}" data-theme="${theme}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(documentTitle)}</title>
  <meta name="description" content="${escapeAttr(page.description)}">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/fonts/GraphikLCG/stylesheet.css">
  <link rel="stylesheet" href="/assets/design-tokens-workgraph-dark.css">
  <script>${renderPublicSiteBootstrapScript(locale, theme)}</script>
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
      --code-surface: #f4f5f7;
      --code-header: #ebecf0;
      --code-text: #172b4d;
      --site-section-spacing: clamp(96px, 10vw, 128px);
      --footer-heading-color: #172b4d;
      --footer-link-color: #44546f;
      --install-band-bg: rgb(var(--ui-accent-rgb, 0 82 204));
      --install-band-fg: #fff;
      --install-band-fg-muted: rgba(255, 255, 255, .88);
      --install-band-fg-soft: rgba(255, 255, 255, .82);
      --install-band-link-hover: #ebecf0;
      --install-code-bg: #fff;
      --install-code-border: rgba(255, 255, 255, .35);
      --install-code-fg: #172b4d;
      --install-copy-fg: #5e6c84;
      --install-copy-hover-bg: #deebff;
      --install-copy-hover-fg: #0052cc;
      --install-band-btn-bg: #fff;
      --install-band-btn-fg: rgb(var(--ui-accent-rgb, 0 82 204));
      --install-band-btn-hover-bg: #ebecf0;
      --install-band-btn-hover-fg: rgb(var(--ui-accent-hover-rgb, 0 101 255));
      --text-selection-bg: rgb(var(--ui-accent-rgb, 0 82 204));
      --text-selection-fg: #fff;
    }
    html[data-theme="dark"] {
      color-scheme: dark;
      --bg: #1d2125;
      --header-bg: #1d2125;
      --card: #282e33;
      --card-muted: #22272b;
      --text: #d6dde5;
      --muted: #9fadbc;
      --border: #3d474d;
      --accent: rgb(var(--ui-accent-rgb));
      --accent-soft: color-mix(in srgb, rgb(var(--ui-accent-rgb)) 22%, var(--card));
      --shadow: 0 1px 1px rgba(0, 0, 0, .32);
      --code-surface: #22272b;
      --code-header: #2c333a;
      --code-text: #dfe1e6;
      --footer-heading-color: #d6dde5;
      --footer-link-color: #9fadbc;
      --ui-accent-rgb: 29 122 252;
      --ui-accent-hover-rgb: 56 139 255;
      --install-band-bg: linear-gradient(180deg, #2a3138 0%, #252b32 100%);
      --install-band-fg: #f4f8ff;
      --install-band-fg-muted: rgba(244, 248, 255, .86);
      --install-band-fg-soft: rgba(244, 248, 255, .78);
      --install-band-link-hover: #cce0ff;
      --install-code-bg: var(--card);
      --install-code-border: var(--border);
      --install-code-fg: var(--code-text);
      --install-copy-fg: var(--muted);
      --install-copy-hover-bg: color-mix(in srgb, var(--accent) 20%, var(--card));
      --install-copy-hover-fg: var(--accent);
      --install-band-btn-bg: rgb(var(--ui-accent-rgb));
      --install-band-btn-fg: #fff;
      --install-band-btn-hover-bg: rgb(var(--ui-accent-hover-rgb));
      --install-band-btn-hover-fg: #fff;
      --text-selection-bg: rgb(var(--ui-accent-rgb));
      --text-selection-fg: #fff;
    }
    * { box-sizing: border-box; }
    ::selection { background: var(--text-selection-bg); color: var(--text-selection-fg); }
    ::-moz-selection { background: var(--text-selection-bg); color: var(--text-selection-fg); }
    body { margin: 0; background: var(--bg); color: var(--text); font-family: var(--brand-font-sans, 'Graphik LCG', ui-sans-serif, system-ui, sans-serif); line-height: 1.55; }
    a { color: var(--accent); }
    .site-header { border-color: var(--border); padding: 16px clamp(18px, 5vw, 72px); }
    .site-header { align-items: center; background: color-mix(in srgb, var(--header-bg) 96%, transparent); backdrop-filter: blur(14px); border-bottom: none; display: flex; flex-wrap: nowrap; gap: 22px; justify-content: space-between; position: sticky; top: 0; z-index: 10; }
    html[data-theme="dark"] .site-header { background: var(--bg); backdrop-filter: none; }
    .site-brand { align-items: center; display: inline-flex; flex: none; line-height: 0; text-decoration: none; }
    .site-brand-logo { display: block; height: 24px; max-width: min(188px, 42vw); width: auto; }
    .site-brand-emblem { display: none; height: 24px; width: auto; }
    html[data-theme="dark"] .site-brand-logo { filter: brightness(0) invert(1); }
    .site-nav { display: flex; flex: 1; flex-wrap: nowrap; gap: 2px; justify-content: center; min-width: 0; }
    .site-nav a { border-radius: 3px; color: var(--text); font-size: 1.0625rem; font-weight: 500; padding: 8px 12px; text-decoration: none; transition: color .15s ease; }
    .site-nav a:hover { background: transparent; color: var(--accent); }
    .site-nav a[aria-current="page"] { color: var(--accent); }
    .site-header-actions { align-items: center; display: flex; flex: none; gap: 8px; }
    .site-control-btn.site-nav-toggle { display: none; padding: 0; width: 36px; }
    .site-nav-toggle-bars { background: currentColor; border-radius: 1px; display: block; height: 2px; position: relative; width: 18px; }
    .site-nav-toggle-bars::before, .site-nav-toggle-bars::after { background: currentColor; border-radius: 1px; content: ''; height: 2px; left: 0; position: absolute; width: 18px; }
    .site-nav-toggle-bars::before { top: -6px; transition: transform .2s ease, top .2s ease; }
    .site-nav-toggle-bars::after { top: 6px; transition: transform .2s ease, top .2s ease; }
    .site-nav-toggle.is-open .site-nav-toggle-bars { background: transparent; }
    .site-nav-toggle.is-open .site-nav-toggle-bars::before { top: 0; transform: rotate(45deg); }
    .site-nav-toggle.is-open .site-nav-toggle-bars::after { top: 0; transform: rotate(-45deg); }
    .site-controls { align-items: center; display: flex; gap: 8px; }
    .site-control-btn { align-items: center; background: var(--card-muted); border: 1px solid var(--border); border-radius: 999px; color: var(--text); cursor: pointer; display: inline-flex; font: inherit; font-size: 13px; font-weight: 700; height: 36px; justify-content: center; line-height: 1; padding: 0; }
    .site-control-btn:hover { background: var(--card); border-color: color-mix(in srgb, var(--accent) 35%, var(--border)); }
    .site-control-btn.theme-toggle { width: 36px; }
    .site-control-btn.locale-toggle { letter-spacing: .03em; min-width: 42px; padding: 0 10px; }
    .site-github-btn { flex: none; text-decoration: none; width: 36px; }
    .site-github-icon-svg { display: block; }
    .site-github-icon-svg path { fill: currentColor; }
    .theme-toggle-icons { align-items: center; display: inline-flex; height: 18px; justify-content: center; position: relative; width: 18px; }
    .theme-toggle-icons .theme-icon { inset: 0; position: absolute; }
    html[data-theme="light"] .theme-icon-sun { display: none; }
    html[data-theme="dark"] .theme-icon-moon { display: none; }
    .site-icon, .header-theme-toggle-icon { fill: currentColor; flex: none; vertical-align: -0.15em; }
    .site-icon path, .header-theme-toggle-icon path { fill: currentColor; }
    html { overflow-x: clip; }
    .site-main { overflow-x: clip; padding: 0; }
    .site-shell { --site-band-inner-max: 1280px; --site-shell-inline-pad: clamp(18px, 5vw, 72px); margin: 0 auto; max-width: 1360px; padding: clamp(34px, 6vw, 78px) var(--site-shell-inline-pad); }
    .site-section-band { box-sizing: border-box; margin-inline: calc(50% - 50vw); max-width: 100vw; padding-block: clamp(48px, 6vw, 80px); padding-inline: max(var(--site-shell-inline-pad), calc((100vw - var(--site-band-inner-max)) / 2)); width: 100vw; }
    .site-section-band--muted { background: var(--card-muted); }
    .site-section-band--plain { background: var(--card); }
    .site-section-band--surface { background: var(--bg); }
    .site-shell > .site-section-band { margin-inline: calc(-1 * var(--site-shell-inline-pad)); max-width: none; padding-inline: var(--site-shell-inline-pad); width: auto; }
    .site-section-band__inner { margin-inline: auto; max-width: var(--site-band-inner-max); min-width: 0; width: 100%; }
    .hero { margin: 0 auto 48px; max-width: 980px; text-align: center; }
    .site-shell--home .hero { margin-bottom: clamp(28px, 4vw, 40px); }
    .site-shell--page .hero { margin-inline: 0; margin-bottom: clamp(32px, 4vw, 48px); max-width: 720px; text-align: left; }
    .site-shell--page .hero p { margin-inline: 0; max-width: 58ch; }
    .site-shell--page .hero .cta-row { justify-content: flex-start; }
    .site-shell--page .page-flow { margin-inline: 0; }
    .site-shell--page .page-flow.page-flow--narrow { margin-inline: 0; max-width: 720px; }
    .site-shell--page .content-layout { justify-content: start; margin-inline: 0; max-width: 100%; }
    .site-shell--page .section-heading { align-items: flex-start; }
    .site-shell--page .site-section { text-align: left; }
    .site-shell--page .doc-list { list-style: none; margin: 20px 0 0; padding: 0; }
    .site-shell--page .doc-list li { margin: 0 0 22px; }
    .site-shell--page .doc-list li:last-child { margin-bottom: 0; }
    .site-shell--page .doc-list a { font-size: 1.0625rem; font-weight: 600; }
    .site-shell--page .doc-list p { margin: 6px 0 0; max-width: 58ch; }
    .home-hero-preview-wrap { margin: 0 auto var(--site-section-spacing); max-width: 1040px; width: 100%; }
    .home-hero-preview-wrap .template-visual { margin: 0; }
    .home-flow, .page-flow { display: flex; flex-direction: column; gap: var(--site-section-spacing); margin: 0 auto; max-width: 1200px; width: 100%; }
    .page-flow .content-layout, .page-flow.page-flow--narrow .content-layout { margin-bottom: 0; max-width: 100%; }
    .page-flow.page-flow--narrow { max-width: 820px; }
    .home-flow > .graph-trinity, .home-flow > .icon-label-grid-section, .home-flow > .install-section, .home-flow > .site-section-band, .home-flow > .code-showcase, .home-flow > .comparison-strip, .home-flow > .home-faq, .home-flow > .steps-section, .page-flow > .page-lead, .page-flow > .steps-section, .page-flow > .workflow-pipeline, .page-flow > .graph-trinity, .page-flow > .icon-label-grid-section, .page-flow > .site-section-band, .page-flow > .code-showcase, .page-flow > .comparison-strip, .page-flow > .compare-boundaries, .page-flow > .content-layout, .page-flow > .site-sections-block__heading { margin-top: 0; }
    .home-flow > .content-layout { margin-bottom: 0; max-width: 1200px; }
    .home-flow .content-layout.home-pillars { justify-content: start; margin-inline: 0; max-width: 1200px; width: 100%; }
    .home-flow .home-pillars .section-grid { gap: clamp(32px, 4vw, 56px) clamp(28px, 4vw, 48px); grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .home-flow .home-pillars .site-section { border-bottom: 0; display: flex; flex-direction: column; padding: 0; text-align: left; }
    .home-flow .home-pillars .section-heading { align-items: flex-start; display: block; }
    .home-flow .home-pillars .section-heading h2 { font-size: clamp(1.375rem, 2.1vw, 1.75rem); font-weight: 800; letter-spacing: -.02em; line-height: 1.25; margin: 0 0 12px; }
    .home-flow .home-pillars .site-section p { flex: 1 1 auto; font-size: 1rem; line-height: 1.65; margin: 0; }
    .home-flow .home-pillars .badge-row { margin: 16px 0 0; }
    .site-sections-block__heading { margin-bottom: clamp(20px, 3vw, 32px); }
    .site-sections-block__heading p { color: var(--muted); font-size: 1.125rem; line-height: 1.7; margin: 0; max-width: 58ch; }
    h1 { font-size: clamp(2.25rem, 4.8vw, 4rem); letter-spacing: -.035em; line-height: 1.04; margin: 12px 0 18px; }
    h2 { font-size: clamp(1.35rem, 2.2vw, 1.9rem); letter-spacing: -.015em; line-height: 1.18; margin: 0 0 10px; }
    .hero p { color: var(--muted); font-size: 1.125rem; line-height: 1.7; margin-left: auto; margin-right: auto; max-width: 820px; }
    .hero .cta-row { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; margin-top: 24px; }
    .cta-row { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
    .template-visual { background: var(--card); border: 1px solid var(--border); border-radius: 4px; box-shadow: var(--shadow-raised); margin: 0 auto; max-width: 1040px; overflow: hidden; }
    .screenshot-hero img { display: block; height: auto; width: 100%; }
    .screenshot-hero figcaption { border-top: 1px solid var(--border); color: var(--muted); font-size: 13px; padding: 12px 16px; }
    .content-layout { display: grid; justify-content: center; margin-bottom: 24px; max-width: 820px; margin-left: auto; margin-right: auto; width: 100%; }
    .article-column { min-width: 0; width: 100%; }
    .section-grid { display: grid; gap: 48px; grid-template-columns: 1fr; margin-top: 0; }
    .site-section { background: transparent; border: 0; border-bottom: 1px solid var(--border); border-radius: 0; box-shadow: none; padding: 0 0 44px; }
    .section-heading { align-items: center; display: flex; gap: 10px; }
    .section-icon { align-items: center; background: var(--accent-soft); border-radius: 4px; box-sizing: border-box; color: var(--accent); display: inline-flex; flex: none; height: 34px; justify-content: center; width: 52px; }
    .site-section p, .doc-list p { color: var(--muted); font-size: 16px; line-height: 1.7; }
    .badge-row { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0; }
    .flow-list { display: grid; gap: 8px; padding-left: 22px; }
    .table-scroll { -webkit-overflow-scrolling: touch; margin-top: 16px; max-width: 100%; overflow-x: auto; }
    .table-scroll table { border-collapse: collapse; min-width: 720px; width: 100%; }
    .table-scroll th, .table-scroll td { border-top: 1px solid var(--border); padding: 8px 10px; text-align: left; vertical-align: top; white-space: normal; word-break: break-word; }
    .article-column, .site-section { max-width: 100%; min-width: 0; }
    .graph-trinity, .icon-label-grid-section, .code-showcase, .feature-columns-section, .comparison-strip, .home-faq { margin: var(--site-section-spacing) auto 0; max-width: 1200px; width: 100%; }
    .icon-label-grid-section { background: transparent; box-sizing: border-box; padding: 0; text-align: left; }
    .icon-label-grid-heading { margin: 0; max-width: 720px; }
    .icon-label-grid-heading h2 { font-size: clamp(1.5rem, 2.8vw, 2.125rem); letter-spacing: -.02em; margin: 0 0 16px; }
    .icon-label-grid-heading p { color: var(--muted); font-size: 1.125rem; line-height: 1.7; margin: 0; max-width: 58ch; }
    .icon-label-grid { column-gap: clamp(24px, 4vw, 48px); display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: clamp(44px, 6vw, 64px); row-gap: clamp(48px, 6vw, 72px); }
    .icon-label-grid-item { align-items: center; display: flex; flex-direction: row; gap: 16px; justify-content: flex-start; text-align: left; }
    .icon-label-grid-icon { display: block; flex: none; line-height: 0; }
    .icon-label-grid-icon-box { align-items: center; background: var(--accent); border-radius: 6px; color: #fff; display: inline-flex; height: 40px; justify-content: center; width: 56px; }
    .icon-label-grid-icon-svg { color: #fff; display: block; flex: none; }
    .icon-label-grid-icon-svg polyline { stroke: currentColor; }
    .icon-label-grid-label { color: var(--text); font-size: 1.375rem; font-weight: 700; letter-spacing: -.015em; line-height: 1.35; max-width: none; }
    .feature-columns-section { text-align: center; }
    .feature-columns-heading { font-size: clamp(1.35rem, 2.2vw, 1.9rem); letter-spacing: -.015em; margin: 0 0 clamp(32px, 5vw, 48px); }
    .feature-columns { display: grid; gap: clamp(28px, 4vw, 56px); grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .feature-column { align-items: center; display: flex; flex-direction: column; text-align: center; }
    .feature-column-icon { align-items: center; color: var(--accent); display: inline-flex; height: 56px; justify-content: center; margin-bottom: 20px; width: 56px; }
    .feature-column-icon-svg { display: block; flex: none; }
    .feature-column-icon-svg path { fill: currentColor; }
    .feature-column h3 { font-size: 1.375rem; font-weight: 700; letter-spacing: -.02em; line-height: 1.3; margin: 0 auto 12px; max-width: 24ch; }
    .feature-column p { color: var(--muted); font-size: 1rem; line-height: 1.65; margin: 0 auto; max-width: 36ch; }
    .screenshot-gallery { background: transparent; margin: 0; max-width: 100%; min-width: 0; overflow: hidden; padding: 0; width: 100%; }
    .screenshot-gallery-heading, .screenshot-switcher { margin-left: auto; margin-right: auto; max-width: 100%; min-width: 0; }
    .screenshot-gallery-heading { text-align: center; }
    .screenshot-gallery-heading h2 { color: var(--text); font-size: clamp(1.85rem, 3.4vw, 2.5rem); font-weight: 800; letter-spacing: -.03em; margin: 10px 0 18px; }
    .screenshot-gallery-lead { color: var(--muted); font-size: 1.125rem; line-height: 1.7; margin: 0 auto; max-width: 58ch; }
    .screenshot-switcher { margin-top: clamp(36px, 4vw, 52px); }
    .screenshot-tablist { display: flex; flex-wrap: wrap; gap: 8px 20px; justify-content: center; margin: 0 0 clamp(40px, 5vw, 56px); padding: 0; }
    .screenshot-tab { background: transparent; border: 0; border-radius: 999px; color: color-mix(in srgb, var(--text) 72%, transparent); cursor: pointer; font: inherit; font-size: 1.2rem; font-weight: 400; line-height: 1.2; padding: 8px 16px; transition: background .15s ease, color .15s ease; }
    .screenshot-tab:hover { color: var(--accent); }
    .screenshot-tab.is-active { background: var(--accent); color: #fff; }
    html[data-theme="dark"] .screenshot-tab.is-active { color: #fff; }
    .screenshot-panels { min-height: 320px; min-width: 0; position: relative; }
    .screenshot-panel { align-items: start; display: none; gap: clamp(24px, 3vw, 40px); grid-template-columns: minmax(0, 0.4fr) minmax(0, 0.6fr); min-width: 0; }
    .screenshot-panel.is-active { display: grid; }
    .screenshot-panel-copy { grid-column: 1; max-width: 28rem; padding-top: 16px; text-align: left; }
    .screenshot-panel-copy h3 { color: var(--text); font-size: clamp(1.625rem, 2.5vw, 2.25rem); font-weight: 800; letter-spacing: -.03em; line-height: 1.2; margin: 0 0 20px; }
    .screenshot-panel-copy p { color: var(--muted); font-size: 1.125rem; line-height: 1.7; margin: 0; }
    .screenshot-panel-visual { grid-column: 2; min-width: 0; width: 100%; }
    .screenshot-panel-frame { background: var(--card); border-radius: 12px; box-shadow: 0 12px 36px rgba(9, 30, 66, .12), 0 0 1px rgba(9, 30, 66, .16); overflow: hidden; }
    .screenshot-panel-frame img { border: 0; border-radius: 0; box-shadow: none; display: block; height: auto; width: 100%; }
    .wide-heading { max-width: 900px; }
    .page-lead p { color: var(--muted); font-size: 1.125rem; line-height: 1.7; margin: 0; max-width: 58ch; }
    .doc-article { max-width: 100%; }
    .doc-article .markdown-doc { margin: 0; }
    .doc-article .markdown-h2 { color: var(--text); font-size: clamp(1.375rem, 2.2vw, 1.75rem); font-weight: 800; letter-spacing: -.02em; line-height: 1.25; margin: clamp(32px, 4vw, 48px) 0 16px; }
    .doc-article .markdown-h2:first-child { margin-top: 0; }
    .doc-article .markdown-h3 { color: var(--text); font-size: 1.125rem; font-weight: 700; margin: 28px 0 12px; }
    .doc-article .markdown-p { color: var(--muted); font-size: 1.0625rem; line-height: 1.7; margin: 0 0 16px; max-width: 68ch; }
    .doc-article .markdown-list { color: var(--muted); font-size: 1.0625rem; line-height: 1.7; margin: 0 0 20px; max-width: 68ch; padding-left: 1.35rem; }
    .doc-article .markdown-list li { margin: 0 0 8px; }
    .doc-article .markdown-table-wrap { margin: 0 0 24px; max-width: 100%; overflow-x: auto; }
    .doc-article .markdown-table { border-collapse: collapse; font-size: 0.9375rem; min-width: min(100%, 640px); width: 100%; }
    .doc-article .markdown-table th, .doc-article .markdown-table td { border: 1px solid var(--border); padding: 10px 12px; text-align: left; vertical-align: top; }
    .doc-article .markdown-table th { background: var(--card-muted); color: var(--text); font-weight: 700; }
    .doc-article .markdown-table td { color: var(--muted); }
    .doc-article .markdown-code-block { background: var(--code-surface); border: 1px solid var(--border); border-radius: 8px; margin: 0 0 20px; max-width: 100%; overflow-x: auto; padding: 14px 16px; }
    .doc-article .markdown-code-block code { font-family: ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', monospace; font-size: 14px; line-height: 1.5; }
    .doc-article .inline-term, .doc-article code { background: var(--code-surface); border-radius: 4px; color: var(--code-text); font-family: ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', monospace; font-size: 0.9em; padding: 1px 5px; }
    .doc-article-footer { border-top: 1px solid var(--border); margin-top: clamp(40px, 5vw, 56px); padding-top: 24px; }
    .doc-article-footer p { color: var(--muted); font-size: 0.9375rem; line-height: 1.6; margin: 0 0 12px; }
    .doc-article-markdown-link { font-weight: 600; }
    .doc-article-tools code { margin-inline: 2px 6px; }
    .workflow-pipeline-steps { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); list-style: none; margin: 24px 0 0; padding: 0; }
    .workflow-pipeline-steps li { background: var(--card); border: 1px solid var(--border); border-radius: 8px; display: flex; flex-direction: column; gap: 8px; padding: 20px 18px; }
    .workflow-pipeline-icon { align-items: flex-start; color: var(--text); display: inline-flex; flex: none; margin-bottom: 4px; }
    .workflow-pipeline-icon-svg { display: block; flex: none; }
    .workflow-pipeline-icon-svg path { fill: currentColor; }
    .workflow-pipeline-label { color: var(--text); font-size: 0.9375rem; font-weight: 700; line-height: 1.35; }
    .workflow-pipeline-detail { color: var(--muted); font-size: 0.875rem; line-height: 1.5; }
    .compare-boundaries { margin-top: 0; }
    .compare-boundaries-heading { font-size: clamp(1.35rem, 2.4vw, 1.75rem); font-weight: 800; letter-spacing: -.02em; margin: 0 0 24px; }
    .compare-boundaries-grid { display: grid; gap: 20px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .compare-boundaries-grid article { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 22px; }
    .compare-boundaries--muted .compare-boundaries-grid article { background: var(--card-muted); }
    .compare-boundaries-icon { color: var(--text); display: inline-flex; margin-bottom: 14px; }
    .compare-boundaries-grid h3 { font-size: 1.125rem; font-weight: 700; margin: 0 0 8px; }
    .compare-boundaries-grid p { color: var(--muted); font-size: 0.9375rem; line-height: 1.6; margin: 0; }
    .graph-trinity { text-align: left; }
    .graph-trinity-heading { margin: 0 0 clamp(24px, 3vw, 36px); max-width: 58ch; }
    .graph-trinity-heading h2 { font-size: clamp(1.35rem, 2.2vw, 1.9rem); letter-spacing: -.015em; line-height: 1.2; margin: 0 0 12px; }
    .graph-trinity-heading p { color: var(--muted); font-size: 1.0625rem; line-height: 1.65; margin: 0; }
    .graph-flow { align-items: stretch; display: grid; gap: clamp(10px, 1.5vw, 16px); grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr); margin: 0; }
    .graph-flow-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; box-shadow: var(--shadow); box-sizing: border-box; display: flex; flex-direction: column; min-height: 100%; padding: clamp(20px, 2.5vw, 24px); }
    .graph-flow-step { align-items: center; background: var(--accent-soft); border-radius: 999px; color: var(--accent); display: inline-flex; flex: none; font-size: 0.875rem; font-weight: 800; height: 32px; justify-content: center; line-height: 1; margin: 0 0 14px; width: 32px; }
    .graph-flow-card-title { color: var(--text); font-size: 1.125rem; font-weight: 700; letter-spacing: -.01em; line-height: 1.3; margin: 0 0 6px; }
    .graph-flow-card-lead { color: var(--text); flex: none; font-size: 1rem; font-weight: 700; line-height: 1.35; margin: 0 0 10px; }
    .graph-flow-card-body { color: var(--muted); flex: 1 1 auto; font-size: 0.9375rem; line-height: 1.6; margin: 0; }
    .graph-flow-arrow { align-self: center; color: var(--accent); display: flex; flex: none; font-size: 1.5rem; font-weight: 800; justify-content: center; line-height: 1; padding: 0 2px; user-select: none; }
    .comparison-strip-heading { font-size: clamp(1.75rem, 3vw, 2.25rem); font-weight: 800; letter-spacing: -.03em; line-height: 1.2; margin: 0 0 clamp(28px, 4vw, 40px); }
    .comparison-strip-grid { display: grid; gap: 20px; grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .comparison-strip-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; box-shadow: none; display: flex; flex-direction: column; min-height: clamp(260px, 24vw, 320px); padding: 32px 28px 36px; }
    .comparison-strip-icon { align-items: flex-start; color: var(--text); display: inline-flex; flex: none; margin: 0 0 24px; min-height: 40px; }
    .comparison-strip-icon-svg { display: block; flex: none; }
    .comparison-strip-icon-svg path { fill: currentColor; }
    .comparison-strip-card-title { color: var(--text); font-size: 1.375rem; font-weight: 700; letter-spacing: -.02em; line-height: 1.3; margin: 0 0 12px; }
    .comparison-strip-card-lead { color: var(--muted); flex: 1 1 auto; font-size: 0.9375rem; line-height: 1.55; margin: 0; }
    .comparison-strip-card-gap { color: var(--text); flex: none; font-size: 0.9375rem; font-weight: 700; line-height: 1.45; margin: auto 0 0; padding-top: 16px; }
    .home-faq .wide-heading p, .code-showcase p { color: var(--muted); }
    .install-section { background: var(--install-band-bg); border: 0; border-radius: 0; box-sizing: border-box; color: var(--install-band-fg); margin: var(--site-section-spacing) calc(50% - 50vw) 0; max-width: none; padding: clamp(48px, 6vw, 72px) max(clamp(18px, 5vw, 72px), calc((100vw - 1280px) / 2)); width: 100vw; }
    .install-section__inner { margin-inline: auto; max-width: min(100%, 720px); width: 100%; }
    .install-section h2 { color: var(--install-band-fg); font-size: clamp(1.5rem, 2.8vw, 2rem); font-weight: 800; letter-spacing: -.02em; line-height: 1.15; margin: 0 0 14px; }
    .install-lead { color: var(--install-band-fg-muted); font-size: 1rem; line-height: 1.65; margin: 0 0 22px; }
    .install-block { margin: 0 0 20px; }
    .install-block-label { color: var(--install-band-fg); font-size: 0.9375rem; font-weight: 600; line-height: 1.4; margin: 0 0 8px; }
    .install-detail { color: var(--install-band-fg-soft); font-size: 0.9375rem; line-height: 1.65; margin: 0 0 12px; }
    .install-guide { margin: 4px 0 0; }
    .install-guide-link { color: var(--install-band-fg); font-size: 0.9375rem; font-weight: 600; text-decoration: underline; text-underline-offset: 3px; }
    .install-guide-link:hover { color: var(--install-band-link-hover); }
    .install-code { position: relative; }
    .install-section .install-code code { background: var(--install-code-bg); border: 1px solid var(--install-code-border); border-radius: 8px; color: var(--install-code-fg); display: block; font-family: ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', monospace; font-size: 15px; line-height: 1.45; padding: 14px 48px 14px 14px; white-space: pre-wrap; word-break: break-word; }
    .install-section .install-copy-btn { align-items: center; background: transparent; border: 0; border-radius: 6px; color: var(--install-copy-fg); cursor: pointer; display: inline-flex; height: 32px; justify-content: center; padding: 0; position: absolute; right: 6px; top: 6px; width: 32px; }
    .install-copy-btn-text { border: 0; clip: rect(0 0 0 0); height: 1px; margin: -1px; overflow: hidden; padding: 0; position: absolute; white-space: nowrap; width: 1px; }
    .install-copy-icon { display: block; flex: none; }
    .install-copy-icon polyline, .install-copy-icon rect { stroke: currentColor; }
    .install-section .install-copy-btn:hover { background: var(--install-copy-hover-bg); color: var(--install-copy-hover-fg); }
    .install-section .install-copy-btn.is-copied { background: var(--install-copy-hover-bg); color: var(--install-copy-hover-fg); }
    .code-showcase { align-items: start; display: grid; gap: 24px; grid-template-columns: minmax(0, .8fr) minmax(0, 1.2fr); }
    .code-tabs { display: grid; gap: 14px; }
    .code-tabs > div { background: var(--code-surface); border: 1px solid var(--border); border-radius: 4px; color: var(--code-text); overflow: hidden; }
    .code-tabs strong { background: var(--code-header); border-bottom: 1px solid var(--border); color: var(--code-text); display: block; font-size: 0.9375rem; padding: 12px 16px; }
    pre { background: transparent; color: inherit; margin: 0; overflow-x: auto; padding: 16px 18px; white-space: pre-wrap; }
    .code-tabs code { font-family: ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', monospace; font-size: 0.875rem; line-height: 1.55; }
    .code-tabs .code-hl-key { color: #0d7a6f; }
    .code-tabs .code-hl-string { color: #7b4bb7; }
    .code-tabs .code-hl-keyword { color: #0052cc; }
    .code-tabs .code-hl-number { color: #de350b; }
    .code-tabs .code-hl-punct { color: #6b778c; }
    .code-tabs .code-hl-comment { color: #6b778c; }
    html[data-theme="dark"] .code-tabs .code-hl-key { color: #4ec9b0; }
    html[data-theme="dark"] .code-tabs .code-hl-string { color: #c792ea; }
    html[data-theme="dark"] .code-tabs .code-hl-keyword { color: #569cd6; }
    html[data-theme="dark"] .code-tabs .code-hl-number { color: #f78c6c; }
    html[data-theme="dark"] .code-tabs .code-hl-punct { color: #a8b3cf; }
    html[data-theme="dark"] .code-tabs .code-hl-comment { color: #8b9cb3; }
    .home-faq { margin-left: auto; margin-right: auto; max-width: 920px; padding-bottom: 12px; text-align: center; }
    .home-faq-title { font-size: clamp(2.35rem, 5vw, 3.25rem); font-weight: 800; letter-spacing: -.03em; margin: 0 0 40px; text-align: center; }
    .faq-accordion { border-top: 1px solid var(--border); text-align: left; }
    .faq-item { border-bottom: 1px solid var(--border); }
    .faq-item summary { align-items: center; cursor: pointer; display: flex; gap: 14px; justify-content: space-between; list-style: none; padding: 22px 0; }
    .faq-item summary::-webkit-details-marker { display: none; }
    .faq-question { color: var(--text); flex: 1; font-size: 1.3125rem; font-weight: 600; line-height: 1.45; min-width: 0; transition: color .15s ease; }
    .faq-item summary:hover .faq-question { color: var(--accent); }
    .faq-toggle { align-items: center; background: var(--accent); border-radius: 50%; color: #fff; display: inline-flex; flex: none; height: 32px; justify-content: center; padding: 0; width: 32px; }
    .faq-toggle::before { content: '+'; display: block; font-size: 22px; font-weight: 500; line-height: 1; }
    .faq-item[open] .faq-toggle::before { content: '−'; font-size: 24px; }
    .faq-answer { padding: 0 0 24px; }
    .faq-answer p { color: var(--muted); font-size: 1.0625rem; line-height: 1.7; margin: 0; max-width: 820px; }
    .home-faq .faq-json-note { color: var(--muted); font-size: 13px; margin-top: 28px; text-align: center; }
    .steps-section { box-sizing: border-box; margin-top: 0; max-width: 1200px; padding: clamp(8px, 2vw, 24px) 0 0; width: 100%; }
    .steps-section h2 { font-size: clamp(1.75rem, 3.2vw, 2.375rem); font-weight: 800; letter-spacing: -.03em; line-height: 1.15; margin: 0 0 clamp(36px, 5vw, 56px); }
    .jira-steps { display: grid; gap: clamp(28px, 4vw, 40px) clamp(32px, 4vw, 56px); grid-template-columns: repeat(2, minmax(0, 1fr)); list-style: none; margin: 0; padding: 0; }
    .jira-steps li { align-items: start; display: grid; gap: 16px; grid-template-columns: 40px 1fr; }
    .step-number { align-items: center; color: var(--accent); display: inline-flex; flex: none; height: 32px; justify-content: center; margin-top: 2px; width: 32px; }
    .step-number-icon-svg { display: block; flex: none; }
    .step-number-icon-svg path { fill: currentColor; }
    .jira-steps h3 { color: var(--text); font-size: clamp(1.125rem, 2vw, 1.3125rem); font-weight: 400; line-height: 1.55; margin: 0; }
    .jira-steps h3 strong { font-weight: 700; }
    .bottom-cta { background: var(--install-band-bg); box-sizing: border-box; color: var(--install-band-fg); margin: clamp(80px, 10vw, 120px) calc(50% - 50vw) 0; max-width: none; padding: clamp(64px, 8vw, 96px) max(clamp(18px, 5vw, 72px), calc((100vw - 1280px) / 2)); text-align: center; width: 100vw; }
    .bottom-cta__inner { margin-inline: auto; max-width: 900px; }
    .bottom-cta h2 { color: var(--install-band-fg); font-size: clamp(2rem, 4vw, 2.75rem); font-weight: 800; letter-spacing: -.03em; line-height: 1.15; margin: 0 0 clamp(24px, 3vw, 36px); }
    .bottom-cta .wg-btn.wg-btn--primary { background: var(--install-band-btn-bg); border-color: transparent; color: var(--install-band-btn-fg); }
    .bottom-cta .wg-btn.wg-btn--primary:hover:not(:disabled) { background: var(--install-band-btn-hover-bg); color: var(--install-band-btn-hover-fg); }
    .site-footer { background: var(--bg); color: var(--muted); margin-top: 0; padding: clamp(48px, 6vw, 72px) clamp(18px, 5vw, 72px) clamp(32px, 4vw, 48px); }
    .site-footer__panel { background: var(--card-muted); border-radius: 16px; margin: 0 auto; max-width: 1200px; padding: clamp(40px, 5vw, 56px) clamp(28px, 4vw, 48px); }
    .site-footer__grid { align-items: start; display: grid; gap: clamp(32px, 4vw, 48px); grid-template-columns: minmax(180px, 1.2fr) repeat(3, minmax(0, 1fr)); }
    .site-footer__brand { display: flex; flex-direction: column; gap: 24px; }
    .site-footer__logo { display: inline-block; line-height: 0; text-decoration: none; }
    .site-footer__logo img { display: block; height: 22px; max-width: min(168px, 100%); width: auto; }
    html[data-theme="dark"] .site-footer__logo img { filter: brightness(0) invert(1); }
    .site-footer__brand-links { display: flex; flex-direction: column; gap: 10px; }
    .site-footer__brand-links a, .footer-column a { color: var(--footer-link-color); display: block; font-size: 1rem; font-weight: 400; line-height: 1.5; text-decoration: none; }
    .site-footer__brand-links a:hover, .footer-column a:hover { color: var(--accent); text-decoration: none; }
    .footer-columns { display: contents; }
    .footer-column { display: flex; flex-direction: column; }
    .footer-column h3 { color: var(--footer-heading-color); font-size: 0.9375rem; font-weight: 700; letter-spacing: .05em; line-height: 1.35; margin: 0 0 20px; text-transform: uppercase; }
    .footer-column a { margin: 0 0 10px; }
    .footer-column a:last-child { margin-bottom: 0; }
    .site-footer__bottom { align-items: center; display: flex; flex-wrap: wrap; gap: 16px 28px; justify-content: space-between; margin: 28px auto 0; max-width: 1200px; }
    .site-footer__copy { color: var(--muted); font-size: 1rem; line-height: 1.5; margin: 0; }
    .site-footer__legal { align-items: center; display: flex; flex-wrap: wrap; gap: 8px 24px; }
    .site-footer__legal a { color: var(--footer-link-color); font-size: 1rem; font-weight: 400; text-decoration: none; }
    .site-footer__legal a:hover { color: var(--accent); }
    ${UI_BUTTON_CSS}
    .site-main .wg-btn, .bottom-cta .wg-btn { border-radius: 999px; font-weight: 600; }
    .site-main .wg-btn--lg, .bottom-cta .wg-btn--lg { font-size: 1.0625rem; padding: 12px 22px; }
    .site-main .wg-btn--md { font-size: 0.9375rem; padding: 10px 18px; }
    .site-main .wg-btn--sm { font-size: 0.875rem; padding: 8px 16px; }
    .site-control-btn { font-size: 0.875rem; font-weight: 600; }
    ${UI_BADGE_CSS}
    @media (min-width: 1025px) and (max-width: 1280px) {
      .site-header { gap: 14px; }
      .site-nav a { font-size: 0.9375rem; padding: 8px 8px; }
    }
    @media (max-width: 1024px) {
      html.is-nav-scroll-locked { overflow: hidden; }
      .site-header { align-items: center; backdrop-filter: none; background: var(--bg); flex-wrap: nowrap; gap: 0 12px; }
      html[data-theme="dark"] .site-header { background: var(--bg); }
      .site-brand { flex: 1; min-width: 0; }
      .site-brand .site-brand-logo { display: none; }
      .site-brand .site-brand-emblem { display: block; height: 24px; }
      .site-header-actions { flex: none; margin-left: auto; }
      .site-control-btn.site-nav-toggle { display: inline-flex; }
      .site-nav { display: none; flex: none; min-width: 0; }
      .site-header.is-nav-open { align-content: start; background: var(--bg); box-sizing: border-box; display: grid; gap: 0 12px; grid-template-areas: "brand actions" "nav nav"; grid-template-columns: 1fr auto; grid-template-rows: auto minmax(0, 1fr); height: 100dvh; inset: 0; padding: calc(16px + env(safe-area-inset-top, 0px)) clamp(18px, 5vw, 32px) max(16px, env(safe-area-inset-bottom, 0px)); position: fixed; width: 100vw; z-index: 110; }
      .site-header.is-nav-open .site-brand { align-self: center; grid-area: brand; }
      .site-header.is-nav-open .site-header-actions { align-self: center; grid-area: actions; margin-left: 0; }
      .site-header.is-nav-open .site-nav { align-items: stretch; background: transparent; border-top: none; box-sizing: border-box; display: flex; flex-direction: column; gap: 0; grid-area: nav; height: auto; inset: auto; justify-content: flex-start; margin: 4px 0 0; max-height: none; min-height: 0; overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain; padding: 0; position: relative; width: 100%; -webkit-overflow-scrolling: touch; }
      .site-header.is-nav-open .site-nav a { font-size: 1.25rem; padding: 10px 4px; white-space: normal; }
      h1 { font-size: clamp(2rem, 12vw, 3.1rem); }
      .site-section-band, .install-section, .bottom-cta { padding-inline: var(--site-shell-inline-pad); }
      .screenshot-tab { font-size: 1.125rem; padding: 7px 14px; }
      .screenshot-tablist { flex-wrap: nowrap; justify-content: flex-start; margin-bottom: 28px; -webkit-overflow-scrolling: touch; overflow-x: auto; padding-bottom: 6px; scrollbar-width: thin; }
      .screenshot-panel.is-active { grid-template-columns: 1fr; }
      .screenshot-panel-copy, .screenshot-panel-visual { grid-column: 1; }
      .screenshot-panel-copy { max-width: none; }
      .screenshot-panel-visual { margin-top: 8px; }
      .jira-steps { gap: 28px; grid-template-columns: 1fr; }
      .home-flow .home-pillars .section-grid { gap: 40px; grid-template-columns: 1fr; }
      .graph-flow { gap: 16px; grid-template-columns: 1fr; }
      .graph-flow-arrow { justify-self: center; padding: 4px 0; transform: rotate(90deg); }
      .icon-label-grid, .install-section, .code-showcase, .feature-columns, .comparison-strip-grid, .workflow-pipeline-steps, .compare-boundaries-grid { grid-template-columns: 1fr; }
      .site-footer__grid { grid-template-columns: 1fr; }
      .footer-columns { display: grid; gap: 32px; grid-template-columns: 1fr; }
      .icon-label-grid { column-gap: 20px; grid-template-columns: repeat(2, minmax(0, 1fr)); row-gap: 48px; }
      .icon-label-grid-label { max-width: none; }
      .feature-column h3, .feature-column p { max-width: none; }
    }
  </style>
</head>
<body>
  <header class="site-header">
    ${renderSiteBrand(locale)}
    ${renderNav(locale, page.route ?? '/')}
    <div class="site-header-actions">
      ${renderHeaderGithubButton(locale)}
      ${renderThemeLocaleControls(locale, theme)}
      ${renderNavToggle(locale)}
    </div>
  </header>
  <main class="site-main">
    <article class="site-shell${page.kind === 'home' ? ' site-shell--home' : ' site-shell--page'}">
      <header class="hero">
        <h1>${escapeHtml(page.title)}</h1>
        <p>${escapeHtml(page.description)}</p>
        ${page.kind === 'home' ? `<div class="cta-row">
          ${primaryButton}
          ${secondaryButton}
        </div>` : ''}
      </header>
      ${page.kind === 'home' ? `<div class="home-hero-preview-wrap">${renderHeroVisual(locale, theme)}</div>` : ''}
      ${page.kind === 'product' ? `<div class="home-hero-preview-wrap">${renderScreenshotGallery(locale, getProductScreenshotGalleryOptions(locale))}</div>` : ''}
      ${page.kind === 'home'
    ? `<div class="home-flow">${renderHomePageSections(locale, copy, page)}</div>`
    : renderPageBlocks(page, locale, copy)}
    </article>
    ${page.kind === 'home' ? renderBottomCta(copy, locale, theme) : ''}
  </main>
  ${renderFooter(locale)}
  <script>${renderPublicSiteControlsScript()}</script>
  ${renderYandexMetrika()}
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

  const locale = normalizeLocale(
    url.searchParams.get('lang') ?? localeFromPathname(url.pathname),
  );
  const theme = normalizeTheme(url.searchParams.get('theme') ?? 'light');
  const routePathname = stripLocalePathPrefix(url.pathname);

  if (routePathname === '/llms.txt') {
    sendText(response, 200, buildLlmsTxt(), 'text/plain');
    return true;
  }

  if (routePathname === '/.well-known/mcp.json') {
    sendJson(response, 200, buildMcpDiscovery());
    return true;
  }

  if (routePathname === '/faq.json') {
    sendJson(response, 200, buildFaqJsonLd(locale));
    return true;
  }

  if (routePathname === '/api/docs/bvc-authoring-context') {
    sendJson(response, 200, buildDocsContext('bvc-authoring'));
    return true;
  }

  if (routePathname === '/api/docs/mcp-tools-context') {
    sendJson(response, 200, buildDocsContext('mcp-tools'));
    return true;
  }

  if (routePathname === '/api/docs/errors-context') {
    sendJson(response, 200, buildDocsContext('errors'));
    return true;
  }

  const markdownMatch = routePathname.match(/^\/docs\/([^/.]+)\.md$/u);
  if (markdownMatch) {
    const markdown = renderPublicDocMarkdown(markdownMatch[1], locale);
    if (markdown == null) return false;
    sendText(response, 200, markdown, 'text/markdown');
    return true;
  }

  const bvcExampleMatch = routePathname.match(/^\/docs\/([^/.]+)\.bvc\.example$/u);
  if (bvcExampleMatch) {
    const example = renderBvcExample(bvcExampleMatch[1]);
    if (example == null) return false;
    sendText(response, 200, example, 'text/plain');
    return true;
  }

  if (routePathname === '/docs.md') {
    const docsPrefix = locale === 'en' ? '/en' : '';
    const body = `# Work Graph Docs\n\n${PUBLIC_DOCS.map((doc) => {
      const localized = getPublicSitePage(`/docs/${doc.slug}`, locale);
      return `- [${localized.title}](${docsPrefix}/docs/${doc.slug}.md): ${localized.description}`;
    }).join('\n')}\n`;
    sendText(response, 200, body, 'text/markdown');
    return true;
  }

  if (url.searchParams.get('format') === 'markdown') {
    const docSlug = routePathname === '/docs' ? null : routePathname.match(/^\/docs\/([^/.]+)$/u)?.[1];
    const markdown = docSlug
      ? renderPublicDocMarkdown(docSlug, locale)
      : `# Work Graph\n\n${buildLlmsTxt()}`;
    if (markdown == null) return false;
    sendText(response, 200, markdown, 'text/markdown');
    return true;
  }

  const page = getPublicSitePage(routePathname, locale);
  if (!page) return false;
  sendText(response, 200, renderPublicSiteHtml(page, { locale, theme, route: routePathname }), 'text/html');
  return true;
}

