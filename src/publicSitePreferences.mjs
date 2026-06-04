export const PUBLIC_SITE_LOCALE_STORAGE_KEY = 'workGraphPublicSiteLocale';
export const PUBLIC_SITE_THEME_STORAGE_KEY = 'workGraphPublicSiteTheme';

export function localeFromPathname(pathname) {
  return pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'ru';
}

export function stripLocalePathPrefix(pathname) {
  if (pathname === '/en') return '/';
  if (pathname.startsWith('/en/')) return pathname.slice(3) || '/';
  return pathname;
}

export function pathForLocale(pathname, locale) {
  const route = stripLocalePathPrefix(pathname);
  if (locale === 'en') return route === '/' ? '/en' : `/en${route}`;
  return route;
}

export function withLocalePath(href, locale) {
  if (
    href.startsWith('#')
    || href.startsWith('http')
    || href.endsWith('.txt')
    || href.includes('.well-known')
    || href.startsWith('/api/')
  ) {
    return href;
  }
  const hashIndex = href.indexOf('#');
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : '';
  const path = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  if (path.endsWith('.md') || path.endsWith('.json') || path.endsWith('.bvc.example')) {
    return `${path}${hash}`;
  }
  return `${pathForLocale(path, locale)}${hash}`;
}

export function renderPublicSiteBootstrapScript(fallbackLocale, fallbackTheme) {
  return `(function () {
  var LOCALE_KEY = '${PUBLIC_SITE_LOCALE_STORAGE_KEY}';
  var THEME_KEY = '${PUBLIC_SITE_THEME_STORAGE_KEY}';
  var allowedLang = ['en', 'ru'];
  var allowedTheme = ['light', 'dark'];
  function localeFromPath(path) {
    return (path === '/en' || path.startsWith('/en/')) ? 'en' : 'ru';
  }
  function pathForLocale(path, lang) {
    var route = path;
    if (route === '/en' || route.startsWith('/en/')) route = route === '/en' ? '/' : route.slice(3) || '/';
    if (lang === 'en') return route === '/' ? '/en' : '/en' + route;
    return route;
  }
  var params = new URLSearchParams(window.location.search);
  var path = window.location.pathname;
  var pageLocale = localeFromPath(path);
  var lang = params.get('lang') || localStorage.getItem(LOCALE_KEY) || '${fallbackLocale}';
  var theme = params.get('theme') || localStorage.getItem(THEME_KEY) || '${fallbackTheme}';
  if (!allowedLang.includes(lang)) lang = pageLocale;
  if (!allowedTheme.includes(theme)) theme = 'light';
  localStorage.setItem(LOCALE_KEY, lang);
  localStorage.setItem(THEME_KEY, theme);
  if (params.has('lang') || params.has('theme')) {
    params.delete('lang');
    params.delete('theme');
    var clean = path + (params.toString() ? '?' + params.toString() : '') + window.location.hash;
    window.history.replaceState(null, '', clean);
  }
  if (lang !== pageLocale) {
    window.location.replace(pathForLocale(path, lang) + window.location.search + window.location.hash);
    return;
  }
  document.documentElement.lang = lang;
  document.documentElement.dataset.theme = theme;
})();`;
}

export function renderPublicSiteControlsScript() {
  return `(function () {
  var LOCALE_KEY = '${PUBLIC_SITE_LOCALE_STORAGE_KEY}';
  var THEME_KEY = '${PUBLIC_SITE_THEME_STORAGE_KEY}';
  function localeFromPath(path) {
    return (path === '/en' || path.startsWith('/en/')) ? 'en' : 'ru';
  }
  function pathForLocale(path, lang) {
    var route = path;
    if (route === '/en' || route.startsWith('/en/')) route = route === '/en' ? '/' : route.slice(3) || '/';
    if (lang === 'en') return route === '/' ? '/en' : '/en' + route;
    return route;
  }
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
    document.querySelectorAll('[data-hero-screenshot]').forEach(function (img) {
      var light = img.getAttribute('data-light-src');
      var dark = img.getAttribute('data-dark-src');
      if (light && dark) img.src = theme === 'dark' ? dark : light;
    });
    var toggle = document.querySelector('[data-theme-toggle]');
    if (!toggle) return;
    var isDark = theme === 'dark';
    toggle.setAttribute('aria-label', isDark ? toggle.getAttribute('data-label-light') : toggle.getAttribute('data-label-dark'));
  }
  document.querySelector('[data-theme-toggle]')?.addEventListener('click', function () {
    var next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  });
  document.querySelector('[data-locale-toggle]')?.addEventListener('click', function () {
    var next = localeFromPath(window.location.pathname) === 'ru' ? 'en' : 'ru';
    localStorage.setItem(LOCALE_KEY, next);
    window.location.assign(pathForLocale(window.location.pathname, next) + window.location.search + window.location.hash);
  });
  applyTheme(document.documentElement.dataset.theme || 'light');
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.left = '-9999px';
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand('copy');
        resolve();
      } catch (error) {
        reject(error);
      } finally {
        document.body.removeChild(area);
      }
    });
  }
  var header = document.querySelector('.site-header');
  var navToggle = document.querySelector('[data-nav-toggle]');
  if (header && navToggle) {
    function setNavOpen(open) {
      header.classList.toggle('is-nav-open', open);
      document.documentElement.classList.toggle('is-nav-scroll-locked', open);
      navToggle.classList.toggle('is-open', open);
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      navToggle.setAttribute(
        'aria-label',
        open ? navToggle.getAttribute('data-label-close') : navToggle.getAttribute('data-label-open'),
      );
    }
    navToggle.addEventListener('click', function () {
      setNavOpen(!header.classList.contains('is-nav-open'));
    });
    document.querySelectorAll('#site-nav a').forEach(function (link) {
      link.addEventListener('click', function () {
        setNavOpen(false);
      });
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') setNavOpen(false);
    });
    window.matchMedia('(max-width: 1024px)').addEventListener('change', function (event) {
      if (!event.matches) setNavOpen(false);
    });
  }
  document.querySelectorAll('[data-screenshot-switcher]').forEach(function (root) {
    var tabs = root.querySelectorAll('[data-screenshot-tab]');
    var panels = root.querySelectorAll('[data-screenshot-panel]');
    function activate(id) {
      tabs.forEach(function (tab) {
        var active = tab.getAttribute('data-screenshot-tab') === id;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      panels.forEach(function (panel) {
        var active = panel.getAttribute('data-screenshot-panel') === id;
        panel.classList.toggle('is-active', active);
        panel.hidden = !active;
      });
    }
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        activate(tab.getAttribute('data-screenshot-tab'));
      });
    });
  });
  document.querySelectorAll('[data-copy-text]').forEach(function (button) {
    button.addEventListener('click', function () {
      var text = button.getAttribute('data-copy-text') || '';
      copyText(text).then(function () {
        var copied = button.getAttribute('data-copied-label') || 'Copied';
        var original = button.getAttribute('data-copy-label') || button.getAttribute('aria-label') || 'Copy';
        button.classList.add('is-copied');
        button.setAttribute('aria-label', copied);
        button.setAttribute('title', copied);
        window.setTimeout(function () {
          button.setAttribute('aria-label', original);
          button.setAttribute('title', original);
          button.classList.remove('is-copied');
        }, 1600);
      });
    });
  });
})();`;
}
