function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const JS_KEYWORDS = new Set([
  'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'default', 'delete',
  'do', 'else', 'export', 'extends', 'false', 'finally', 'for', 'from', 'function', 'if', 'import',
  'in', 'let', 'new', 'null', 'return', 'switch', 'this', 'throw', 'true', 'try', 'typeof',
  'undefined', 'var', 'void', 'while',
]);

export function normalizeCodeLanguage(language) {
  const value = String(language ?? '').trim().toLowerCase();
  if (value === 'yml') return 'yaml';
  if (value === 'js') return 'javascript';
  if (value === 'ts') return 'typescript';
  if (value === 'sh' || value === 'shell') return 'bash';
  return value || 'plaintext';
}

function highlightStructuredTokens(text) {
  let result = '';
  let index = 0;
  const source = String(text ?? '');

  while (index < source.length) {
    const char = source[index];

    if (char === '"' || char === '\'' || char === '`') {
      const quote = char;
      let end = index + 1;
      while (end < source.length && source[end] !== quote) {
        end += 1;
      }
      if (end < source.length) {
        end += 1;
      }
      result += `<span class="code-hl-string">${escapeHtml(source.slice(index, end))}</span>`;
      index = end;
      continue;
    }

    if (/[{}[\],():]/u.test(char)) {
      result += `<span class="code-hl-punct">${escapeHtml(char)}</span>`;
      index += 1;
      continue;
    }

    const numberMatch = source.slice(index).match(/^\d+(?:\.\d+)?/u);
    if (numberMatch && (index === 0 || /[\s,:[{(-]/u.test(source[index - 1]))) {
      result += `<span class="code-hl-number">${escapeHtml(numberMatch[0])}</span>`;
      index += numberMatch[0].length;
      continue;
    }

    const wordMatch = source.slice(index).match(/^[\w.-]+/u);
    if (wordMatch) {
      const word = wordMatch[0];
      const className = JS_KEYWORDS.has(word) ? 'code-hl-keyword' : 'code-hl-key';
      result += `<span class="${className}">${escapeHtml(word)}</span>`;
      index += word.length;
      continue;
    }

    result += escapeHtml(char);
    index += 1;
  }

  return result;
}

function highlightYaml(source) {
  return String(source ?? '').split('\n').map((line) => {
    if (/^\s*#/u.test(line)) {
      return `<span class="code-hl-comment">${escapeHtml(line)}</span>`;
    }

    const keyMatch = line.match(/^(\s*)([\w.-]+)(\s*:\s*)([\s\S]*)$/u);
    if (keyMatch) {
      const [, indent, key, separator, rest] = keyMatch;
      const restTrimmed = rest.trim();
      if (restTrimmed !== '' && !/[{}[\]]/u.test(restTrimmed)) {
        return `${escapeHtml(indent)}<span class="code-hl-key">${escapeHtml(key)}</span>${escapeHtml(separator)}<span class="code-hl-string">${escapeHtml(rest)}</span>`;
      }

      return `${escapeHtml(indent)}<span class="code-hl-key">${escapeHtml(key)}</span>${escapeHtml(separator)}${highlightStructuredTokens(rest)}`;
    }

    return highlightStructuredTokens(line);
  }).join('\n');
}

function highlightJavaScript(source) {
  return String(source ?? '').split('\n').map((line) => {
    const commentMatch = line.match(/^(\s*)(\/\/.*)$/u);
    if (commentMatch) {
      return `${escapeHtml(commentMatch[1])}<span class="code-hl-comment">${escapeHtml(commentMatch[2])}</span>`;
    }

    return highlightStructuredTokens(line);
  }).join('\n');
}

export function highlightCodeBlock(source, language) {
  const normalized = normalizeCodeLanguage(language);

  switch (normalized) {
    case 'yaml':
      return highlightYaml(source);
    case 'json':
      return highlightStructuredTokens(source);
    case 'javascript':
    case 'typescript':
    case 'bash':
      return highlightJavaScript(source);
    default:
      return escapeHtml(source);
  }
}

const BVC_SECTION_RE = /^(Базис|Вектор|Цель|Метки|Проверки|Свидетельства|Анализ|Решение|Checks|Basis|Vector|Goal|Labels|Evidence|Analysis|Decision):/u;

function normalizePublicSiteCodeText(source) {
  return String(source ?? '').replace(/\\n/g, '\n');
}

export function highlightBvcBlock(source) {
  const text = normalizePublicSiteCodeText(source);
  return text.split('\n').map((line) => {
    const trimmed = line.trimEnd();
    const header = trimmed.match(/^(#\w+)@(\w+)(<\[)?$/u);
    if (header) {
      const open = header[3] ? '<span class="code-hl-punct">&lt;[</span>' : '';
      return `<span class="code-hl-keyword">${escapeHtml(header[1])}</span><span class="code-hl-punct">@</span><span class="code-hl-number">${escapeHtml(header[2])}</span>${open}`;
    }
    if (/^\]>$/.test(trimmed)) {
      return '<span class="code-hl-punct">]&gt;</span>';
    }
    if (BVC_SECTION_RE.test(trimmed)) {
      const match = trimmed.match(/^([^:]+):(.*)$/u);
      const rest = match[2] ? highlightStructuredTokens(match[2]) : '';
      return `<span class="code-hl-key">${escapeHtml(match[1])}</span><span class="code-hl-punct">:</span>${rest}`;
    }
    const kv = line.match(/^(\s+)([\w.*-]+):\s*(.*)$/u);
    if (kv) {
      return `${escapeHtml(kv[1])}<span class="code-hl-key">${escapeHtml(kv[2])}</span><span class="code-hl-punct">:</span> <span class="code-hl-string">${escapeHtml(kv[3])}</span>`;
    }
    if (/^\s+\S/u.test(line)) {
      return `<span class="code-hl-comment">${escapeHtml(line)}</span>`;
    }
    return highlightStructuredTokens(line);
  }).join('\n');
}

export function highlightMcpFlow(source) {
  const text = normalizePublicSiteCodeText(source);
  return text.split('\n').map((line) => {
    let rest = line.trim();
    let prefix = '';
    if (/^→\s/u.test(rest)) {
      prefix = '<span class="code-hl-punct">→</span> ';
      rest = rest.replace(/^→\s/u, '');
    }
    const fnMatch = rest.match(/^([\w]+)(\(([^)]*)\))?(\s*\+\s*(\w+))?$/u);
    if (fnMatch) {
      const [, fn, parenGroup, args = '', plusSuffix, plusWord] = fnMatch;
      let html = `${prefix}<span class="code-hl-key">${escapeHtml(fn)}</span>`;
      if (parenGroup) {
        html += `<span class="code-hl-punct">(</span><span class="code-hl-string">${escapeHtml(args)}</span><span class="code-hl-punct">)</span>`;
      }
      if (plusSuffix) {
        html += `<span class="code-hl-punct"> + </span><span class="code-hl-keyword">${escapeHtml(plusWord)}</span>`;
      }
      return html;
    }
    const verbMatch = rest.match(/^([\w]+)\s+(.+)$/u);
    if (verbMatch) {
      return `${prefix}<span class="code-hl-key">${escapeHtml(verbMatch[1])}</span> <span class="code-hl-string">${escapeHtml(verbMatch[2])}</span>`;
    }
    return prefix + highlightStructuredTokens(rest);
  }).join('\n');
}
