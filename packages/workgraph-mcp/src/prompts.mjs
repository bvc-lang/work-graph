const TOOL_RULES = [
  'Use list_work_items/get_current_cycle before choosing work unless the user named a workId.',
  'Use get_work_item or read workgraph://item/{workId} before writes.',
  'BVC new-write (protocol bvc-new-write-policy-v1.bvc): create_work_item writes intent/**/work/*.work.bvc only; legacy *.work.bvc is read-only — do not create new .work.bvc files.',
  'New protocol atoms and formatted BVC files use extension .bvc; legacy .bvc is dual-read only until bulk migrate.',
  'Before claim_work_item or update_work_item_status to ready/claimed/doing: task must have analysis (record_work_item_analysis) and verdict useful (record_work_item_decision). Otherwise refuse execution.',
  'create_work_item must populate «Анализ» and «Решение» in the atom immediately (explicit Russian prose preferred; defaults derive from basis/goal — never English template bullets).',
  'New WorkItem prose (Базис/Вектор/Цель/Проверки/title): Russian, min lengths per work-item-bvc-quality; forbidden jargon: closing analysis, Canon:, evidence, upstream, Track A, feeds_epics, depends_on=, «Стоит завести «…» в бэклог».',
  'Analysis is pre-execution only: feasibility (стоит ли делать), scope, deps, risks, alternatives — NOT a post-factum report of what was built, tests run, or evidence already in the atom.',
  'Write analysis in present/decision tense («Стоит брать», «Не стоит», «Можно стартовать»), never past retrospective («было оправдано», «можно было») even if work.status is done.',
  'Analysis and decision are written only from the connected agent (MCP client LLM): you read the task, reason, then call record_work_item_analysis / record_work_item_decision. WorkGraph server never calls LLM.',
  'Do not mark a WorkItem done without concrete evidence.',
  'Keep dashboard/kanban work in WorkGraph UI; MCP is the agent client bridge.',
  'Canon write-boundary (AN-77): NEVER use ApplyPatch/Write on intent/**/work/*.work.bvc or .work-graph/canon/** — read-only for file tools. Use create_work_item, claim_work_item, update_work_item_status, add_work_item_evidence, complete_work_item.',
  'Epic/subtask hierarchy: create_work_item with itemKind=epic|subtask and parentId for children — do not patch parent_id manually.',
  'Epic rollup: complete_work_item on the last open child auto-closes the direct parent epic when all siblings are done; check rolledUpParentIds in the response.',
].join('\n');

export const WORK_ITEM_ANALYSIS_SECTIONS = [
  'Целесообразность:',
  'Контекст и scope:',
  'Зависимости и готовность:',
  'Риски и альтернативы:',
  'Критерии успеха:',
  'Рекомендация для решения:',
].join('\n');

