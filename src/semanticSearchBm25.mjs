const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

export function tokenizeForBm25(text) {
  return String(text ?? '')
    .toLowerCase()
    .split(/[^a-z0-9\u0400-\u04ff]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

export function buildBm25Index(documents) {
  const docTokens = documents.map((document) => {
    const corpusText = [
      document.label,
      document.summary,
      ...(document.parts ?? []).map((part) => part.text),
      document.excerpt ?? '',
    ].filter(Boolean).join(' ');

    const tokens = tokenizeForBm25(corpusText);
    const termFreq = new Map();
    for (const token of tokens) {
      termFreq.set(token, (termFreq.get(token) ?? 0) + 1);
    }

    return {
      id: document.id,
      length: tokens.length,
      termFreq,
    };
  });

  const documentFrequency = new Map();
  for (const doc of docTokens) {
    for (const term of doc.termFreq.keys()) {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
    }
  }

  const avgDocLength = docTokens.length === 0
    ? 0
    : docTokens.reduce((sum, doc) => sum + doc.length, 0) / docTokens.length;

  return {
    docTokens,
    documentFrequency,
    avgDocLength,
    documentCount: docTokens.length,
  };
}

export function scoreBm25(queryTokens, index, options = {}) {
  const k1 = options.k1 ?? 1.2;
  const b = options.b ?? 0.75;
  const scores = new Map();

  if (queryTokens.length === 0 || index.documentCount === 0) {
    return scores;
  }

  for (const doc of index.docTokens) {
    let score = 0;

    for (const term of queryTokens) {
      const tf = doc.termFreq.get(term) ?? 0;
      if (tf === 0) {
        continue;
      }

      const df = index.documentFrequency.get(term) ?? 0;
      const idf = Math.log(1 + (index.documentCount - df + 0.5) / (df + 0.5));
      const numerator = tf * (k1 + 1);
      const denominator = tf + k1 * (1 - b + b * (doc.length / Math.max(index.avgDocLength, 1)));
      score += idf * (numerator / denominator);
    }

    if (score > 0) {
      scores.set(doc.id, Number(score.toFixed(4)));
    }
  }

  return scores;
}

export function mergeLexicalAndBm25Scores(entries, bm25Scores, options = {}) {
  const bm25Weight = Number(options.bm25Weight ?? 4);

  return entries
    .map((entry) => ({
      ...entry,
      lexicalScore: entry.score,
      bm25Score: bm25Scores.get(entry.id) ?? 0,
      score: entry.score + bm25Weight * (bm25Scores.get(entry.id) ?? 0),
    }))
    .sort((left, right) => {
      const byScore = right.score - left.score;
      if (byScore !== 0) {
        return byScore;
      }

      return compareText(left.id, right.id);
    });
}
