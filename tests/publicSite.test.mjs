import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { promisify } from 'node:util';

import { createBacklogUiServer } from '../src/workGraphBacklogUiServer.mjs';
import { createPublicSiteServer } from '../src/publicSiteStandaloneServer.mjs';
import {
  buildDocsContext,
  buildLlmsTxt,
  buildMcpDiscovery,
  getPublicSitePage,
  PUBLIC_SITE_ROUTES,
  renderPublicDocMarkdown,
} from '../src/publicSiteContent.mjs';

const SAMPLE_BACKLOG = `#Задача_public_site_fixture<[
Базис:
  Fixture.
Вектор:
  Fixture.
Цель:
  Fixture.

Метки:
  atom.profile: work_item
  work.id: public-site-fixture
  work.status: backlog
]>`;

const execFileAsync = promisify(execFile);

describe('publicSiteContent', () => {
  it('defines public pages and machine-readable docs', () => {
    const home = getPublicSitePage('/', 'en');
    assert.match(home.title, /navigator for AI development/u);
    assert.equal(home.documentTitle, 'Work Graph — navigator for AI development');
    assert.equal(getPublicSitePage('/', 'ru').documentTitle, 'Work Graph — навигатор для AI-разработки');
    assert.match(home.description, /manageable project map/u);

    const ruHome = getPublicSitePage('/', 'ru');
    assert.match(ruHome.title, /навигатор для AI-разработки/ui);
    assert.equal(ruHome.sections[0].items, undefined);

    assert.match(buildLlmsTxt(), /Contract platform/u);
    assert.match(renderPublicDocMarkdown('bvc-spec'), /# BVC Atom Specification/u);
    assert.match(renderPublicDocMarkdown('bvc-spec'), /## What is a BVC atom/u);
    assert.doesNotMatch(renderPublicDocMarkdown('bvc-spec'), /related_tools:/u);
    assert.match(renderPublicDocMarkdown('bvc-spec', 'ru'), /## Что такое BVC-атом/u);

    const discovery = buildMcpDiscovery();
    assert.equal(discovery.servers[0].name, 'workgraph-mcp');
    assert.ok(discovery.servers[0].tools.some((tool) => tool.name === 'create_work_item'));

    assert.equal(buildDocsContext('bvc-authoring').schema, 'workgraph.docs-context.bvc-authoring.v1');
    assert.equal(buildDocsContext('mcp-tools').schema, 'workgraph.docs-context.mcp-tools.v1');
    assert.equal(buildDocsContext('errors').schema, 'workgraph.docs-context.errors.v1');
    assert.ok(!PUBLIC_SITE_ROUTES.includes('/onebase'));
    assert.equal(getPublicSitePage('/onebase', 'ru'), null);
  });
});

describe('public site HTTP routes', () => {
  it('serves landing, assets, llms, markdown, MCP discovery and context endpoints', async () => {
    const server = createPublicSiteServer();

    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => {
        server.off('error', reject);
        resolve();
      });
    });

    try {
      const baseUrl = `http://127.0.0.1:${server.address().port}`;

      const landing = await fetch(`${baseUrl}/`);
      assert.equal(landing.status, 200);
      assert.match(landing.headers.get('content-type') || '', /text\/html/u);
      const landingHtml = await landing.text();
      assert.match(landingHtml, /lang="ru"/u);
      assert.match(landingHtml, /mc\.yandex\.ru\/metrika\/tag\.js\?id=109644335/u);
      assert.match(landingHtml, /data-theme-toggle/u);
      assert.match(landingHtml, /data-locale-toggle/u);
      assert.match(landingHtml, /class="site-control-btn locale-toggle"[^>]*>En</u);
      assert.match(landingHtml, /class="site-control-btn theme-toggle"/u);
      assert.match(landingHtml, /class="site-control-btn site-github-btn"/u);
      assert.match(landingHtml, /class="site-github-icon-svg"/u);
      assert.match(landingHtml, /href="https:\/\/github\.com\/bvc-lang\/work-graph"/u);
      assert.doesNotMatch(landingHtml, /locale-link/u);
      assert.match(landingHtml, /href="\/product"/u);
      assert.doesNotMatch(landingHtml, /href="\/en\/product"/u);

      const landingEn = await fetch(`${baseUrl}/en`);
      assert.equal(landingEn.status, 200);
      const landingEnHtml = await landingEn.text();
      assert.match(landingEnHtml, /lang="en"/u);
      assert.match(landingEnHtml, /class="site-control-btn locale-toggle"[^>]*>Ru</u);
      assert.match(landingEnHtml, /href="\/en\/product"/u);
      assert.match(landingHtml, /навигатор для AI-разработки/ui);
      assert.match(landingHtml, /Три графа — один цикл разработки/u);
      assert.match(landingHtml, /Граф исполнения/u);
      assert.match(landingHtml, /Граф памяти/u);
      assert.match(landingHtml, /icon-label-grid/u);
      assert.match(landingHtml, /Аналитика/u);
      assert.match(landingHtml, /От чат-воркфлоу к контрактному воркфлоу/u);
      assert.match(landingHtml, /class="comparison-strip-icon"/u);
      assert.match(landingHtml, /Ключевое отличие от обычного AI-воркфлоу/u);
      assert.doesNotMatch(landingHtml, /Не IDE, не PM SaaS, не слой памяти/u);
      assert.match(landingHtml, /Контрактный контур/u);
      assert.match(landingHtml, /claim_work_item/u);
      assert.match(landingHtml, /class="code-block language-bvc"/u);
      assert.match(landingHtml, /code-hl-keyword">#ImplementTraceLinksV1/u);
      assert.match(landingHtml, /Для кого Work Graph/u);
      assert.match(landingHtml, /Как установить Work Graph/u);
      assert.match(landingHtml, /Для агентов:/u);
      assert.match(landingHtml, /https:\/\/www\.npmjs\.com\/package\/@work-graph\/cli/u);
      assert.match(landingHtml, /Установи Work Graph в этот проект/u);
      assert.match(landingHtml, /npx @work-graph\/cli init \./u);
      assert.match(landingHtml, /npm run workgraph:ui/u);
      assert.match(landingHtml, /localhost:4177/u);
      assert.match(landingHtml, /workgraph:doctor/u);
      assert.doesNotMatch(landingHtml, /--workspace/u);
      assert.match(landingHtml, /install-copy-btn/u);
      assert.match(landingHtml, /data-copy-text=/u);
      assert.match(landingHtml, /Копировать/u);
      assert.match(landingHtml, /href="#install"/u);
      assert.doesNotMatch(landingHtml, /Открыть приложение/u);
      assert.doesNotMatch(landingHtml, /Запустить локально/u);
      assert.doesNotMatch(landingHtml, /\/onebase/u);
      assert.match(landingHtml, /Задача читается человеком, git и агентом/u);
      assert.doesNotMatch(landingHtml, /class="eyebrow"/u);
      assert.match(landingHtml, /id="faq"/u);
      assert.match(landingHtml, /class="home-faq-title">FAQ</u);
      assert.match(landingHtml, /class="faq-accordion"/u);
      assert.match(landingHtml, /class="faq-toggle"/u);
      assert.match(landingHtml, /Work Graph — это тасктрекер\?/u);
      assert.match(landingHtml, /PolicyViolation/u);
      assert.match(landingHtml, /FAQPage/u);
      assert.doesNotMatch(landingHtml, /href="\/faq"/u);
      assert.doesNotMatch(landingHtml, /Decision \(AN\)/u);
      assert.doesNotMatch(landingHtml, /Evidence per task/u);
      assert.match(landingHtml, /workGraphPublicSiteLocale/u);
      assert.match(landingHtml, /workGraphPublicSiteTheme/u);
      assert.match(landingHtml, /rel="icon" href="\/assets\/favicon\.svg" type="image\/svg\+xml"/u);
      assert.match(landingHtml, /site-brand-logo[^>]+src="\/assets\/workgraph-logo\.svg"/u);
      assert.match(landingHtml, /site-brand-emblem[^>]+src="\/assets\/workgraph-emblem\.svg"/u);
      assert.match(landingHtml, /wg-btn/u);
      assert.match(landingHtml, /wg-badge/u);
      assert.match(landingHtml, /site-icon/u);
      assert.match(landingHtml, /template-visual/u);
      assert.match(landingHtml, /screenshot-gallery/u);
      assert.match(landingHtml, /site-section-band site-section-band--muted/u);
      assert.match(landingHtml, /data-screenshot-switcher/u);
      assert.match(landingHtml, /screenshot-tablist/u);
      assert.doesNotMatch(landingHtml, /<div class="screenshot-grid">/u);
      assert.doesNotMatch(landingHtml, /<div class="screenshot-panels">[\s\S]*?work-graph-kanban-board-dark\.png/u);
      assert.match(landingHtml, /data-dark-src="\/assets\/img\/work-graph-kanban-board-dark\.png"/u);
      assert.match(landingHtml, /work-graph-kanban-board-light\.png/u);
      assert.match(landingHtml, /work-graph-verification-matrix\.png/u);
      assert.match(landingHtml, /work-graph-memory-list\.png/u);
      assert.doesNotMatch(landingHtml, /related-templates/u);
      assert.doesNotMatch(landingHtml, /Связанные шаблоны/u);
      assert.doesNotMatch(landingHtml, /template-aside/u);
      assert.match(landingHtml, /bottom-cta/u);
      assert.match(landingHtml, /max-width: 1360px/u);
      assert.match(landingHtml, /max-width: 1200px/u);
      assert.match(landingHtml, /--shadow-raised/u);
      assert.match(landingHtml, /border-bottom: 1px solid var\(--border\)/u);
      assert.match(landingHtml, /border-radius: 4px/u);
      assert.match(landingHtml, /@media \(max-width: 1024px\)/u);
      assert.match(landingHtml, /application\/ld\+json/u);
      assert.doesNotMatch(landingHtml, /href="\/app"/u);

      const llms = await fetch(`${baseUrl}/llms.txt`);
      assert.equal(llms.status, 200);
      assert.match(llms.headers.get('content-type') || '', /text\/plain/u);
      assert.match(await llms.text(), /\/docs\/bvc-spec/u);

      const markdownEn = await fetch(`${baseUrl}/en/docs/bvc-spec.md`);
      assert.equal(markdownEn.status, 200);
      assert.match(markdownEn.headers.get('content-type') || '', /text\/markdown/u);
      assert.match(await markdownEn.text(), /BVC Atom Specification/u);

      const bvcExample = await fetch(`${baseUrl}/docs/bvc-spec.bvc.example`);
      assert.equal(bvcExample.status, 200);
      assert.match(await bvcExample.text(), /#Задача_add_llms_txt/u);

      const mcp = await fetch(`${baseUrl}/.well-known/mcp.json`);
      assert.equal(mcp.status, 200);
      const mcpPayload = await mcp.json();
      assert.equal(mcpPayload.servers[0].name, 'workgraph-mcp');

      const context = await fetch(`${baseUrl}/api/docs/mcp-tools-context`);
      assert.equal(context.status, 200);
      assert.equal((await context.json()).schema, 'workgraph.docs-context.mcp-tools.v1');

      const faqPage = await fetch(`${baseUrl}/faq`);
      assert.equal(faqPage.status, 404);

      const faqJson = await fetch(`${baseUrl}/faq.json`);
      assert.equal(faqJson.status, 200);
      const faqPayload = await faqJson.json();
      assert.equal(faqPayload['@type'], 'FAQPage');
      assert.ok(faqPayload.mainEntity.some((entry) => entry.name === 'Что такое BVC?'));

      const product = await fetch(`${baseUrl}/product`);
      assert.equal(product.status, 200);
      const productHtml = await product.text();
      assert.match(productHtml, /<div class="page-flow">/u);
      assert.doesNotMatch(productHtml, /page-lead wide-heading/u);
      assert.match(productHtml, /Легкий таск-трекер для вашего проекта/u);
      assert.match(productHtml, /Полностью локально и в Git/u);
      assert.match(productHtml, /Интеграция через MCP/u);
      assert.match(productHtml, /Как выглядит Work Graph/u);
      assert.match(productHtml, /data-screenshot-switcher/u);
      assert.match(productHtml, /Пять шагов в одном репозитории/u);
      assert.match(productHtml, /Экраны, с которыми вы работаете/u);
      assert.match(productHtml, /screenshot-gallery/u);
      assert.doesNotMatch(productHtml, /Как начать с Work Graph/u);
      assert.match(productHtml, /home-hero-preview-wrap[\s\S]*?screenshot-gallery/u);
      assert.doesNotMatch(productHtml, /class="cta-row"/u);
      assert.doesNotMatch(productHtml, /class="bottom-cta"/u);
      assert.doesNotMatch(productHtml, /Готовы поставить Work Graph локально/u);
      assert.match(productHtml, /локальный таск-трекер в git: доска, бэклог и статусы/u);

      const evidence = await fetch(`${baseUrl}/evidence-ledger`);
      assert.equal(evidence.status, 200);
      const evidenceHtml = await evidence.text();
      assert.doesNotMatch(evidenceHtml, /page-lead wide-heading/u);
      assert.doesNotMatch(evidenceHtml, /class="cta-row"/u);
      assert.match(evidenceHtml, /Журнал доказательств отвечает на один вопрос/u);
      assert.match(evidenceHtml, /Что считается доказательством/u);
      assert.match(evidenceHtml, /От захвата до done/u);
      assert.match(evidenceHtml, /Проверки живут в контракте/u);
      assert.match(evidenceHtml, /assert_task_ready_for_done/u);

      const compare = await fetch(`${baseUrl}/compare`);
      assert.equal(compare.status, 200);
      const compareHtml = await compare.text();
      assert.match(compareHtml, /Cursor \/ Claude Code/u);
      assert.doesNotMatch(compareHtml, /class="cta-row"/u);
      assert.match(compareHtml, /Часто рядом с IDE-агентом стоят Jira или Linear/u);
      assert.match(compareHtml, /comparison-strip/u);
      assert.match(compareHtml, /Когда Work Graph уместен/u);
      assert.match(compareHtml, /Чем Work Graph не является/u);
      assert.doesNotMatch(compareHtml, /Для кого Work Graph/u);

      const ruCompare = await fetch(`${baseUrl}/compare`);
      assert.equal(ruCompare.status, 200);
      const ruCompareHtml = await ruCompare.text();
      assert.match(ruCompareHtml, /Доказательства по задаче/u);
      assert.doesNotMatch(ruCompareHtml, /Evidence per task/u);

      const ruMarkdown = await fetch(`${baseUrl}/docs/bvc-spec.md`);
      assert.equal(ruMarkdown.status, 200);
      const ruMarkdownBody = await ruMarkdown.text();
      assert.match(ruMarkdownBody, /Спецификация BVC-атома/u);
      assert.match(ruMarkdownBody, /## Что такое BVC-атом/u);

      const bvcDoc = await fetch(`${baseUrl}/docs/bvc-spec`);
      assert.equal(bvcDoc.status, 200);
      const bvcDocHtml = await bvcDoc.text();
      assert.match(bvcDocHtml, /class="doc-article"/u);
      assert.match(bvcDocHtml, /markdown-doc/u);
      assert.match(bvcDocHtml, /Что такое BVC-атом/u);
      assert.doesNotMatch(bvcDocHtml, /related_tools:/u);

      const docsIndex = await fetch(`${baseUrl}/docs`);
      assert.equal(docsIndex.status, 200);
      const docsIndexHtml = await docsIndex.text();
      assert.match(docsIndexHtml, /doc-list/u);

      const enCompare = await fetch(`${baseUrl}/en/compare`);
      assert.equal(enCompare.status, 200);
      assert.match(await enCompare.text(), /Evidence per task/u);

      const logo = await fetch(`${baseUrl}/assets/workgraph-logo.svg`);
      assert.equal(logo.status, 200);
      assert.match(logo.headers.get('content-type') || '', /image\/svg\+xml/u);

      const emblem = await fetch(`${baseUrl}/assets/workgraph-emblem.svg`);
      assert.equal(emblem.status, 200);
      assert.match(emblem.headers.get('content-type') || '', /image\/svg\+xml/u);

      const screenshot = await fetch(`${baseUrl}/assets/img/work-graph-kanban-board-light.png`);
      assert.equal(screenshot.status, 200);
      assert.match(screenshot.headers.get('content-type') || '', /image\/png/u);
    } finally {
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  });
});

describe('backlog UI HTTP routes', () => {
  it('keeps the app server separate from the public site', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'wg-backlog-ui-'));
    await writeFile(join(cwd, 'backlog.bvc'), SAMPLE_BACKLOG, 'utf8');
    const server = createBacklogUiServer({
      cwd,
      backlogPath: 'backlog.bvc',
      journalPath: 'worker-runs.jsonl',
      auditPath: 'work/daemon-audit.jsonl',
      registryPath: join(cwd, 'workspaces.json'),
    });

    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => {
        server.off('error', reject);
        resolve();
      });
    });

    try {
      const baseUrl = `http://127.0.0.1:${server.address().port}`;
      const root = await fetch(`${baseUrl}/`);
      assert.equal(root.status, 200);
      const rootHtml = await root.text();
      assert.match(rootHtml, /id="workflow-view"/u);
      assert.doesNotMatch(rootHtml, /Contract platform for AI-driven development/u);

      const llms = await fetch(`${baseUrl}/llms.txt`);
      assert.equal(llms.status, 404);
    } finally {
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
      await rm(cwd, { recursive: true, force: true });
    }
  });
});

