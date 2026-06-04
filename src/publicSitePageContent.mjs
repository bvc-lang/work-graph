/** @typedef {'lead' | 'pipeline' | 'featureColumns' | 'iconLabelGrid' | 'screenshotGallery' | 'graphTrinity' | 'codeShowcase' | 'comparisonStrip' | 'siteSections' | 'boundaries'} PublicPageBlockType */

/**
 * @param {'ru' | 'en'} locale
 * @returns {Record<string, { title: string, description: string }>}
 */
export function getPublicSitePageMeta(locale) {
  if (locale === 'ru') {
    return {
      product: {
        title: 'Продуктовый workflow',
        description:
          'Work Graph — локальный таск-трекер в git: доска, бэклог и статусы. Отличие в единице работы: BVC-контракт с гейтами evidence, а не тикет из чата. Решения → AN, задачи → .bvc, движение на доске, готовность через проверки, результат → память проекта.',
      },
      evidence: {
        title: 'Журнал доказательств',
        description:
          'Журнал доказательств отвечает на один вопрос: почему этот work.id можно закрыть? В нём — вывод команд, трассы файлов, результаты проверок и вердикты гейтов рядом с BVC-контрактом. Как и код, всё проходит через git.',
      },
      compare: {
        title: 'От чат-воркфлоу к контрактному',
        description:
          'Часто рядом с IDE-агентом стоят Jira или Linear в облаке. Work Graph — трекер в репозитории: та же доска и статусы, плюс намерение в .bvc и proof на work.id. IDE он дополняет; синхронизация с внешним PM не ядро продукта.',
      },
    };
  }
  return {
    product: {
      title: 'Product workflow',
      description:
        'Work Graph is a local task tracker in git — board, backlog and statuses included. The difference is the unit of work: a BVC contract with evidence gates, not a chat ticket. Decisions become AN records, tasks become .bvc atoms, motion on the board, readiness via verification, outcomes in project memory.',
    },
    evidence: {
      title: 'Evidence ledger',
      description:
        'The evidence ledger answers one question: why is this work.id allowed to be done? It stores command output, file traces, verification results and gate verdicts next to the BVC contract — reviewable in git like any other change.',
    },
    compare: {
      title: 'From chat workflow to contract workflow',
      description:
        'Teams often pair an IDE agent with Jira or Linear in the cloud. Work Graph is the tracker that lives in the repo: same board and statuses, plus intent in .bvc and proof per work.id. It complements the IDE; external PM sync is not the core product.',
    },
  };
}

/**
 * @param {'ru' | 'en'} locale
 * @param {'product' | 'evidence' | 'compare'} kind
 * @returns {Array<Record<string, unknown>>}
 */
export function getPublicSitePageBlocks(locale, kind) {
  const ru = locale === 'ru';
  const blocks = ru ? PAGE_BLOCKS_RU : PAGE_BLOCKS_EN;
  return blocks[kind] ?? [];
}

/** @param {'ru' | 'en'} locale */
export function getProductScreenshotGalleryOptions(locale) {
  return locale === 'ru'
    ? {
      title: 'Как выглядит Work Graph',
      lead:
        'Пройдите поверхности по порядку — аналитика, контракт, доска, проверки и память — в одном локальном UI, связанном с intent/.',
      shotKeys: ['analytics', 'tasks', 'board', 'verification', 'memory', 'architecture'],
    }
    : {
      title: 'What Work Graph looks like',
      lead:
        'Walk through the surfaces in order — analytics, contract, board, verification and memory — in one local UI tied to intent/.',
      shotKeys: ['analytics', 'tasks', 'board', 'verification', 'memory', 'architecture'],
    };
}

