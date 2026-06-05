import { getPublicSitePageBlocks, getPublicSitePageMeta } from './publicSitePageContent.mjs';
import { loadPublicDocMarkdown } from './publicSiteDocs.mjs';

export const PUBLIC_SITE_DEFAULT_LOCALE = 'en';
export const PUBLIC_SITE_LOCALES = ['en', 'ru'];
export const PUBLIC_SITE_THEMES = ['light', 'dark'];

const FLOW = ['Decision (AN)', 'Work contract (.bvc)', 'Agent claim', 'Evidence', 'Verified memory'];
const FLOW_RU = ['Решение (AN)', 'Контракт задачи (.bvc)', 'Захват агентом', 'Доказательства', 'Проверенная память'];

const COMPETITORS = [
  ['Cursor / Claude Code', 'Writes code and runs tools', 'partial', 'Execution layer; WG is the evidence ledger above it'],
  ['GitHub Copilot', 'IDE completions and agent sessions', 'partial', 'Execution layer; WG scopes work.id and proof per change'],
  ['Windsurf / Cline', 'Open IDE agents and edits', 'partial', 'Same as Cursor; WG supplies backlog and gates in git'],
  ['Linear / Jira', 'Plans and tracks issues', 'no', 'PM layer; WG keeps local BVC contracts and proof'],
  ['Asana / ClickUp', 'Team tasks and project tracking', 'no', 'PM layer; no machine-readable contract per task'],
  ['Notion / Confluence', 'Docs and informal task lists', 'no', 'Knowledge layer; WG links decisions to executable work items'],
  ['Langfuse / LangSmith', 'LLM traces and experiment logs', 'partial', 'Observability; WG ties traces to BVC checks and done'],
  ['Mem0', 'Stores agent memory', 'no', 'Memory layer; WG stores accountable work records'],
  ['Devin', 'Autonomous ticket-to-PR sessions', 'partial', 'Cloud execution; WG defines acceptance and evidence'],
];
const COMPETITORS_RU = [
  ['Cursor / Claude Code', 'Пишут код и вызывают инструменты', 'частично', 'Слой исполнения; WG ведёт журнал доказательств над ним'],
  ['GitHub Copilot', 'Подсказки и агентские сессии в IDE', 'частично', 'Слой исполнения; WG задаёт work.id и proof на изменение'],
  ['Windsurf / Cline', 'Открытые IDE-агенты и правки', 'частично', 'Как Cursor; WG даёт бэклог и гейты в git'],
  ['Linear / Jira', 'Планируют и ведут задачи', 'нет', 'PM-слой; WG хранит локальные BVC-контракты и доказательства'],
  ['Asana / ClickUp', 'Командные задачи и проекты', 'нет', 'PM-слой; нет машиночитаемого контракта на задачу'],
  ['Notion / Confluence', 'Документы и неформальные списки', 'нет', 'Слой знаний; WG связывает решения с исполняемой работой'],
  ['Langfuse / LangSmith', 'Трассы LLM и логи экспериментов', 'частично', 'Наблюдаемость; WG привязывает трассы к BVC-проверкам и done'],
  ['Mem0', 'Хранит память агента', 'нет', 'Слой памяти; WG хранит ответственные записи работ'],
  ['Devin', 'Автономные сессии тикет→PR', 'частично', 'Облачное исполнение; WG задаёт acceptance и evidence'],
];

const MCP_TOOLS = [
  {
    name: 'create_work_item',
    description: 'Create a BVC-backed work item in the local Work Graph backlog.',
    input: { workId: 'string', title: 'string', basis: 'string', vector: 'string', goal: 'string' },
    output: { workId: 'string', path: 'string' },
  },
  {
    name: 'get_work_contract',
    description: 'Read the BVC contract for a work item.',
    input: { workId: 'string' },
    output: { workId: 'string', contract: 'string' },
  },
  {
    name: 'assert_task_ready_for_done',
    description: 'Check evidence and verification readiness before marking a task done.',
    input: { workId: 'string' },
    output: { ok: 'boolean', missing: 'string[]' },
  },
];

const ERRORS = [
  ['duplicate_work_id', 'Work item already exists', 'Choose a new id or update the existing work item'],
  ['invalid_bvc_section', 'BVC atom is missing a required section', 'Add Basis, Vector and Goal'],
  ['missing_evidence', 'Task cannot be closed without evidence', 'Add test output, trace link or verification note'],
];

