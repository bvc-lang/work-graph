import { tokenizeForBm25 } from './semanticSearchBm25.mjs';

const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

function documentText(document) {
  const parts = document.parts ?? [];
  return parts.map((part) => String(part.text ?? '')).join('\n');
}

export function buildTfidfIndex(documents) {
  const docCount = documents.length;
  const docFreq = new Map();
  const docTokens = documents.map((document) => {
    const counts = new Map();
    for (const token of tokenizeForBm25(documentText(document))) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }

    for (const token of counts.keys()) {
      docFreq.set(token, (docFreq.get(token) ?? 0) + 1);
    }

    return { id: document.id, counts };
  });

  const vectors = docTokens.map((entry) => {
    const total = [...entry.counts.values()].reduce((sum, value) => sum + value, 0) || 1;
    const weights = new Map();

    for (const [token, count] of entry.counts.entries()) {
      const tf = count / total;
      const idf = Math.log((docCount + 1) / ((docFreq.get(token) ?? 0) + 1)) + 1;
      weights.set(token, tf * idf);
    }

    return { id: entry.id, weights };
  });

  return {
    schema: 'semantic-search.tfidf-index.v1',
    docCount,
    vectors,
  };
}

function vectorNorm(weights) {
  let sum = 0;
  for (const value of weights.values()) {
    sum += value * value;
  }

  return Math.sqrt(sum) || 1;
}

function cosineSimilarity(left, right) {
  let dot = 0;
  for (const [token, weight] of left.entries()) {
    dot += weight * (right.get(token) ?? 0);
  }

  return dot / (vectorNorm(left) * vectorNorm(right));
}

export function scoreTfidfCosine(query, index) {
  const queryCounts = new Map();
  for (const token of tokenizeForBm25(String(query ?? ''))) {
    queryCounts.set(token, (queryCounts.get(token) ?? 0) + 1);
  }

  const total = [...queryCounts.values()].reduce((sum, value) => sum + value, 0) || 1;
  const queryWeights = new Map();
  for (const [token, count] of queryCounts.entries()) {
    queryWeights.set(token, count / total);
  }

  return index.vectors
    .map((entry) => ({
      id: entry.id,
      score: cosineSimilarity(queryWeights, entry.weights),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      const byScore = right.score - left.score;
      return byScore !== 0 ? byScore : compareText(left.id, right.id);
    });
}
