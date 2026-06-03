#!/usr/bin/env node
import { readWorkItemAtomFromRepo, readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { parseWorkItems } from '../src/workGraphRuntime.mjs';
import { WORK_ITEM_TITLE_RU_CATALOG } from '../src/workItemTitleRuCatalog.mjs';

const TECH_TERMS = /^(?:MCP|BVC|Work Graph|Cursor|ADR|CLI|npm|UI|SSE|ICU|SVG|NLUX|PVRG|RAG|JSON|CSS|API|OData|OneBase|ioHasC|Gripe|Marketplace|Home|Inbox|Cmd\+K|EN|RU|AN-\d+|MVP|DoR|DoD|WG|DS|PM|L1|L2|P0|P2|v1|SSE|read-only|alwaysApply|Detect-or-Declare|few-shot|npm-first|user-first|live-sync|detail drawer|push\/pop|EN\+RU|gripe-dark|backlog:ui)$/iu;

function cyrillicScore(text) {
  return (String(text ?? '').match(/[\u0400-\u04FF]/g) ?? []).length;
}

function latinScore(text) {
  return (String(text ?? '').match(/[A-Za-z]/g) ?? []).length;
}

function startsWithEnglishVerb(title) {
  return /^(?:Implement|Design|Add|Wire|Extract|Migrate|Document|Define|Analyze|Audit|Author|Align|Chain|Build|Enable|Register|Finalize|Inventory|Isolate|Rollout|Closing|Optional|Run|Refresh|Sync|Upgrade|Evaluate|Extend|Pilot|Rebuild|Separate|Draft|Defer|Decide|Reconcile|Unify|Fix|Test|Export|Port)\b/u.test(String(title ?? ''));
}

function hasEnglishLead(title) {
  const raw = String(title ?? '').trim();
  const firstWord = raw.split(/\s+/)[0] ?? '';
  return /^[A-Za-z]{3,}/u.test(firstWord) && !TECH_TERMS.test(firstWord);
}

async function main() {
  const items = await readWorkItemsFromRepo({ cwd: process.cwd() });
  const issues = [];

  for (const summary of items) {
    const source = await readWorkItemAtomFromRepo(summary.id);
    const [item] = parseWorkItems(source.text);
    const title = item?.title ?? WORK_ITEM_TITLE_RU_CATALOG[summary.id] ?? summary.title ?? '';
    const cyr = cyrillicScore(title);
    const lat = latinScore(title);

    const problems = [];
    if (cyr < 6) problems.push('no_cyrillic');
    if (startsWithEnglishVerb(title)) problems.push('english_verb');
    if (hasEnglishLead(title)) problems.push('english_lead');
    if (lat > 18 && lat > cyr * 0.55) problems.push('latin_heavy');

    if (problems.length > 0) {
      issues.push({ id: summary.id, title, problems });
    }
  }

  console.log(JSON.stringify({
    schema: 'workgraph.audit-work-item-titles.v1',
    total: items.length,
    issues: issues.length,
  }, null, 2));

  for (const row of issues.slice(0, 60)) {
    console.log(`${row.id} | ${row.problems.join(',')} | ${row.title}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