export const FAQ_ENTRIES = [
  {
    category: { en: 'Concept and Product', ru: 'Концепция и продукт' },
    items: [
      {
        question: { en: 'Is Work Graph a task tracker?', ru: 'Work Graph — это тасктрекер?' },
        answer: {
          en: 'Yes — a local one in your git repo, with a kanban board and statuses. Unlike Jira or Linear, each item is a BVC contract with evidence gates, not just status and comments. A task cannot close until machine-readable proof is attached, for example npm test with exit_code: 0.',
          ru: 'Да — локальный, в git-репозитории, с доской и статусами. В отличие от Linear и Jira, единица работы — BVC-контракт с гейтами evidence, а не только статус и комментарии. Задача не закрывается, пока не приложено машиночитаемое свидетельство, например npm test с exit_code: 0.',
        },
      },
      {
        question: { en: 'Does Work Graph replace Cursor or Claude Code?', ru: 'Это замена Cursor или Claude Code?' },
        answer: {
          en: 'No. It is a complementary layer. Cursor and Claude generate code; Work Graph manages intent, verifies contracts and maintains the audit trail through MCP.',
          ru: 'Нет, это комплемент. Cursor и Claude отвечают за редактор и генерацию кода. Work Graph отвечает за память и контроль: управление намерениями, проверку контрактов и аудит через MCP.',
        },
      },
      {
        question: { en: 'Where is the data stored?', ru: 'Где хранятся данные?' },
        answer: {
          en: 'Locally in your Git repository as .bvc, .md and .jsonl files. There is no WG cloud database, no SaaS account lock-in and you own your Intent Graph.',
          ru: 'Полностью локально. Все данные — это файлы .bvc, .md и .jsonl внутри вашего Git-репозитория. Нет облачной базы WG, нет привязки к SaaS-аккаунту, вы владеете своим графом намерений.',
        },
      },
    ],
  },
  {
    category: { en: 'Architecture and Technology', ru: 'Архитектура и технологии' },
    items: [
      {
        question: { en: 'What is BVC?', ru: 'Что такое BVC?' },
        answer: {
          en: 'Basis · Vector · Goal. BVC describes an intent atom: context and reason, concrete action and success criterion. It is readable by humans, validated by schema and precise enough for LLM agents.',
          ru: 'BVC (Базис · Вектор · Цель) — формат атома намерения: контекст и причина, конкретные действия и критерий успеха. Он понятен человеку, валидируется схемой и помогает LLM точно понимать границы задачи.',
        },
      },
      {
        question: { en: 'How does an agent communicate with Work Graph?', ru: 'Как агент общается с Work Graph?' },
        answer: {
          en: 'Through MCP. The IDE config points to @work-graph/mcp, then the agent calls tools like get_work_contract, submit_evidence or assert_task_ready_for_done. WG returns structured data, not chat prose.',
          ru: 'Через MCP. В конфиге IDE указывается сервер @work-graph/mcp, после чего агент вызывает инструменты вроде get_work_contract, submit_evidence или assert_task_ready_for_done. WG отвечает структурированными данными, а не текстом чата.',
        },
      },
      {
        question: { en: 'Does Work Graph work offline?', ru: 'Работает ли WG без интернета?' },
        answer: {
          en: 'Yes. The Work Graph core works locally. Network access is only needed for your model provider or IDE agent; WG itself does not require external services.',
          ru: 'Да. Ядро Work Graph работает локально. Сеть нужна только для доступа агента к модели или серверу IDE; сам WG не требует внешних сервисов.',
        },
      },
    ],
  },
  {
    category: { en: 'Workflow', ru: 'Рабочий процесс' },
    items: [
      {
        question: { en: 'Is Work Graph useful without AI agents?', ru: 'Я не использую AI-агентов. WG полезен мне?' },
        answer: {
          en: 'Yes. BVC is useful as a human-written task specification format. You can write .bvc files, lint them and use the UI to track progress. Agents unlock automatic evidence and gate checks.',
          ru: 'Да. BVC-формат полезен как спецификация задач человеком. Можно писать .bvc файлы, линтить их и использовать UI для отслеживания прогресса. Полная мощь раскрывается с агентом: автосбор evidence и гейты.',
        },
      },
      {
        question: { en: 'How is WG related to CI/CD?', ru: 'Как WG связан с CI/CD?' },
        answer: {
          en: 'WG does not replace pipelines. It requires their results as evidence. A task can demand npm run test:login; the agent runs it, submits exit code and output, then WG checks the evidence before done.',
          ru: 'WG не заменяет пайплайны. Он требует их результаты как доказательства. Контракт может требовать npm run test:login; агент запускает команду, передаёт exit code и вывод, а WG проверяет evidence перед done.',
        },
      },
      {
        question: { en: 'Does WG support 1C / OneBase?', ru: 'Поддерживает ли WG 1С / OneBase?' },
        answer: {
          en: 'Yes, as a domain vertical through specialized MCP servers and evidence contracts. Domain-specific metadata or checks can become evidence in the same contract layer.',
          ru: 'Да, как доменную вертикаль через специализированные MCP-серверы и evidence-контракты. Доменные метаданные и проверки могут становиться доказательствами в том же контрактном слое.',
        },
      },
    ],
  },
  {
    category: { en: 'Verification and Trust', ru: 'Верификация и доверие' },
    items: [
      {
        question: { en: 'How do I know the agent did not hallucinate task completion?', ru: 'Как я могу быть уверен, что агент не галлюцинировал закрытие задачи?' },
        answer: {
          en: 'Through the Evidence layer. The agent must call add_work_item_evidence with command output, exit code and artifact hashes. Work Graph validates the result against the task contract.',
          ru: 'Через слой Evidence. Агент не может просто написать «я всё сделал». Он обязан вызвать add_work_item_evidence и передать результат команды, exit code и хеши артефактов. Work Graph валидирует результат по контракту задачи.',
        },
      },
      {
        question: { en: 'What happens if the agent violates the contract?', ru: 'Что если агент нарушит контракт?' },
        answer: {
          en: 'WG acts as a gate. If required Tier A evidence is missing, runtime returns PolicyViolation, the task stays open and the violation is written to the audit log.',
          ru: 'WG работает как gate. Если агент пытается закрыть задачу без обязательного доказательства Tier A, runtime возвращает PolicyViolation, задача остаётся открытой, а нарушение пишется в аудит-лог.',
        },
      },
    ],
  },
];

