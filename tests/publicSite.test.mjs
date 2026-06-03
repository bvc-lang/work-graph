import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { promisify } from 'node:util';

import { createBacklogUiServer } from '../src/workGraphBacklogUiServer.mjs';
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
    assert.equal(home.title, 'Contract platform for AI-driven development');
    assert.match(home.description, /graph of work with trace/u);

    const ruHome = getPublicSitePage('/', 'ru');
    assert.match(ruHome.title, /контрактная платформа/u);
    assert.match(ruHome.sections[0].items.join(' '), /Решение/u);
    assert.doesNotMatch(ruHome.sections[0].items.join(' '), /Decision/u);

    assert.match(buildLlmsTxt(), /Contract platform/u);
    assert.match(renderPublicDocMarkdown('bvc-spec'), /# BVC Atom Specification/u);

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
  it('serves landing, app, llms, markdown, MCP discovery and context endpoints', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'wg-public-site-'));
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

      const landing = await fetch(`${baseUrl}/?lang=ru&theme=dark`);
      assert.equal(landing.status, 200);
      assert.match(landing.headers.get('content-type') || '', /text\/html/u);
      const landingHtml = await landing.text();
      assert.match(landingHtml, /data-theme="dark"/u);
      assert.match(landingHtml, /lang="ru"/u);
      assert.match(landingHtml, /контрактная платформа/u);
      assert.match(landingHtml, /Три графа — один цикл разработки/u);
      assert.match(landingHtml, /Граф исполнения/u);
      assert.match(landingHtml, /Граф памяти/u);
      assert.match(landingHtml, /Решение \(AN\)/u);
      assert.match(landingHtml, /От чат-воркфлоу к контрактному воркфлоу/u);
      assert.doesNotMatch(landingHtml, /Не IDE, не PM SaaS, не слой памяти/u);
      assert.match(landingHtml, /Контрактный контур/u);
      assert.match(landingHtml, /claim_work_item/u);
      assert.match(landingHtml, /Для кого Work Graph/u);
      assert.match(landingHtml, /Как установить Work Graph/u);
      assert.match(landingHtml, /npx @work-graph\/mcp init/u);
      assert.match(landingHtml, /href="#install"/u);
      assert.doesNotMatch(landingHtml, /Открыть приложение/u);
      assert.doesNotMatch(landingHtml, /Запустить локально/u);
      assert.doesNotMatch(landingHtml, /OneBase/u);
      assert.doesNotMatch(landingHtml, /\/onebase/u);
      assert.match(landingHtml, /Посмотрите на контракт/u);
      assert.match(landingHtml, /Вопросы и ответы/u);
      assert.doesNotMatch(landingHtml, /Decision \(AN\)/u);
      assert.doesNotMatch(landingHtml, /Evidence per task/u);
      assert.match(landingHtml, /workGraphPublicSiteLocale/u);
      assert.match(landingHtml, /workGraphPublicSiteTheme/u);
      assert.match(landingHtml, /rel="icon" href="\/assets\/favicon\.svg" type="image\/svg\+xml"/u);
      assert.match(landingHtml, /wg-btn/u);
      assert.match(landingHtml, /wg-badge/u);
      assert.match(landingHtml, /site-icon/u);
      assert.match(landingHtml, /template-visual/u);
      assert.match(landingHtml, /template-aside/u);
      assert.match(landingHtml, /related-templates/u);
      assert.match(landingHtml, /bottom-cta/u);
      assert.match(landingHtml, /max-width: 1360px/u);
      assert.match(landingHtml, /max-width: 1200px/u);
      assert.match(landingHtml, /--shadow-raised/u);
      assert.match(landingHtml, /border-bottom: 1px solid var\(--border\)/u);
      assert.match(landingHtml, /border-radius: 4px/u);
      assert.match(landingHtml, /@media \(max-width: 760px\)/u);
      assert.match(landingHtml, /application\/ld\+json/u);
      assert.doesNotMatch(landingHtml, /href="\/app"/u);

      const app = await fetch(`${baseUrl}/app`);
      assert.equal(app.status, 200);
      assert.match(await app.text(), /id="workflow-view"/u);

      const llms = await fetch(`${baseUrl}/llms.txt`);
      assert.equal(llms.status, 200);
      assert.match(llms.headers.get('content-type') || '', /text\/plain/u);
      assert.match(await llms.text(), /\/docs\/bvc-spec/u);

      const markdown = await fetch(`${baseUrl}/docs/bvc-spec.md`);
      assert.equal(markdown.status, 200);
      assert.match(markdown.headers.get('content-type') || '', /text\/markdown/u);
      assert.match(await markdown.text(), /BVC Atom Specification/u);

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

      const faq = await fetch(`${baseUrl}/faq?lang=ru`);
      assert.equal(faq.status, 200);
      const faqHtml = await faq.text();
      assert.match(faqHtml, /Вопрос-ответ \(FAQ\) — Work Graph/u);
      assert.match(faqHtml, /Work Graph — это тасктрекер\?/u);
      assert.match(faqHtml, /PolicyViolation/u);
      assert.match(faqHtml, /FAQPage/u);

      const faqJson = await fetch(`${baseUrl}/faq.json?lang=ru`);
      assert.equal(faqJson.status, 200);
      const faqPayload = await faqJson.json();
      assert.equal(faqPayload['@type'], 'FAQPage');
      assert.ok(faqPayload.mainEntity.some((entry) => entry.name === 'Что такое BVC?'));

      const compare = await fetch(`${baseUrl}/compare`);
      assert.equal(compare.status, 200);
      assert.match(await compare.text(), /Cursor \/ Claude Code/u);

      const ruCompare = await fetch(`${baseUrl}/compare?lang=ru`);
      assert.equal(ruCompare.status, 200);
      const ruCompareHtml = await ruCompare.text();
      assert.match(ruCompareHtml, /Доказательства по задаче/u);
      assert.doesNotMatch(ruCompareHtml, /Evidence per task/u);

      const ruMarkdown = await fetch(`${baseUrl}/docs/bvc-spec.md?lang=ru`);
      assert.equal(ruMarkdown.status, 200);
      assert.match(await ruMarkdown.text(), /Спецификация BVC-атома/u);
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
    assert.match(indexHtml, /контрактная платформа/u);
    assert.match(indexHtml, /Три графа — один цикл разработки/u);
    assert.match(indexHtml, /Как установить Work Graph/u);
    assert.doesNotMatch(indexHtml, /Открыть приложение/u);
    assert.doesNotMatch(indexHtml, /OneBase/u);
    assert.match(indexHtml, /workGraphPublicSiteLocale/u);
    assert.doesNotMatch(indexHtml, /Decision \(AN\)/u);
    assert.match(await readFile(join(root, 'en', 'index.html'), 'utf8'), /Contract platform/u);
    await access(join(root, 'llms.txt'));
    await access(join(root, 'assets', 'favicon.svg'));
    await access(join(root, 'faq', 'index.html'));
    const faqJson = JSON.parse(await readFile(join(root, 'faq.json'), 'utf8'));
    assert.equal(faqJson['@type'], 'FAQPage');
    await access(join(root, '.well-known', 'mcp.json'));
    await access(join(root, 'docs', 'bvc-spec.md'));
    await access(join(root, 'api', 'docs', 'mcp-tools-context.json'));
    assert.match(await readFile(join(root, 'README.txt'), 'utf8'), /No database/u);
    await rm(root, { recursive: true, force: true });
  });
});