describe('public site static export', () => {
  it('builds a no-database static hosting folder', async () => {
    const outDir = join('dist', `public-site-test-${Date.now()}`);
    await execFileAsync(process.execPath, ['scripts/build-public-site-static.mjs', '--out', outDir], {
      cwd: join(import.meta.dirname, '..'),
    });
    const root = join(import.meta.dirname, '..', outDir);
    const indexHtml = await readFile(join(root, 'index.html'), 'utf8');
    assert.match(indexHtml, /<title>Work Graph — навигатор для AI-разработки<\/title>/u);
    assert.match(indexHtml, /<h1>Ваш навигатор для AI-разработки, переводит цели в исполняемый граф<\/h1>/u);
    assert.match(indexHtml, /управляемую карту проекта/u);
    assert.match(indexHtml, /Три графа — один цикл разработки/u);
    assert.match(indexHtml, /Как установить Work Graph/u);
    assert.doesNotMatch(indexHtml, /Открыть приложение/u);
    assert.match(indexHtml, /workGraphPublicSiteLocale/u);
    assert.match(indexHtml, /109644335/u);
    assert.doesNotMatch(indexHtml, /Decision \(AN\)/u);
    const enIndexHtml = await readFile(join(root, 'en', 'index.html'), 'utf8');
    assert.match(enIndexHtml, /<title>Work Graph — navigator for AI development<\/title>/u);
    assert.match(enIndexHtml, /<h1>Your navigator for AI development — turns goals into an executable graph<\/h1>/u);
    assert.match(enIndexHtml, /manageable project map/u);
    await access(join(root, 'llms.txt'));
    await access(join(root, 'assets', 'favicon.svg'));
    await access(join(root, 'assets', 'workgraph-logo.svg'));
    await access(join(root, 'assets', 'workgraph-emblem.svg'));
    await access(join(root, 'assets', 'img', 'work-graph-kanban-board-light.png'));
    await access(join(root, 'assets', 'img', 'work-graph-verification-matrix.png'));
    await access(join(root, 'assets', 'img', 'work-graph-memory-list.png'));
    await access(join(root, 'assets', 'img', 'work-graph-prompt-rules.png'));
    await access(join(root, 'assets', 'fonts', 'GraphikLCG', 'stylesheet.css'));
    await access(join(root, 'assets', 'fonts', 'GraphikLCG', 'GraphikLCG-Regular.woff2'));
    await access(join(root, 'assets', 'design-tokens-workgraph-dark.css'));
    await access(join(root, 'assets', 'icons', 'bold', 'robot-bold.svg'));
    const faqJson = JSON.parse(await readFile(join(root, 'faq.json'), 'utf8'));
    assert.match(indexHtml, /id="faq"/u);
    assert.match(indexHtml, /Work Graph — это тасктрекер\?/u);
    assert.equal(faqJson['@type'], 'FAQPage');
    await access(join(root, '.well-known', 'mcp.json'));
    await access(join(root, 'docs', 'bvc-spec.md'));
    await access(join(root, 'api', 'docs', 'mcp-tools-context.json'));
    assert.match(await readFile(join(root, 'README.txt'), 'utf8'), /No database/u);
    await rm(root, { recursive: true, force: true });
  });
});