export const workgraphPrompts = {
  analyze_work_item: {
    description: 'Pre-execution feasibility analysis for a WorkItem (not post-factum review).',
    argsSchema: { workId: 'WorkItem id to analyze' },
    text: ({ workId }) => `Analyze WorkGraph item ${workId || '<workId>'} — **before execution** (pre-execution feasibility, not a post-mortem).

This is a feasibility review (стоит ли делать), NOT a summary of work already done. Do NOT list implemented files, passing tests, or evidence from «Свидетельства» unless you judge future verification risk.

Workflow:
1. get_work_item and read workgraph://item/${workId || '{workId}'}.
2. Read target files / deps only to judge scope and readiness — not to audit completion.
3. Write analysis with these sections (headings exactly, each on its own line):
${WORK_ITEM_ANALYSIS_SECTIONS}
   - Целесообразность: стоит ли брать задачу в работу сейчас; связь с basis/vector/goal.
   - Контекст и scope: что именно нужно сделать; границы; что out of scope.
   - Зависимости и готовность: depends_on, blockers, missing inputs.
   - Риски и альтернативы: дубли track, defer triggers, harmful reasons.
   - Критерии успеха: как проверим результат (из goal/checks), до начала работ.
   - Рекомендация для решения: useful | defer | harmful + одно предложение почему.
   Voice: present/decision («Стоит брать в работу», «Не стоит»), not past («было оправдано»). Optional: wrap paths, APIs, work.id in backticks \`like this\` — plain text in atom, UI renders inline code.
4. Call record_work_item_analysis with the full text.
5. Ask the operator for useful/harmful/defer, then record_work_item_decision with notes.
6. Do NOT claim or implement until verdict is useful.

Tool rules:
${TOOL_RULES}`,
  },
  take_next_work_item: {
    description: 'Claim the next ready WorkItem and execute it with evidence.',
    argsSchema: {},
    text: () => `Take the next WorkGraph item.

Workflow:
1. Call get_current_cycle and list_work_items with status=ready.
2. Choose the highest-priority unblocked ready item.
3. Verify get_work_item_pipeline shows analysis + verdict useful; if not, stop and run analyze_work_item prompt first.
4. Call claim_work_item for that item.
5. Inspect target files and implement the task.
6. Add evidence with add_work_item_evidence.
7. Complete only when the evidence is real and verification passed.

Tool rules:
${TOOL_RULES}`,
  },
  create_work_item: {
    description: 'Draft a new WorkItem atom for the intent tree.',
    argsSchema: {
      title: 'Short human title for the desired work',
      intent: 'Target intent/domain, for example system/runtime or ui/dashboard',
    },
    text: ({ title, intent }) => `Draft a new WorkGraph WorkItem.

Requested title: ${title || '<fill title>'}
Target intent: ${intent || '<choose intent>'}

Workflow:
1. Call create_work_item with workId, title, department, dependsOn, targetFiles, itemKind (epic|subtask|task), parentId for subtasks, and when intake from analytics — intakeSourceKind=analytics-record, intakeSourceRef, analyticsKey.
   The tool creates intent/**/work/{workId}.work.bvc (canonical BVC); never *.work.bvc for new items.
2. Write basis/vector/goal/checks/analysis/decision in Russian (full sentences, min lengths — see repo .cursor/rules/work-items-russian.mdc). Pass them explicitly; do not rely on English template defaults.
3. Refine later with record_work_item_analysis / record_work_item_decision only if scope changed — not to fix empty or robotic create.
4. For new protocols outside the intent tree, prefer *.bvc paths; use bvc format / @bvc-lang/cli when normalizing legacy .bvc.

Tool rules:
${TOOL_RULES}`,
  },
  create_work_item_from_analytics: {
    description: 'Intake from analytics: create backlog WorkItem via MCP after analysis (never file patch).',
    argsSchema: {
      analyticsKey: 'Analytics key e.g. AN-77',
      analyticsBodyPath: 'Path to analytics markdown e.g. work/analytics/foo.md',
      title: 'Short WorkItem title',
    },
    text: ({ analyticsKey, analyticsBodyPath, title }) => `Create a WorkGraph WorkItem from analytics intake — **before any code changes**.

Analytics key: ${analyticsKey || '<AN-XX>'}
Body path: ${analyticsBodyPath || 'work/analytics/<file>.md'}
Title: ${title || '<title>'}

Workflow (do NOT edit .work.bvc files directly):
1. Read the analytics markdown and extract basis/vector/goal for the new item.
2. Write pre-execution analysis (feasibility) — sections from analyze_work_item prompt.
3. Call create_work_item with:
   - workId, title, basis, vector, goal, checks, analysis, decision (Russian prose)
   - intakeSourceKind=analytics-record, intakeSourceRef=\${analyticsBodyPath}, analyticsKey=\${analyticsKey}
   - status=backlog (default), department, targetFiles, dependsOn as needed
   - itemKind=epic for epics; itemKind=subtask + parentId for subtasks
4. Leave status backlog until operator says to implement; then promote → claim_work_item → code → evidence → complete_work_item.

If creating an epic with subtasks: create epic first (itemKind=epic), then each subtask with parentId=<epic-work-id>.

Tool rules:
${TOOL_RULES}`,
  },
  create_epic_subtasks: {
    description: 'Create epic and subtasks with itemKind/parentId via MCP (canonical hierarchy).',
    argsSchema: {
      epicWorkId: 'Epic work.id slug e.g. epic-foo-v1',
      epicTitle: 'Epic human title',
    },
    text: ({ epicWorkId, epicTitle }) => `Create an epic and its subtasks through WorkGraph MCP only.

Epic id: ${epicWorkId || 'epic-<slug>-v1'}
Epic title: ${epicTitle || '<title>'}

Workflow:
1. create_work_item with itemKind=epic, workId=\${epicWorkId}, title, basis/vector/goal/checks, analysis/decision in Russian.
2. For each subtask: create_work_item with itemKind=subtask, parentId=\${epicWorkId}, dependsOn if needed.
3. Verify with get_work_item that itemKind and parentId are set — never patch labels via file tools.
4. Promote/claim subtasks only after analysis+verdict useful on each item.

Example MCP args: { workId: "my-sub", title: "...", itemKind: "subtask", parentId: "${epicWorkId || 'epic-foo-v1'}", department: "agent-platform" }

Tool rules:
${TOOL_RULES}`,
  },
  add_evidence: {
    description: 'Add verification evidence to an existing WorkItem.',
    argsSchema: { workId: 'WorkItem id' },
    text: ({ workId }) => `Add evidence for WorkItem ${workId || '<workId>'}.

Workflow:
1. Read the WorkItem with get_work_item.
2. Run or inspect the relevant verification.
3. Add a concise evidence line through add_work_item_evidence.
4. If the task is complete, use complete_work_item with the same concrete evidence.

Tool rules:
${TOOL_RULES}`,
  },
  close_work_item: {
    description: 'Verify and close an existing WorkItem.',
    argsSchema: { workId: 'WorkItem id' },
    text: ({ workId }) => `Close WorkGraph item ${workId || '<workId>'}.

Workflow:
1. Read get_work_item and the raw atom.
2. Check criteria and run targeted verification.
3. If verification fails, add evidence and keep/mark blocked with reason.
4. If verification passes, call complete_work_item with concrete evidence.

Tool rules:
${TOOL_RULES}`,
  },
  show_blockers: {
    description: 'Summarize blocked or dependency-stalled WorkItems.',
    argsSchema: {},
    text: () => `Show WorkGraph blockers.

Workflow:
1. Call get_backlog_snapshot.
2. Identify blocked items, missing dependencies, and ready items waiting on unverified prerequisites.
3. Summarize the smallest next unblock action for each item.
4. Do not write unless the user asks to change status or evidence.

Tool rules:
${TOOL_RULES}`,
  },
  summarize_current_cycle: {
    description: 'Summarize current cycle and recommend next action.',
    argsSchema: {},
    text: () => `Summarize the current WorkGraph cycle.

Workflow:
1. Call get_current_cycle.
2. Call list_work_items for ready, doing, verify, and blocked if needed.
3. Report current focus, ready queue, blocked risks, and the recommended next action.
4. Keep it concise and cite WorkItem ids.

Tool rules:
${TOOL_RULES}`,
  },
};

export function toMcpPromptResult(name, args = {}) {
  const prompt = workgraphPrompts[name];
  if (!prompt) {
    throw new Error(`Unknown WorkGraph prompt: ${name}`);
  }
  return {
    description: prompt.description,
    messages: [
      {
        role: 'user',
        content: { type: 'text', text: prompt.text(args) },
      },
    ],
  };
}
