#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { handlePublicSiteRequest } from './publicSiteServer.mjs';
import { resolveInstallLayout } from './workGraphInstallLayout.mjs';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 4178;

const { PUBLIC_ROOT, DESIGN_TOKENS_WG_CSS_PATH } = resolveInstallLayout({ moduleUrl: import.meta.url });

function sendText(response, statusCode, body, contentType = 'text/plain') {
  response.writeHead(statusCode, {
    'content-type': `${contentType}; charset=utf-8`,
    'cache-control': 'no-store',
  });
  response.end(body);
}

function serveFile(response, filePath, contentType) {
  try {
    const source = readFileSync(filePath);
    response.writeHead(200, {
      'content-type': contentType,
      'cache-control': 'public, max-age=3600',
    });
    response.end(source);
  } catch {
    sendText(response, 404, 'not_found');
  }
}

function serveAssetDir(url, response, rootDir, urlPrefix) {
  if (!url.pathname.startsWith(urlPrefix)) return false;
  const relativePath = decodeURIComponent(url.pathname.slice(urlPrefix.length));
  if (!relativePath || relativePath.includes('..')) {
    sendText(response, 403, 'forbidden');
    return true;
  }
  const filePath = join(rootDir, relativePath);
  if (!filePath.startsWith(rootDir)) {
    sendText(response, 403, 'forbidden');
    return true;
  }
  const contentType = filePath.endsWith('.svg')
    ? 'image/svg+xml; charset=utf-8'
    : filePath.endsWith('.png')
      ? 'image/png'
      : filePath.endsWith('.css')
        ? 'text/css; charset=utf-8'
        : filePath.endsWith('.woff2')
          ? 'font/woff2'
          : 'application/octet-stream';
  serveFile(response, filePath, contentType);
  return true;
}

export function createPublicSiteServer() {
  return createServer((request, response) => {
    const url = new URL(request.url ?? '/', `http://${DEFAULT_HOST}`);
    const method = request.method ?? 'GET';
    if (method !== 'GET') {
      sendText(response, 405, 'method_not_allowed');
      return;
    }

    if (serveAssetDir(url, response, join(PUBLIC_ROOT, 'assets', 'img'), '/assets/img/')) return;
    if (serveAssetDir(url, response, join(PUBLIC_ROOT, 'assets', 'icons'), '/assets/icons/')) return;
    if (serveAssetDir(url, response, join(PUBLIC_ROOT, 'assets', 'avatars'), '/assets/avatars/')) return;
    if (serveAssetDir(url, response, join(PUBLIC_ROOT, 'fonts'), '/assets/fonts/')) return;

    if (url.pathname === '/assets/favicon.svg') {
      serveFile(response, join(PUBLIC_ROOT, 'assets', 'favicon.svg'), 'image/svg+xml; charset=utf-8');
      return;
    }

    if (url.pathname === '/assets/design-tokens-workgraph-dark.css') {
      serveFile(response, DESIGN_TOKENS_WG_CSS_PATH, 'text/css; charset=utf-8');
      return;
    }

    if (handlePublicSiteRequest(request, response, url)) return;
    sendText(response, 404, 'not_found');
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const host = process.env.WORKGRAPH_PUBLIC_SITE_HOST ?? DEFAULT_HOST;
  const port = Number(process.env.WORKGRAPH_PUBLIC_SITE_PORT ?? DEFAULT_PORT);
  const server = createPublicSiteServer();
  server.listen(port, host, () => {
    console.log(`Work Graph public site: http://${host}:${port}/`);
  });
}
