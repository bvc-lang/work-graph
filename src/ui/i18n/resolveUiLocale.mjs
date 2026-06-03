export const UI_LOCALE_COOKIE = 'wg_locale';
export const SUPPORTED_UI_LOCALES = ['en', 'ru', 'ps'];
export const DEFAULT_UI_LOCALE = 'ru';

export function normalizeUiLocale(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'en' || normalized.startsWith('en-')) return 'en';
  if (normalized === 'ru' || normalized.startsWith('ru-')) return 'ru';
  if (normalized === 'ps' || normalized.startsWith('ps-')) return 'ps';
  return null;
}

export function parseCookieHeader(header) {
  const cookies = Object.create(null);
  if (!header) return cookies;
  for (const part of String(header).split(';')) {
    const index = part.indexOf('=');
    if (index <= 0) continue;
    const key = part.slice(0, index).trim();
    const value = decodeURIComponent(part.slice(index + 1).trim());
    cookies[key] = value;
  }
  return cookies;
}

export function negotiateUiLocaleFromAcceptLanguage(header) {
  if (!header) return null;
  const parts = String(header).split(',').map((entry) => {
    const [tag, ...params] = entry.trim().split(';');
    let q = 1;
    for (const param of params) {
      const match = param.trim().match(/^q=([0-9.]+)$/);
      if (match) q = Number.parseFloat(match[1]);
    }
    return { tag: tag.trim(), q: Number.isFinite(q) ? q : 0 };
  }).sort((left, right) => right.q - left.q);

  for (const { tag } of parts) {
    const locale = normalizeUiLocale(tag);
    if (locale) return locale;
  }
  return null;
}

/**
 * @param {{ cookieHeader?: string, acceptLanguage?: string, queryLocale?: string }} input
 */
export function resolveUiLocale(input = {}) {
  const fromQuery = normalizeUiLocale(input.queryLocale);
  if (fromQuery) return fromQuery;

  const cookies = parseCookieHeader(input.cookieHeader);
  const fromCookie = normalizeUiLocale(cookies[UI_LOCALE_COOKIE]);
  if (fromCookie) return fromCookie;

  const fromAccept = negotiateUiLocaleFromAcceptLanguage(input.acceptLanguage);
  if (fromAccept) return fromAccept;

  return DEFAULT_UI_LOCALE;
}