const COPY = {
  en: {
    nav: {
      product: 'Product',
      evidence: 'Evidence ledger',
      compare: 'Compare',
      docs: 'Docs',
      menuOpen: 'Open menu',
      menuClose: 'Close menu',
    },
    theme: { light: 'Light', dark: 'Dark' },
    localeLabel: 'Language',
    hero: {
      title: 'Your navigator for AI development — turns goals into an executable graph',
      documentTitle: 'Work Graph — navigator for AI development',
      body: 'Work Graph links intent, execution and memory into one loop. The path from idea to outcome becomes a manageable project map.',
      primary: 'How to install',
      secondary: 'Read llms.txt',
    },
    sections: {
      flowTitle: 'Three graphs, one product',
      flowBody: 'Intent Graph defines what and why. Execution Graph records how and by whom. Memory Graph preserves what was decided and proven.',
      productTitle: 'Product workflow',
      productBody: 'Analytics explains why. Work items define what. Board shows what is moving. Verification proves readiness. Memory preserves what changed.',
      evidenceTitle: 'Evidence ledger',
      evidenceBody: 'A task is not done because an agent says so. It is done when the work contract has evidence, checks and a ready-for-done verdict.',
      compareTitle: 'From chat workflow to contract workflow',
      docsTitle: 'Agent-readable documentation',
      docsBody: 'Every critical page has markdown, examples and machine-readable discovery so Cursor, Claude Code and MCP clients can use the site as a tool.',
    },
    labels: {
      analytics: 'Analytics',
      workItems: 'Work items',
      board: 'Board',
      verification: 'Verification',
      memory: 'Memory',
      readyForDone: 'Ready-for-done',
      evidenceRecords: 'Evidence records',
      localByDefault: 'Local by default',
      scenario: 'Scenario',
      boundary: 'Boundary',
      outcome: 'Outcome',
      competitorMatrix: 'Competitor matrix',
      docsIndex: 'Docs index',
      examples: 'Examples',
      relatedMcpTools: 'Related MCP tools',
      tableCompetitor: 'Competitor',
      tableLayer: 'Layer',
      tableEvidence: 'Evidence per task',
      tableStance: 'WG stance',
    },
  },
  ru: {
    nav: {
      product: 'Продукт',
      evidence: 'Журнал доказательств',
      compare: 'Сравнение',
      docs: 'Документация',
      menuOpen: 'Открыть меню',
      menuClose: 'Закрыть меню',
    },
    theme: { light: 'Светлая', dark: 'Тёмная' },
    localeLabel: 'Язык',
    hero: {
      title: 'Ваш навигатор для AI-разработки, переводит цели в исполняемый граф',
      documentTitle: 'Work Graph — навигатор для AI-разработки',
      body: 'Work Graph связывает намерение, исполнение и память в единый контур. Путь от идеи до результата превращается в управляемую карту проекта.',
      primary: 'Как установить',
      secondary: 'Открыть llms.txt',
    },
    sections: {
      flowTitle: 'Три графа — один продукт',
      flowBody: 'Граф намерений задаёт что и зачем. Граф исполнения фиксирует как и кем. Граф памяти сохраняет что решили и почему.',
      productTitle: 'Продуктовый workflow',
      productBody: 'Аналитика объясняет зачем. Задачи фиксируют что. Доска показывает движение. Проверки доказывают готовность. Память сохраняет результат.',
      evidenceTitle: 'Журнал доказательств',
      evidenceBody: 'Задача готова не потому, что агент так сказал. Она готова, когда у контракта есть доказательства, проверки и вердикт готовности.',
      compareTitle: 'От чат-воркфлоу к контрактному воркфлоу',
      docsTitle: 'Документация для агентов',
      docsBody: 'Критичные страницы имеют Markdown, примеры и машиночитаемое обнаружение, чтобы Cursor, Claude Code и MCP-клиенты использовали сайт как инструмент.',
    },
    labels: {
      analytics: 'Аналитика',
      workItems: 'Задачи',
      board: 'Доска',
      verification: 'Проверки',
      memory: 'Память',
      readyForDone: 'Готовность к завершению',
      evidenceRecords: 'Записи доказательств',
      localByDefault: 'Локально по умолчанию',
      scenario: 'Сценарий',
      boundary: 'Граница',
      outcome: 'Результат',
      competitorMatrix: 'Матрица конкурентов',
      docsIndex: 'Индекс документации',
      examples: 'Примеры',
      relatedMcpTools: 'Связанные MCP-инструменты',
      tableCompetitor: 'Конкурент',
      tableLayer: 'Слой',
      tableEvidence: 'Доказательства по задаче',
      tableStance: 'Позиция WG',
    },
  },
};