/** @type {Record<string, Array<Record<string, unknown>>>} */
const PAGE_BLOCKS_EN = {
  product: [
    {
      type: 'steps',
      title: 'The platform lives in your repository',
      items: [
        {
          title: 'Fully local and in Git',
          body:
            'All data (.bvc, .md, .jsonl) stays inside your repository. No WG cloud database, no SaaS subscriptions — you own the data.',
        },
        {
          title: 'MCP integration',
          body:
            'AI agents talk to WG over MCP, calling tools such as get_work_contract, submit_evidence or assert_task_ready_for_done.',
        },
        {
          title: 'Local UI',
          body:
            'A web interface for backlog, kanban board, analytics, verification and architecture.',
        },
        {
          title: '1C / OneBase support',
          body:
            'Domain verticals including 1C via specialized MCP servers and evidence contracts.',
        },
      ],
    },
    {
      type: 'pipeline',
      title: 'Five steps in one repository',
      intro: 'Each step has a screen in the UI and a file contract in intent/.',
      steps: [
        { iconName: 'lightbulb', label: 'Decision (AN)', detail: 'Capture why before backlog intake' },
        { iconName: 'clipboard-text', label: 'Work contract (.bvc)', detail: 'Basis, Vector, Goal and checks' },
        { iconName: 'robot', label: 'Agent claim', detail: 'work.id, targetFiles and allowlist' },
        { iconName: 'list-checks', label: 'Evidence', detail: 'Commands, traces and structured records' },
        { iconName: 'brain', label: 'Verified memory', detail: 'Closed work linked to files in git' },
      ],
    },
    {
      type: 'siteSections',
      title: 'Surfaces you work in every day',
      intro: 'Open npm run workgraph:ui on port 4177 after init — the same backlog your MCP agent sees.',
      sections: [
        {
          icon: 'chart-bar',
          title: 'Analytics',
          body: 'AN records hold options, boundaries and lineage before tasks exist. You see which epic or decision a work item came from — not a lost chat thread.',
        },
        {
          icon: 'clipboard-text',
          title: 'BVC work items',
          body: 'Each task is a .bvc atom with Basis, Vector, Goal, checks and labels. The drawer is the human view of what get_work_contract returns to the agent.',
        },
        {
          icon: 'kanban',
          title: 'Kanban board',
          body: 'Columns reflect contract state: backlog, ready, claimed, doing, verify. Moving a card follows evidence and gates — not a manual status edit.',
        },
        {
          icon: 'shield-check',
          title: 'Verification',
          body: 'Tier A/B/C matrix lists deterministic commands and optional gates. assert_task_ready_for_done returns violations[] when proof is missing.',
        },
        {
          icon: 'brain',
          title: 'Project memory',
          body: 'Done tasks with valid evidence become memory records. The next agent session reads git, not a recap of the previous conversation.',
        },
      ],
    },
    {
      type: 'graphTrinity',
      title: 'Three graphs behind the UI',
      body: 'Screens map to Intent, Execution and Memory graphs. Together they form a loop humans can audit and agents can execute via MCP.',
    },
    {
      type: 'iconLabelGrid',
      title: 'What lands in your repo after init',
      body: 'npx @work-graph/cli init . wires the filesystem contract — no WG cloud account.',
      items: ['intent/ graph', 'work.bvc backlog', 'MCP for Cursor', 'UI on :4177', 'workgraph:doctor', 'llms.txt'],
    },
  ],
  evidence: [
    {
      type: 'siteSections',
      title: 'What counts as evidence',
      intro: 'Evidence is machine-readable. Chat messages and hand-waved “done” are not sufficient for Tier A work.',
      sections: [
        {
          icon: 'terminal',
          title: 'Command output',
          body: 'npm test, bvc lint, custom scripts — exit code, stdout/stderr and timestamps attached to work.id. CI results can be referenced the same way.',
        },
        {
          icon: 'link',
          title: 'Trace links',
          body: 'work.id ↔ files ↔ tests ↔ AN decisions. Broken links surface in diagnostics before merge, not after production.',
        },
        {
          icon: 'shield-check',
          title: 'Tier checks',
          body: 'Tier A demands deterministic proof. Tier B/C add optional or environment gates. The matrix is visible in the verification UI and in contract labels.',
        },
      ],
    },
    {
      type: 'pipeline',
      title: 'From claim to done',
      intro: 'MCP tools enforce the sequence; skipping a step leaves the task open with a PolicyViolation or missing-evidence error.',
      steps: [
        { iconName: 'hand-grabbing', label: 'claim_work_item', detail: 'Agent takes work.id and reads contract' },
        { iconName: 'file-code', label: 'edit target_files', detail: 'Changes stay inside allowlist' },
        { iconName: 'terminal', label: 'run commands', detail: 'Only approved scripts' },
        { iconName: 'upload-simple', label: 'submit evidence', detail: 'Structured JSON + logs' },
        { iconName: 'seal-check', label: 'assert_task_ready_for_done', detail: 'Gate verdict → done' },
      ],
    },
    {
      type: 'codeShowcase',
      title: 'Checks live in the contract',
      body: 'BVC Checks and MCP gates share the same definition of ready — agents and humans see the same missing[] list.',
    },
    {
      type: 'screenshotGallery',
      title: 'Verification and memory in the UI',
      lead: 'The matrix shows what is still missing. Memory lists what was proven and closed — the audit trail for the next session.',
      shotKeys: ['verification', 'memory', 'tasks'],
    },
    {
      type: 'siteSections',
      sections: [
        {
          title: 'Ready-for-done',
          body: 'Closing requires evidence, checks and a traceable work contract. The gate returns exactly which field or command failed — not a generic error.',
          icon: 'check-circle',
          badges: [{ label: 'GATE', tone: 'accent' }],
        },
        {
          title: 'Evidence records',
          body: 'Lines and structured entries bind commands, diffs, traces and verification outcomes to one work.id. Export and review follow git history.',
          icon: 'list-checks',
          badges: [{ label: 'TRACE', tone: 'warning' }],
        },
        {
          title: 'Local by default',
          body: 'The ledger is files in your repository. No separate SaaS database — PR review and blame apply to evidence the same as to code.',
          icon: 'hard-drives',
          badges: [{ label: 'GIT', tone: 'ok' }],
        },
      ],
    },
  ],
  compare: [
    { type: 'comparisonStrip' },
    {
      type: 'siteSections',
      sections: [
        {
          title: 'Competitor matrix',
          body: 'Work Graph sits at the intent-graph layer: goals, decisions, work items, evidence and verified memory in one local graph.',
          competitors: true,
        },
      ],
    },
    {
      type: 'boundaries',
      title: 'When Work Graph fits',
      items: [
        {
          iconName: 'check-circle',
          heading: 'You want audit, not vibes',
          body: 'Tasks must cite files, commands and gates before done. Regulated, platform or long-lived codebases benefit most.',
        },
        {
          iconName: 'git-branch',
          heading: 'You already live in git',
          body: 'Backlog and evidence as files match PR review, forks and offline work. No vendor lock-in for the intent graph.',
        },
        {
          iconName: 'robot',
          heading: 'You run IDE agents',
          body: 'Cursor or Claude Code execute; WG supplies get_work_contract, evidence tools and PolicyViolation when proof is missing.',
        },
      ],
    },
    {
      type: 'boundaries',
      title: 'What Work Graph is not',
      variant: 'muted',
      items: [
        {
          iconName: 'x-circle',
          heading: 'Not enterprise cloud PM',
          body: 'WG is a local tracker in git, not a multi-tenant SaaS like Jira Cloud. Optional sync with external PM tools is outside the core scope.',
        },
        {
          iconName: 'x-circle',
          heading: 'Not an IDE',
          body: 'WG does not edit files or run models. It governs contracts around the edits your agent already makes.',
        },
        {
          iconName: 'x-circle',
          heading: 'Not fuzzy memory',
          body: 'Mem0-style recall is complementary. WG memory is closed work with evidence — accountable, not conversational.',
        },
      ],
    },
  ],
};

