import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderMarkdownDocument } from './markdownDocumentRender.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS_ROOT = join(REPO_ROOT, 'docs', 'public-site');

/**
 * @param {string} slug
 * @param {'ru' | 'en'} locale
 */
export function loadPublicDocMarkdown(slug, locale = 'en') {
  const lang = locale === 'ru' ? 'ru' : 'en';
  const filePath = join(DOCS_ROOT, lang, `${slug}.md`);
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, 'utf8');
}

/**
 * @param {string} slug
 * @param {'ru' | 'en'} locale
 */
export function renderPublicDocArticleHtml(slug, locale = 'en') {
  const markdown = loadPublicDocMarkdown(slug, locale);
  if (markdown == null) return null;
  return renderMarkdownDocument(markdown);
}