export const PUBLIC_DOCS = [
  {
    slug: 'bvc-spec',
    title: { en: 'BVC Atom Specification', ru: 'Спецификация BVC-атома' },
    description: {
      en: 'Basis, Vector and Goal as a machine-readable work contract.',
      ru: 'Базис, Вектор и Цель как машиночитаемый контракт работы.',
    },
    relatedTools: ['create_work_item', 'get_work_contract'],
    examples: {
      en: [
        'Minimal BVC atom with Basis, Vector and Goal.',
        'Work item with evidence and target files.',
        'Invalid atom missing Goal.',
      ],
      ru: [
        'Минимальный BVC-атом с Базисом, Вектором и Целью.',
        'Задача с доказательствами и целевыми файлами.',
        'Некорректный атом без Цели.',
      ],
    },
  },
  {
    slug: 'mcp-tools',
    title: { en: 'MCP Tools', ru: 'MCP-инструменты' },
    description: { en: 'Work Graph tools exposed to AI agents.', ru: 'Инструменты Work Graph, доступные AI-агентам.' },
    relatedTools: MCP_TOOLS.map((tool) => tool.name),
    examples: { en: ['Create work item', 'Read contract', 'Assert ready-for-done'], ru: ['Создать задачу', 'Прочитать контракт', 'Проверить готовность к завершению'] },
  },
  {
    slug: 'verification-matrix',
    title: { en: 'Verification Matrix', ru: 'Матрица проверок' },
    description: { en: 'Tier A/B/C readiness checks for agent work.', ru: 'Проверки готовности Tier A/B/C для работы агента.' },
    relatedTools: ['assert_task_ready_for_done'],
    examples: { en: ['Evidence present', 'Missing test output', 'Manual review required'], ru: ['Доказательства есть', 'Нет вывода тестов', 'Нужна ручная проверка'] },
  },
  {
    slug: 'errors',
    title: { en: 'Errors and Recovery', ru: 'Ошибки и восстановление' },
    description: { en: 'Runtime error codes and recovery actions.', ru: 'Коды ошибок выполнения и действия для восстановления.' },
    relatedTools: ['create_work_item', 'assert_task_ready_for_done'],
    examples: { en: ERRORS.map(([code]) => code), ru: ERRORS.map(([code]) => code) },
  },
];

