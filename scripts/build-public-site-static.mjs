#!/usr/bin/env node
/**
 * Build Work Graph public site as static files for ordinary hosting (no DB).
 */
import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import {
  PUBLIC_DOCS,
  PUBLIC_SITE_ROUTES,
  buildDocsContext,
  buildFaqJsonLd,
  buildLlmsTxt,
  buildMcpDiscovery,
  getPublicSitePage,
  renderBvcExample,
  renderPublicDocMarkdown,
} from '../src/publicSiteContent.mjs';
import { renderPublicSiteHtml } from '../src/publicSiteServer.mjs';

const OUT_DIR = process.argv.includes('--out')
  ? process.argv[process.argv.indexOf('--out') + 1]
  : 'dist/public-site';

async function writeStatic(relativePath, contents) {
  const outputPath = join(process.cwd(), OUT_DIR, relativePath);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, contents, 'utf8');
}

async function copyStaticAsset(sourceRelativePath, outputRelativePath) {
  const outputPath = join(process.cwd(), OUT_DIR, outputRelativePath);
  await mkdir(dirname(outputPath), { recursive: true });
  await copyFile(join(process.cwd(), sourceRelativePath), outputPath);
}

function htmlOutputPath(route) {
  if (route === '/') return 'index.html';
  return `${route.replace(/^\/+/u, '')}/index.html`;
}

function localizedHtmlOutputPath(route, locale) {
  if (locale === 'ru') return htmlOutputPath(route);
  if (route === '/') return `${locale}/index.html`;
  return `${locale}/${route.replace(/^\/+/u, '')}/index.html`;
}

async function main() {
  await rm(join(process.cwd(), OUT_DIR), { recursive: true, force: true });

  for (const locale of ['ru', 'en']) {
    for (const route of PUBLIC_SITE_ROUTES) {
      const page = getPublicSitePage(route, locale);
      if (!page) continue;
      await writeStatic(localizedHtmlOutputPath(route, locale), renderPublicSiteHtml(page, { locale, theme: 'light' }));
    }
  }

  await writeStatic('llms.txt', buildLlmsTxt());
  await copyStaticAsset('public/assets/favicon.svg', 'assets/favicon.svg');
  await writeStatic('faq.json', `${JSON.stringify(buildFaqJsonLd('ru'), null, 2)}\n`);
  await writeStatic('en/faq.json', `${JSON.stringify(buildFaqJsonLd('en'), null, 2)}\n`);
  await writeStatic('.well-known/mcp.json', `${JSON.stringify(buildMcpDiscovery(), null, 2)}\n`);
  await writeStatic('api/docs/bvc-authoring-context.json', `${JSON.stringify(buildDocsContext('bvc-authoring'), null, 2)}\n`);
  await writeStatic('api/docs/mcp-tools-context.json', `${JSON.stringify(buildDocsContext('mcp-tools'), null, 2)}\n`);
  await writeStatic('api/docs/errors-context.json', `${JSON.stringify(buildDocsContext('errors'), null, 2)}\n`);

  const docsIndex = `# Work Graph Docs\n\n${PUBLIC_DOCS.map((doc) => `- [${doc.title}](/docs/${doc.slug}.md): ${doc.description}`).join('\n')}\n`;
  await writeStatic('docs.md', docsIndex);
  for (const doc of PUBLIC_DOCS) {
    await writeStatic(`docs/${doc.slug}.md`, renderPublicDocMarkdown(doc.slug, 'ru'));
    await writeStatic(`en/docs/${doc.slug}.md`, renderPublicDocMarkdown(doc.slug, 'en'));
    const bvcExample = renderBvcExample(doc.slug);
    if (bvcExample) {
      await writeStatic(`docs/${doc.slug}.bvc.example`, bvcExample);
    }
  }

  await writeStatic('README.txt', `Work Graph public site static export\n\nUpload the contents of this folder to any static hosting provider.\nNo database or server runtime is required.\n\nGenerated routes: ${PUBLIC_SITE_ROUTES.length}\n`);
  console.log(JSON.stringify({
    schema: 'workgraph.public-site-static-build.v1',
    outDir: OUT_DIR,
    routes: PUBLIC_SITE_ROUTES.length,
    docs: PUBLIC_DOCS.length,
    noDatabase: true,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

