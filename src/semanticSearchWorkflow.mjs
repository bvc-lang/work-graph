import { classifyWorkItemBlock } from './architectureSnapshot.mjs';
import {
  buildBm25Index,
  scoreBm25,
  tokenizeForBm25,
} from './semanticSearchBm25.mjs';
import { enrichSemanticDocumentsWithExcerpts } from './semanticSearchExcerpts.mjs';
import { buildTfidfIndex, scoreTfidfCosine } from './semanticSearchTfidfVector.mjs';

export const SEMANTIC_SEARCH_RESULT_SCHEMA = 'semantic-search.result.v1';
export const SEMANTIC_SEARCH_MODE_LEXICAL_V1 = 'lexical-v1';
export const SEMANTIC_SEARCH_MODE_HYBRID_V1 = 'hybrid-lexical-bm25-v1';
export const SEMANTIC_SEARCH_MODE_HYBRID_VECTOR_V1 = 'hybrid-lexical-bm25-tfidf-v1';

const DEFAULT_LIMIT = 12;
const DEFAULT_MAX_CHARS = 4000;

const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

function tokenizeQuery(query) {
  return String(query ?? '')
    .toLowerCase()
    .split(/[^a-z0-9\u0400-\u04ff]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function fieldText(item, field) {
  if (field === 'targetFiles') {
    return (item.targetFiles ?? []).join(' ');
  }

  return String(item[field] ?? '');
}

function scoreDocument(tokens, parts) {
  if (tokens.length === 0) {
    return 0;
  }

  let score = 0;
  for (const part of parts) {
    const haystack = String(part.text ?? '').toLowerCase();
    const weight = Number(part.weight ?? 1);
    for (const token of tokens) {
      if (haystack.includes(token)) {
        score += weight;
      }
    }
  }

  return score;
}

function buildWorkItemDocument(item) {
  const architectureBlockId = classifyWorkItemBlock(item);
  const traceRefs = [`work:${item.id}`];

  return {
    id: `work:${item.id}`,
    kind: 'work_item',
    label: item.title || item.id,
    summary: String(item.goal || item.vector || item.nextAction || item.title || item.id).trim(),
    workId: item.id,
    filePath: null,
    architectureBlockId,
    traceRefs,
    parts: [
      { text: item.id, weight: 4 },
      { text: item.title, weight: 3 },
      { text: item.basis, weight: 2 },
      { text: item.vector, weight: 2 },
      { text: item.goal, weight: 2 },
      { text: (item.targetFiles ?? []).join(' '), weight: 2 },
      { text: item.nextAction, weight: 1 },
      { text: item.ownerRole, weight: 1 },
      { text: item.department, weight: 1 },
    ],
  };
}

function buildFileArtifactDocuments(item) {
  return (item.targetFiles ?? []).map((filePath) => ({
    id: `file:${filePath}`,
    kind: 'file_artifact',
    label: filePath,
    summary: `Файл из задачи ${item.id}`,
    workId: item.id,
    filePath,
    architectureBlockId: classifyWorkItemBlock(item),
    traceRefs: [`file:${filePath}`, `work:${item.id}`],
    parts: [
      { text: filePath, weight: 4 },
      { text: item.id, weight: 2 },
      { text: item.title, weight: 2 },
    ],
  }));
}

export function buildSemanticSearchDocuments(items, options = {}) {
  if (!Array.isArray(items)) {
    throw new TypeError('items must be an array');
  }

  const includeFileArtifacts = options.includeFileArtifacts !== false;
  const documents = [];

  for (const item of items) {
    documents.push(buildWorkItemDocument(item));
    if (includeFileArtifacts) {
      documents.push(...buildFileArtifactDocuments(item));
    }
  }

  return documents.sort((left, right) => compareText(left.id, right.id));
}

export function searchSemanticWorkflow(query, items, options = {}) {
  const mode = options.mode ?? SEMANTIC_SEARCH_MODE_LEXICAL_V1;
  if (mode === SEMANTIC_SEARCH_MODE_HYBRID_V1 || mode === SEMANTIC_SEARCH_MODE_HYBRID_VECTOR_V1) {
    throw new TypeError('hybrid mode requires searchSemanticWorkflowAsync');
  }

  return searchSemanticWorkflowLexical(query, items, options);
}

export function searchSemanticWorkflowLexical(query, items, options = {}) {
  const tokens = tokenizeQuery(query);
  const limit = Number.isInteger(options.limit) && options.limit > 0
    ? options.limit
    : DEFAULT_LIMIT;
  const maxChars = Number.isInteger(options.maxChars) && options.maxChars > 0
    ? options.maxChars
    : DEFAULT_MAX_CHARS;

  if (tokens.length === 0) {
    return {
      schema: SEMANTIC_SEARCH_RESULT_SCHEMA,
      query: String(query ?? '').trim(),
      mode: SEMANTIC_SEARCH_MODE_LEXICAL_V1,
      truncated: false,
      hitCount: 0,
      summaryChars: 0,
      hits: [],
      reviewRequired: false,
    };
  }

  const documents = options.documents ?? buildSemanticSearchDocuments(items, options);
  const scored = documents
    .map((document) => ({
      ...document,
      score: scoreDocument(tokens, document.parts),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      const byScore = right.score - left.score;
      if (byScore !== 0) {
        return byScore;
      }

      return compareText(left.id, right.id);
    });

  const hits = [];
  let summaryChars = 0;
  let truncated = false;

  for (const entry of scored) {
    if (hits.length >= limit) {
      truncated = true;
      break;
    }

    const nextSummaryChars = summaryChars + entry.summary.length;
    if (nextSummaryChars > maxChars && hits.length > 0) {
      truncated = true;
      continue;
    }

    hits.push({
      id: entry.id,
      score: entry.score,
      kind: entry.kind,
      label: entry.label,
      summary: entry.summary,
      workId: entry.workId,
      filePath: entry.filePath,
      architectureBlockId: entry.architectureBlockId,
      traceRefs: [...entry.traceRefs].sort(compareText),
    });
    summaryChars = nextSummaryChars;
  }

  if (hits.length < scored.length) {
    truncated = true;
  }

  return {
    schema: SEMANTIC_SEARCH_RESULT_SCHEMA,
    query: String(query ?? '').trim(),
    mode: SEMANTIC_SEARCH_MODE_LEXICAL_V1,
    truncated,
    hitCount: hits.length,
    summaryChars,
    hits,
    reviewRequired: false,
    embeddingsUsed: false,
  };
}

export async function searchSemanticWorkflowAsync(query, items, options = {}) {
  const mode = options.mode ?? SEMANTIC_SEARCH_MODE_LEXICAL_V1;
  const useHybrid = mode === SEMANTIC_SEARCH_MODE_HYBRID_V1
    || mode === SEMANTIC_SEARCH_MODE_HYBRID_VECTOR_V1;
  if (!useHybrid) {
    return searchSemanticWorkflowLexical(query, items, options);
  }

  const tokens = tokenizeQuery(query);
  const limit = Number.isInteger(options.limit) && options.limit > 0
    ? options.limit
    : DEFAULT_LIMIT;
  const maxChars = Number.isInteger(options.maxChars) && options.maxChars > 0
    ? options.maxChars
    : DEFAULT_MAX_CHARS;

  if (tokens.length === 0) {
    return {
      schema: SEMANTIC_SEARCH_RESULT_SCHEMA,
      query: String(query ?? '').trim(),
      mode,
      truncated: false,
      hitCount: 0,
      summaryChars: 0,
      hits: [],
      reviewRequired: false,
      embeddingsUsed: mode === SEMANTIC_SEARCH_MODE_HYBRID_VECTOR_V1,
      vectorIndex: mode === SEMANTIC_SEARCH_MODE_HYBRID_VECTOR_V1 ? 'tfidf-v1' : null,
    };
  }

  const baseDocuments = buildSemanticSearchDocuments(items, options);
  const targetFilesByWorkId = new Map(
    items.map((item) => [item.id, [...(item.targetFiles ?? [])]]),
  );
  const documents = await enrichSemanticDocumentsWithExcerpts(baseDocuments, {
    ...options,
    targetFilesByWorkId,
  });

  const lexicalScored = documents
    .map((document) => ({
      ...document,
      score: scoreDocument(tokens, document.parts),
    }))
    .filter((entry) => entry.score > 0);

  const bm25Index = buildBm25Index(documents);
  const bm25Scores = scoreBm25(tokenizeForBm25(query), bm25Index, options);
  const bm25Weight = Number(options.bm25Weight ?? 4);
  const vectorWeight = Number(options.vectorWeight ?? 3);

  let tfidfScores = new Map();
  if (mode === SEMANTIC_SEARCH_MODE_HYBRID_VECTOR_V1) {
    const tfidfIndex = buildTfidfIndex(documents);
    tfidfScores = new Map(scoreTfidfCosine(query, tfidfIndex).map((entry) => [entry.id, entry.score]));
  }

  const candidatePool = documents
    .map((document) => {
      const lexicalScore = lexicalScored.find((entry) => entry.id === document.id)?.score ?? 0;
      const bm25Score = bm25Scores.get(document.id) ?? 0;
      const vectorScore = tfidfScores.get(document.id) ?? 0;
      const score = lexicalScore
        + bm25Weight * bm25Score
        + (mode === SEMANTIC_SEARCH_MODE_HYBRID_VECTOR_V1 ? vectorWeight * vectorScore : 0);

      return {
        ...document,
        lexicalScore,
        bm25Score,
        vectorScore,
        score,
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      const byScore = right.score - left.score;
      if (byScore !== 0) {
        return byScore;
      }

      return compareText(left.id, right.id);
    });

  const hits = [];
  let summaryChars = 0;
  let truncated = false;

  for (const entry of candidatePool) {
    if (hits.length >= limit) {
      truncated = true;
      break;
    }

    const excerpt = entry.excerpt ? entry.excerpt.slice(0, 240) : null;
    const summary = excerpt
      ? `${entry.summary} | excerpt: ${excerpt}`
      : entry.summary;

    const nextSummaryChars = summaryChars + summary.length;
    if (nextSummaryChars > maxChars && hits.length > 0) {
      truncated = true;
      continue;
    }

    hits.push({
      id: entry.id,
      score: Number(entry.score.toFixed(3)),
      lexicalScore: entry.lexicalScore ?? 0,
      bm25Score: entry.bm25Score ?? 0,
      ...(mode === SEMANTIC_SEARCH_MODE_HYBRID_VECTOR_V1
        ? { vectorScore: Number((entry.vectorScore ?? 0).toFixed(3)) }
        : {}),
      kind: entry.kind,
      label: entry.label,
      summary,
      workId: entry.workId,
      filePath: entry.filePath,
      excerpt,
      excerptSources: entry.excerptSources ?? [],
      architectureBlockId: entry.architectureBlockId,
      traceRefs: [...entry.traceRefs].sort(compareText),
    });
    summaryChars = nextSummaryChars;
  }

  if (hits.length < candidatePool.length) {
    truncated = true;
  }

  return {
    schema: SEMANTIC_SEARCH_RESULT_SCHEMA,
    query: String(query ?? '').trim(),
    mode,
    truncated,
    hitCount: hits.length,
    summaryChars,
    hits,
    reviewRequired: false,
    embeddingsUsed: mode === SEMANTIC_SEARCH_MODE_HYBRID_VECTOR_V1,
    vectorIndex: mode === SEMANTIC_SEARCH_MODE_HYBRID_VECTOR_V1 ? 'tfidf-v1' : null,
  };
}

export async function executeSemanticSearchFromRepo(options = {}) {
  const { readWorkItemsFromRepo } = await import('./intentTreeWorkItems.mjs');
  const items = options.items ?? await readWorkItemsFromRepo(options);
  const mode = options.mode ?? SEMANTIC_SEARCH_MODE_LEXICAL_V1;
  if (mode === SEMANTIC_SEARCH_MODE_HYBRID_V1 || mode === SEMANTIC_SEARCH_MODE_HYBRID_VECTOR_V1) {
    return searchSemanticWorkflowAsync(options.query ?? '', items, options);
  }

  return searchSemanticWorkflow(options.query ?? '', items, options);
}