export const PUBLIC_SITE_ROUTES = [
  '/',
  '/product',
  '/evidence-ledger',
  '/compare',
  '/docs',
  ...PUBLIC_DOCS.map((doc) => `/docs/${doc.slug}`),
];

function normalizeLocale(locale) {
  return PUBLIC_SITE_LOCALES.includes(locale) ? locale : PUBLIC_SITE_DEFAULT_LOCALE;
}

function localized(value, locale) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value[normalizeLocale(locale)] ?? value.en ?? '';
  }
  return value ?? '';
}

export function localizePublicDoc(doc, locale = PUBLIC_SITE_DEFAULT_LOCALE) {
  const lang = normalizeLocale(locale);
  return {
    ...doc,
    title: localized(doc.title, lang),
    description: localized(doc.description, lang),
    examples: localized(doc.examples, lang),
  };
}

export function getPublicSiteCopy(locale = PUBLIC_SITE_DEFAULT_LOCALE) {
  return COPY[normalizeLocale(locale)];
}

export function getLocalizedFaq(locale = PUBLIC_SITE_DEFAULT_LOCALE) {
  const lang = normalizeLocale(locale);
  return FAQ_ENTRIES.map((category) => ({
    category: localized(category.category, lang),
    items: category.items.map((item) => ({
      question: localized(item.question, lang),
      answer: localized(item.answer, lang),
    })),
  }));
}

export function buildFaqJsonLd(locale = PUBLIC_SITE_DEFAULT_LOCALE) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: getLocalizedFaq(locale).flatMap((category) => category.items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    }))),
  };
}

export function getPublicSiteCompetitors(locale) {
  return locale === 'ru' ? COMPETITORS_RU : COMPETITORS;
}

export function getPublicSitePage(pathname, locale = PUBLIC_SITE_DEFAULT_LOCALE) {
  const copy = getPublicSiteCopy(locale);
  const pageMeta = getPublicSitePageMeta(locale);
  const path = pathname === '/index.html' ? '/' : pathname;
  const docsMatch = path.match(/^\/docs\/([^/.]+)$/u);
  if (docsMatch) {
    const sourceDoc = PUBLIC_DOCS.find((entry) => entry.slug === docsMatch[1]);
    if (!sourceDoc) return null;
    const doc = localizePublicDoc(sourceDoc, locale);
    return {
      route: path,
      title: doc.title,
      description: doc.description,
      kind: 'doc',
      doc,
      sections: [],
    };
  }

  const routes = {
    '/': {
      title: copy.hero.title,
      documentTitle: copy.hero.documentTitle,
      description: copy.hero.body,
      kind: 'home',
      sections: [
        { title: copy.sections.flowTitle, body: copy.sections.flowBody, badges: [{ label: 'BVC', tone: 'accent' }, { label: locale === 'ru' ? 'ЛОКАЛЬНО' : 'LOCAL', tone: 'ok' }] },
        { title: copy.sections.evidenceTitle, body: copy.sections.evidenceBody, badges: [{ label: locale === 'ru' ? 'ДОКАЗАТЕЛЬСТВА' : 'EVIDENCE', tone: 'warning' }, { label: locale === 'ru' ? 'ПРОВЕРКА' : 'VERIFY', tone: 'accent' }] },
        { title: copy.sections.docsTitle, body: copy.sections.docsBody, badges: [{ label: 'LLMS.TXT', tone: 'accent' }, { label: 'MCP', tone: 'ok' }] },
        { title: copy.sections.compareTitle, body: locale === 'ru' ? 'IDE выполняет команды, трекер ведёт задачи, память хранит факты. Work Graph связывает намерение, контракт работы и доказательство результата.' : 'The IDE runs commands, the tracker manages tasks and memory stores facts. Work Graph connects intent, work contract and proof of outcome.', badges: [{ label: locale === 'ru' ? 'ГРАФ НАМЕРЕНИЙ' : 'INTENT GRAPH', tone: 'accent' }, { label: locale === 'ru' ? 'ДОКАЗАТЕЛЬСТВА' : 'EVIDENCE', tone: 'warning' }] },
      ],
    },
    '/product': {
      ...pageMeta.product,
      kind: 'product',
      blocks: getPublicSitePageBlocks(locale, 'product'),
      sections: [],
    },
    '/evidence-ledger': {
      ...pageMeta.evidence,
      kind: 'evidence',
      blocks: getPublicSitePageBlocks(locale, 'evidence'),
      sections: [],
    },
    '/compare': {
      ...pageMeta.compare,
      kind: 'compare',
      blocks: getPublicSitePageBlocks(locale, 'compare'),
      sections: [],
    },
    '/docs': {
      title: copy.sections.docsTitle,
      description: copy.sections.docsBody,
      kind: 'docs',
      sections: [
        { title: copy.labels.docsIndex, body: locale === 'ru' ? 'BVC, MCP-инструменты, проверки и ошибки выполнения.' : 'BVC, MCP tools, verification and runtime errors.', docs: PUBLIC_DOCS.map((doc) => localizePublicDoc(doc, locale)), icon: 'book-open-text', badges: [{ label: 'MARKDOWN', tone: 'accent' }, { label: 'JSON-LD', tone: 'ok' }] },
      ],
    },
  };

  return routes[path] ? { route: path, ...routes[path] } : null;
}

