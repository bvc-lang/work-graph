#!/usr/bin/env node
/**
 * Seed: Work Graph public site v1 — human landing + agent-readable docs.
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const EPIC_ID = 'epic-work-graph-public-site-v1';
const TZ_PATH = 'docs/tz-public-site-v1.md';
const ANALYTICS_PATH = 'work/analytics/work-graph-public-site-competitive-tz.md';

const TASKS = [
  {
    workId: EPIC_ID,
    title: 'Public Site v1: лендинг WG + agent-readable docs',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'epic',
    dependsOn: ['epic-work-graph-ui-sidebar-resize-v1'],
    basis: [
      'AN-44: WG должен позиционироваться как слой обязательств/доказательств, не IDE/PM/memory.',
      'AN-45: разделы продукта уже образуют workflow Аналитика → Задачи → Доска → Проверки → Память.',
      'AN-63: сайт должен быть инструментом для агентов: llms.txt, markdown docs, MCP discovery.',
      'Конкуренты (Cursor, Claude Code, Devin, Linear, Mem0) уже используют agent-first docs, MCP/API quickstarts и lifecycle messaging.',
    ],
    vector: [
      'P0: static public site routes: /, /product, /evidence-ledger, /onebase, /compare, /docs.',
      'P0: /llms.txt, /docs/*.md, /.well-known/mcp.json.',
      'P0: semantic HTML + JSON-LD for home/docs.',
      'P0: tests for routes and machine-readable artifacts.',
      'P1: docs context JSON endpoints + copyable MCP configs.',
    ],
    goal: [
      'Human visitor понимает WG как local evidence ledger for AI agents.',
      'Agent может открыть /llms.txt и получить docs/MCP/tool контекст без скрейпинга JS.',
    ],
    checks: [
      'GET / returns semantic landing with AN→work→evidence flow',
      'GET /llms.txt returns text/plain with key pages and preferred interactions',
      'GET /.well-known/mcp.json returns valid JSON',
      'docs/tz-public-site-v1.md accepted as implementation spec',
      'public-site route tests green',
    ],
    analysis: [
      'Сайт должен занимать пустое место между Cursor/Claude execution, Linear/Jira PM, Mem0 memory: доказуемое обязательство.',
      'Не копировать visual style конкурентов; взять паттерн short positioning + lifecycle diagram + quickstart + agent docs.',
    ],
    decision: [
      'Вердикт: делать.',
      'P0 scope: сайт как статическая витрина + machine-readable docs/discovery, без интерактивного демо.',
    ],
    targetFiles: [
      TZ_PATH,
      ANALYTICS_PATH,
      'src/publicSiteServer.mjs',
      'src/publicSiteContent.mjs',
      'public/llms.txt',
      'public/.well-known/mcp.json',
      'docs/public-site/*.md',
      'tests/publicSite.test.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_PATH,
    analyticsKey: 'AN-64',
  },
  {
    workId: 'write-public-site-information-architecture',
    title: 'Site: information architecture and route map',
    department: 'frontend-ui',
    ownerRole: 'product_engineer',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: ['docs/tz-public-site-v1.md фиксирует route map и acceptance criteria.'],
    vector: [
      'Translate AN-64/TZ into route/content registry.',
      'Define human-facing and agent-facing pages as data, not ad hoc strings.',
      'Keep page content self-contained and markdown-projectable.',
    ],
    goal: ['Единый content registry для site routes, docs routes и llms.txt.'],
    checks: ['publicSiteContent exports route map', 'route map contains /, /compare, /docs, /onebase'],
    targetFiles: ['src/publicSiteContent.mjs', TZ_PATH, ANALYTICS_PATH],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_PATH,
    analyticsKey: 'AN-64',
  },
  {
    workId: 'implement-public-site-static-shell',
    title: 'Site: static shell for landing/product/compare/docs',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['write-public-site-information-architecture'],
    basis: ['Нужны public routes, независимые от backlog operator UI.'],
    vector: [
      'Create server/render module for public site HTML.',
      'Semantic HTML: header/nav/main/article/section/footer.',
      'Routes: /, /product, /evidence-ledger, /onebase, /compare, /docs, /docs/*.',
    ],
    goal: ['Публичный сайт рендерится статично и не требует JS для основного контента.'],
    checks: ['GET / contains Local evidence ledger', 'GET /compare contains competitors table', 'GET /docs contains docs index'],
    targetFiles: ['src/publicSiteServer.mjs', 'src/publicSiteContent.mjs', 'tests/publicSite.test.mjs'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_PATH,
    analyticsKey: 'AN-64',
  },
  {
    workId: 'add-llms-markdown-docs-projections',
    title: 'Site: llms.txt and markdown docs projections',
    department: 'frontend-ui',
    ownerRole: 'docs_engineer',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['write-public-site-information-architecture'],
    basis: ['AN-63 требует agent-readable /llms.txt и markdown routes.'],
    vector: [
      'Add /llms.txt with key pages, preferred interactions, data accuracy.',
      'Expose /docs/*.md or ?format=markdown for P0 docs.',
      'Add .bvc.example files for BVC/work-item examples.',
    ],
    goal: ['Cursor/Claude/MCP client может понять сайт без HTML scraping.'],
    checks: ['GET /llms.txt text/plain', 'GET /docs/bvc-spec.md text/markdown', 'BVC examples exist'],
    targetFiles: ['public/llms.txt', 'docs/public-site/*.md', 'docs/public-site/*.bvc.example', 'tests/publicSite.test.mjs'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_PATH,
    analyticsKey: 'AN-64',
  },
  {
    workId: 'add-mcp-discovery-and-doc-context-endpoints',
    title: 'Site: MCP discovery + docs context endpoints',
    department: 'agent-platform',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['add-llms-markdown-docs-projections'],
    basis: ['AN-63: /.well-known/mcp.json и unified context endpoints нужны агентам.'],
    vector: [
      'Add /.well-known/mcp.json with Work Graph MCP server/tool descriptions.',
      'Add /api/docs/bvc-authoring-context.',
      'Add /api/docs/mcp-tools-context.',
      'Add /api/docs/errors-context.',
    ],
    goal: ['Agents discover tools/schemas/examples through stable JSON, not prose scraping.'],
    checks: ['mcp.json valid JSON', 'context endpoints include examples and error codes'],
    targetFiles: ['public/.well-known/mcp.json', 'src/publicSiteServer.mjs', 'tests/publicSite.test.mjs'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_PATH,
    analyticsKey: 'AN-64',
  },
  {
    workId: 'add-schema-org-jsonld-and-semantic-html',
    title: 'Site: Schema.org JSON-LD and semantic HTML pass',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-public-site-static-shell'],
    basis: ['AN-63: semantic HTML + JSON-LD improve agent extraction and search engines.'],
    vector: [
      'Add JSON-LD for home, docs, BVC spec, MCP tools.',
      'Ensure h1/h2 hierarchy and article/section/nav landmarks.',
      'Add alt/aria-labels for diagrams and nav.',
    ],
    goal: ['Сайт извлекается агентами и валидируется как structured docs/software content.'],
    checks: ['HTML contains application/ld+json', 'route tests assert h1 and landmarks'],
    targetFiles: ['src/publicSiteServer.mjs', 'src/publicSiteContent.mjs', 'tests/publicSite.test.mjs'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_PATH,
    analyticsKey: 'AN-64',
  },
  {
    workId: 'add-public-site-verification-tests',
    title: 'Site: route and artifact verification tests',
    department: 'frontend-ui',
    ownerRole: 'qa_engineer',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-public-site-static-shell', 'add-mcp-discovery-and-doc-context-endpoints'],
    basis: ['P0 acceptance criteria require route and machine-readable artifact tests.'],
    vector: [
      'Test public HTML routes.',
      'Test /llms.txt content type and key sections.',
      'Test /.well-known/mcp.json schema shape.',
      'Test docs context endpoints.',
    ],
    goal: ['Regression coverage prevents public site from becoming JS-only or agent-unreadable.'],
    checks: ['node --test tests/publicSite.test.mjs green'],
    targetFiles: ['tests/publicSite.test.mjs', 'src/publicSiteServer.mjs'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_PATH,
    analyticsKey: 'AN-64',
  },
];

async function main() {
  const existing = await readWorkItemsFromRepo({ cwd: process.cwd() });
  const known = new Set(existing.map((item) => item.id));
  let created = 0;

  for (const task of TASKS) {
    if (known.has(task.workId)) {
      console.log(`skip ${task.workId} (exists)`);
      continue;
    }

    await createWorkItem({
      workId: task.workId,
      title: task.title,
      department: task.department,
      ownerRole: task.ownerRole,
      priority: task.priority,
      risk: task.risk,
      status: task.status,
      itemKind: task.itemKind,
      parentId: task.parentId,
      dependsOn: task.dependsOn?.join(', '),
      basis: task.basis.join('\n'),
      vector: task.vector.join('\n'),
      goal: task.goal.join('\n'),
      checks: task.checks.join('\n'),
      analysis: task.analysis?.join('\n'),
      decision: task.decision?.join('\n'),
      targetFiles: task.targetFiles.join(', '),
      intakeSourceKind: task.intakeSourceKind,
      intakeSourceRef: task.intakeSourceRef,
      analyticsKey: task.analyticsKey,
    }, { root: process.cwd() });

    console.log(`created ${task.workId}`);
    created += 1;
  }

  console.log(JSON.stringify({
    schema: 'workgraph.seed-epic-work-graph-public-site-v1.v1',
    epicId: EPIC_ID,
    analyticsKey: 'AN-64',
    created,
    totalTasks: TASKS.length,
    defaultStatus: 'backlog',
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