/** @type {Record<string, Array<Record<string, unknown>>>} */
const PAGE_BLOCKS_RU = {
  product: [
    {
      type: 'steps',
      title: 'Легкий таск-трекер для вашего проекта',
      items: [
        {
          title: 'Полностью локально и в Git',
          body:
            'Все данные (.bvc, .md, .jsonl) хранятся внутри вашего репозитория. Нет облачной базы WG, нет SaaS-подписок, вы полностью владеете данными.',
        },
        {
          title: 'Интеграция через MCP',
          body:
            'AI-агенты общаются с WG через MCP-протокол, вызывая инструменты вроде get_work_contract, submit_evidence или assert_task_ready_for_done.',
        },
        {
          title: 'Локальный UI',
          body:
            'Веб-интерфейс для управления бэклогом, доской задач, аналитикой, проверками и архитектурой.',
        },
        {
          title: 'Поддержка 1С / OneBase',
          body:
            'Система поддерживает доменные вертикали, включая 1С, через специализированные MCP-серверы и evidence-контракты.',
        },
      ],
    },
    {
      type: 'pipeline',
      title: 'Пять шагов в одном репозитории',
      intro: 'У каждого шага — экран в UI и файловый контракт в intent/.',
      steps: [
        { iconName: 'lightbulb', label: 'Решение (AN)', detail: 'Зафиксировать «зачем» до бэклога' },
        { iconName: 'clipboard-text', label: 'Контракт (.bvc)', detail: 'Базис, Вектор, Цель и проверки' },
        { iconName: 'robot', label: 'Захват агентом', detail: 'work.id, targetFiles, allowlist' },
        { iconName: 'list-checks', label: 'Доказательства', detail: 'Команды, трассы, записи' },
        { iconName: 'brain', label: 'Проверенная память', detail: 'Закрытая работа со ссылками в git' },
      ],
    },
    {
      type: 'siteSections',
      title: 'Экраны, с которыми вы работаете',
      intro: 'После init откройте npm run workgraph:ui на :4177 — тот же бэклог, что видит MCP-агент.',
      sections: [
        {
          icon: 'chart-bar',
          title: 'Аналитика',
          body: 'AN-записи хранят варианты, границы и lineage до появления задач. Видно, из какого эпика или решения вырос work item — не потерянный тред в чате.',
        },
        {
          icon: 'clipboard-text',
          title: 'Задачи BVC',
          body: 'Каждая задача — атом .bvc с Базисом, Вектором, Целью, checks и метками. Drawer — человеческий вид того, что get_work_contract отдаёт агенту.',
        },
        {
          icon: 'kanban',
          title: 'Доска задач',
          body: 'Колонки отражают состояние контракта: backlog, ready, claimed, doing, verify. Перемещение карточки следует evidence и гейтам, а не ручной метке.',
        },
        {
          icon: 'shield-check',
          title: 'Проверки',
          body: 'Матрица tier A/B/C: детерминированные команды и опциональные гейты. assert_task_ready_for_done возвращает violations[], если доказательств не хватает.',
        },
        {
          icon: 'brain',
          title: 'Память проекта',
          body: 'Закрытые задачи с валидным evidence становятся записями памяти. Следующая сессия агента читает git, а не пересказ прошлого чата.',
        },
      ],
    },
    {
      type: 'graphTrinity',
      title: 'Три графа за интерфейсом',
      body: 'Экраны соответствуют графам намерений, исполнения и памяти. Вместе — цикл, который человек аудирует, а агент исполняет через MCP.',
    },
    {
      type: 'iconLabelGrid',
      title: 'Что появляется в репозитории после init',
      body: 'npx @work-graph/cli init . задаёт файловый контракт — без облачного аккаунта WG.',
      items: ['граф intent/', 'бэклог .bvc', 'MCP для Cursor', 'UI на :4177', 'workgraph:doctor', 'llms.txt'],
    },
  ],
  evidence: [
    {
      type: 'siteSections',
      title: 'Что считается доказательством',
      intro: 'Evidence машиночитаем. Сообщения в чате и слова «готово» для Tier A не достаточны.',
      sections: [
        {
          icon: 'terminal',
          title: 'Вывод команд',
          body: 'npm test, bvc lint, свои скрипты — exit code, stdout/stderr и время привязаны к work.id. Результаты CI можно ссылать так же.',
        },
        {
          icon: 'link',
          title: 'Трассы связей',
          body: 'work.id ↔ файлы ↔ тесты ↔ решения AN. Битые связи видны в диагностике до merge, а не после продакшена.',
        },
        {
          icon: 'shield-check',
          title: 'Tier-проверки',
          body: 'Tier A требует детерминированного proof. B/C добавляют опциональные и environment-гейты. Матрица видна в UI и в метках контракта.',
        },
      ],
    },
    {
      type: 'pipeline',
      title: 'От захвата до done',
      intro: 'MCP-инструменты задают порядок; пропуск шага оставляет задачу открытой — PolicyViolation или missing_evidence.',
      steps: [
        { iconName: 'hand-grabbing', label: 'claim_work_item', detail: 'Агент берёт work.id и читает контракт' },
        { iconName: 'file-code', label: 'правки target_files', detail: 'Только внутри allowlist' },
        { iconName: 'terminal', label: 'запуск команд', detail: 'Только разрешённые скрипты' },
        { iconName: 'upload-simple', label: 'submit evidence', detail: 'JSON + логи' },
        { iconName: 'seal-check', label: 'assert_task_ready_for_done', detail: 'Вердикт гейта → done' },
      ],
    },
    {
      type: 'codeShowcase',
      title: 'Проверки живут в контракте',
      body: 'Секция Checks в BVC и MCP-гейты используют одно определение готовности — у агента и человека один и тот же список missing[].',
    },
    {
      type: 'screenshotGallery',
      title: 'Проверки и память в UI',
      lead: 'В матрице видно, чего не хватает. В памяти — что уже доказано и закрыто: аудит-след для следующей сессии.',
      shotKeys: ['verification', 'memory', 'tasks'],
    },
    {
      type: 'siteSections',
      sections: [
        {
          title: 'Готовность к завершению',
          body: 'Закрытие требует evidence, checks и трассируемого контракта. Гейт возвращает, какое поле или команда не прошли — не общую ошибку.',
          icon: 'check-circle',
          badges: [{ label: 'ГЕЙТ', tone: 'accent' }],
        },
        {
          title: 'Записи доказательств',
          body: 'Строки и структурированные записи связывают команды, diff, трассы и итог проверки с одним work.id. Review и blame — через git.',
          icon: 'list-checks',
          badges: [{ label: 'ТРАССА', tone: 'warning' }],
        },
        {
          title: 'Локально по умолчанию',
          body: 'Журнал — файлы в репозитории. Отдельной SaaS-базы нет: PR-review применим к evidence так же, как к коду.',
          icon: 'hard-drives',
          badges: [{ label: 'GIT', tone: 'ok' }],
        },
      ],
    },
  ],
  compare: [
    { type: 'comparisonStrip' },
    {
      type: 'siteSections',
      sections: [
        {
          title: 'Матрица конкурентов',
          body: 'Work Graph — слой графа намерений: цели, решения, задачи, evidence и проверенная память в одном локальном графе.',
          competitors: true,
        },
      ],
    },
    {
      type: 'boundaries',
      title: 'Когда Work Graph уместен',
      items: [
        {
          iconName: 'check-circle',
          heading: 'Нужен аудит, а не «вайб»',
          body: 'Задачи должны ссылаться на файлы, команды и гейты до done. Особенно платформы, regulated и долгоживущие кодовые базы.',
        },
        {
          iconName: 'git-branch',
          heading: 'Вы уже в git',
          body: 'Бэклог и evidence как файлы — PR, форки и офлайн. Без vendor lock-in для графа намерений.',
        },
        {
          iconName: 'robot',
          heading: 'Вы запускаете IDE-агентов',
          body: 'Cursor или Claude Code исполняют; WG даёт get_work_contract, evidence-tools и PolicyViolation без proof.',
        },
      ],
    },
    {
      type: 'boundaries',
      title: 'Чем Work Graph не является',
      variant: 'muted',
      items: [
        {
          iconName: 'x-circle',
          heading: 'Не корпоративный облачный PM',
          body: 'WG — локальный трекер в git, а не multi-tenant SaaS вроде Jira Cloud. Синхронизация с внешним PM — вне ядра.',
        },
        {
          iconName: 'x-circle',
          heading: 'Не IDE',
          body: 'WG не правит файлы и не запускает модели. Он управляет контрактами вокруг правок агента.',
        },
        {
          iconName: 'x-circle',
          heading: 'Не «память из чата»',
          body: 'Mem0 и аналоги — комплемент. Память WG — закрытая работа с evidence, а не пересказ диалога.',
        },
      ],
    },
  ],
};
