#!/usr/bin/env node
import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const path = join(root, 'architecture/main.bvc');
let content = fs.readFileSync(path, 'utf8');

const start = content.indexOf('#Architecture_Block_OneBase_Domain<[');
const end = content.indexOf('#Architecture_Block_Derived_Projections<[', start);
if (start < 0 || end < 0) {
  throw new Error('domain block markers not found');
}

const domainsBlock = `#Architecture_Block_Domains<[
Базис:
  Прикладные доменные вертикали Work Graph: OneBase и Marketplace как L2 внутри единого L1-блока «Домены».
Вектор:
  intent/domains/onebase, intent/domains/marketplace и domains/onebase/; maps_to work-graph через intake, roadmap и сопоставление артефактов.
  Среда агента использует L2 OneBase для вертикальных гейтов верификации.
Цель:
  Оператор видит один L1 «Домены» с drill-down на OneBase и Marketplace без дублирования peer-блоков на карте.
Анализ:
  Целесообразность:
  Intent tree уже multi-domain; отдельные L1 domain-* дублировали родителя «Домены» на карте и смешивали уровни в UI.
  Контекст и границы:
  L1 domains hub; L2 onebase-domain и marketplace-domain; maps_to work-graph; department domain-onebase/domain-marketplace сохраняются в work items.
Решение:
  Вердикт: полезно
  Variant A: L1 domains; OneBase и Marketplace — L2-контейнеры внутри блока.

Метки:
  atom.profile: architecture_l1_block
  architecture.block_id: domains
  architecture.layer: L1
  architecture.title: Домены
  architecture.summary: Прикладные вертикали OneBase и Marketplace поверх Work Graph.
  architecture.decision.verdict: useful
  architecture.intent_roots: intent/domains/onebase,intent/domains/marketplace,domains/onebase
  architecture.container.onebase-domain.title: OneBase
  architecture.container.onebase-domain.kind: domain
  architecture.container.onebase-domain.paths: domains/onebase/,intent/domains/onebase
  architecture.container.onebase-domain.basis: Доменная вертикаль OneBase: метаданные конфигурации, проводки, golden path и MCP; изолирована от семантики операционной очереди Work Graph.
  architecture.container.onebase-domain.vector: domains/onebase/,intent/domains/onebase
  architecture.container.onebase-domain.goal: L2 OneBase внутри L1 domains: maps_to work items и вертикальные гейты верификации для agent-runtime.
  architecture.container.onebase-domain.analysis: Целесообразность: OneBase нельзя смешивать с рантаймом work-graph — иначе YAML catalog/document попадает в общую семантику backlog и ломает срез PVRG. Контекст и границы: L2 domain внутри L1 domains; поддеревья domains/onebase/ и intent/domains/onebase; agent-runtime uses для вертикальных задач; не заменяет trace-evidence.
  architecture.container.onebase-domain.decision: L2-контейнер onebase-domain принят; новые domain paths — через intent/domains/onebase и fixture-тесты, не inline в JS snapshot architecture.
  architecture.container.onebase-domain.decision.verdict: useful
  architecture.container.marketplace-domain.title: Marketplace
  architecture.container.marketplace-domain.kind: domain
  architecture.container.marketplace-domain.paths: intent/domains/marketplace/
  architecture.container.marketplace-domain.basis: Доменная вертикаль Marketplace: Laravel monorepo, Hub & Spoke, PM backlog в intent/domains/marketplace/work; department domain-marketplace.
  architecture.container.marketplace-domain.vector: intent/domains/marketplace/
  architecture.container.marketplace-domain.goal: L2 Marketplace внутри L1 domains: roadmap и architecture matrix без классификации в derived-projections.
  architecture.container.marketplace-domain.analysis: Целесообразность: AN-21 завёл marketplace intent до L1 canon; без L2-контейнера оператор видит задачи на roadmap, но не на architecture drill-down внутри «Домены». Контекст и границы: L2 domain внутри L1 domains; поддерево intent/domains/marketplace; maps_to work-graph; shared DS и Blade UI — вне этого контейнера.
  architecture.container.marketplace-domain.decision: L2-контейнер marketplace-domain принят; новые marketplace work items — через intent/domains/marketplace/work и department domain-marketplace.
  architecture.container.marketplace-domain.decision.verdict: useful
]>

`;

content = content.slice(0, start) + domainsBlock + content.slice(end);
content = content.replace(
  '  domain-onebase -> work-graph : maps_to\n  domain-marketplace -> work-graph : maps_to\n  agent-runtime -> domain-onebase : uses',
  '  domains -> work-graph : maps_to\n  agent-runtime -> domains : uses',
);

fs.writeFileSync(path, content);
console.log(JSON.stringify({ schema: 'migrate-architecture-domains-variant-a.v1', path }, null, 2));