export function buildLlmsTxt() {
  return `# Work Graph
# Purpose: Contract platform for AI-driven development with BVC atoms, evidence and MCP

## Key pages
- / - Contract platform overview: Intent Graph, Execution Graph and Memory Graph
- /product - Workflow: Analytics -> Work Items -> Board -> Verification -> Memory
- /evidence-ledger - Evidence and ready-for-done contract
- /compare - Comparison with Cursor, Claude Code, Linear, Devin and Mem0
- /#faq - FAQ on the home page (structured JSON at /faq.json)
- /docs/bvc-spec - BVC atom specification
- /docs/mcp-tools - MCP tool contracts
- /docs/verification-matrix - Tier A/B/C verification rules
- /docs/errors - Error codes and recovery

## Preferred interactions
- Use MCP for programmatic access instead of scraping HTML.
- Read /docs/*.md for token-efficient documentation.
- Use /api/docs/bvc-authoring-context before creating BVC work items.
- Use /api/docs/mcp-tools-context to discover tool inputs and outputs.

## Data accuracy
- Public site contract: AN-64 / docs/tz-public-site-v1.md.
- BVC work items live in git and remain the source of truth.
- MCP write operations require a local workspace.
`;
}

export function buildMcpDiscovery() {
  return {
    servers: [
      {
        name: 'workgraph-mcp',
        description: 'Work Graph MCP server: backlog, evidence, verification and BVC contracts.',
        transport: { type: 'stdio' },
        tools: MCP_TOOLS.map(({ name, description }) => ({ name, description })),
      },
    ],
  };
}

export function buildDocsContext(kind) {
  if (kind === 'bvc-authoring') {
    return {
      schema: 'workgraph.docs-context.bvc-authoring.v1',
      requiredSections: ['Basis', 'Vector', 'Goal'],
      invariant: 'A work item is a local BVC contract, not a chat todo.',
      examples: [
        { name: 'minimal', sections: { basis: 'Why this exists.', vector: 'What to change.', goal: 'How done is recognized.' } },
        { name: 'missing-goal-error', error: 'invalid_bvc_section' },
      ],
    };
  }
  if (kind === 'mcp-tools') {
    return {
      schema: 'workgraph.docs-context.mcp-tools.v1',
      tools: MCP_TOOLS,
    };
  }
  return {
    schema: 'workgraph.docs-context.errors.v1',
    errors: ERRORS.map(([code, meaning, recovery]) => ({ code, meaning, recovery })),
  };
}

export function renderPublicDocMarkdown(slug, locale = PUBLIC_SITE_DEFAULT_LOCALE) {
  const lang = normalizeLocale(locale);
  const markdown = loadPublicDocMarkdown(slug, lang);
  if (markdown == null) return null;
  const sourceDoc = PUBLIC_DOCS.find((entry) => entry.slug === slug);
  if (!sourceDoc) return null;
  const doc = localizePublicDoc(sourceDoc, lang);
  return `# ${doc.title}\n\n${doc.description}\n\n${markdown}`;
}

export function renderBvcExample(slug) {
  if (slug !== 'bvc-spec') return null;
  return `#Задача_add_llms_txt<[
Базис:
  Agents need a stable entrypoint for Work Graph docs.
Вектор:
  Add /llms.txt with key pages, preferred interactions and data accuracy.
Цель:
  Cursor and Claude Code can discover Work Graph docs without scraping HTML.

Метки:
  atom.profile: work_item
  work.id: add-llms-txt
  work.status: backlog
]>`;
}

