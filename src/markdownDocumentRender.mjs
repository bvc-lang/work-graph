import { highlightCodeBlock, normalizeCodeLanguage } from './codeSyntaxHighlight.mjs';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderInlineMarkdown(text) {
  const tickParts = String(text ?? '').split('`');

  return tickParts.map((chunk, index) => {
    if (index % 2 === 1) {
      return `<code class="inline-term">${escapeHtml(chunk)}</code>`;
    }

    const boldParts = chunk.split('**');
    return boldParts.map((part, boldIndex) => {
      if (boldIndex % 2 === 1) {
        return `<strong>${escapeHtml(part)}</strong>`;
      }

      return escapeHtml(part);
    }).join('');
  }).join('');
}

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/u, '')
    .replace(/\|$/u, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isTableSeparator(line) {
  return /^\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?$/u.test(String(line ?? '').trim());
}

function renderMarkdownTable(headerCells, bodyRows) {
  const head = headerCells.map((cell) => `<th>${renderInlineMarkdown(cell)}</th>`).join('');
  const body = bodyRows.map((row) =>
    `<tr>${row.map((cell) => `<td>${renderInlineMarkdown(cell)}</td>`).join('')}</tr>`,
  ).join('');

  return `<div class="markdown-table-wrap"><table class="markdown-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

export function stripAnalyticsBodyPreamble(text) {
  const lines = String(text ?? '').split(/\r?\n/u);
  let index = 0;

  if (/^#\s+/u.test(lines[index]?.trim() ?? '')) {
    index += 1;
  }

  while (index < lines.length && lines[index].trim() === '') {
    index += 1;
  }

  while (index < lines.length) {
    const trimmed = lines[index].trim();

    if (trimmed === '') {
      index += 1;
      continue;
    }

    if (/^\*\*Запрос:\*\*/u.test(trimmed)) {
      index += 1;
      continue;
    }

    if (/^\*\*Тема:\*\*/u.test(trimmed)) {
      index += 1;
      continue;
    }

    if (/^\*\*Связанные файлы:\*\*/u.test(trimmed)) {
      index += 1;
      continue;
    }

    if (/^---+$|^___+$|^\*\*\*+$/u.test(trimmed)) {
      index += 1;
      continue;
    }

    break;
  }

  while (index < lines.length && lines[index].trim() === '') {
    index += 1;
  }

  return lines.slice(index).join('\n').trim();
}

function escapeMermaidSource(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;');
}

export function renderMarkdownDocument(text) {
  const lines = String(text ?? '').split(/\r?\n/u);
  const parts = [];
  let index = 0;

  while (index < lines.length) {
    const rawLine = lines[index];
    const trimmed = rawLine.trim();

    if (trimmed === '') {
      index += 1;
      continue;
    }

    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim();
      index += 1;
      const codeLines = [];

      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index]);
        index += 1;
      }

      if (index < lines.length) {
        index += 1;
      }

      if (language === 'mermaid') {
        const source = codeLines.join('\n');
        parts.push(`<div class="markdown-mermaid-wrap" data-testid="markdown-mermaid"><div class="mermaid">${escapeMermaidSource(source)}</div></div>`);
        continue;
      }

      const normalizedLanguage = normalizeCodeLanguage(language);
      const highlighted = highlightCodeBlock(codeLines.join('\n'), normalizedLanguage);
      const languageClass = normalizedLanguage === 'plaintext' ? '' : ` language-${normalizedLanguage}`;
      parts.push(`<pre class="markdown-code-block"><code class="code-block${languageClass}">${highlighted}</code></pre>`);

      continue;
    }

    if (/^---+$|^___+$|^\*\*\*+$/u.test(trimmed)) {
      parts.push('<hr class="markdown-hr" />');
      index += 1;
      continue;
    }

    if (trimmed.includes('|') && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
      const headerCells = splitTableRow(trimmed);
      index += 2;
      const bodyRows = [];

      while (index < lines.length && lines[index].trim() !== '' && lines[index].trim().includes('|')) {
        bodyRows.push(splitTableRow(lines[index]));
        index += 1;
      }

      parts.push(renderMarkdownTable(headerCells, bodyRows));
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/u);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const tag = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3';
      parts.push(`<${tag} class="markdown-${tag}">${renderInlineMarkdown(headingMatch[2])}</${tag}>`);
      index += 1;
      continue;
    }

    if (/^[-*]\s+/u.test(trimmed)) {
      const items = [];

      while (index < lines.length && /^[-*]\s+/u.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/u, ''));
        index += 1;
      }

      parts.push(`<ul class="markdown-list">${items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join('')}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/u.test(trimmed)) {
      const items = [];

      while (index < lines.length && /^\d+\.\s+/u.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/u, ''));
        index += 1;
      }

      parts.push(`<ol class="markdown-list markdown-list--ordered">${items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join('')}</ol>`);
      continue;
    }

    parts.push(`<p class="markdown-p">${renderInlineMarkdown(trimmed)}</p>`);
    index += 1;
  }

  return `<div class="markdown-doc">${parts.join('')}</div>`;
}
