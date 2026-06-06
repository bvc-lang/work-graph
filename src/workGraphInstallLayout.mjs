import { accessSync, constants } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function pathExists(path) {
  try {
    accessSync(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function firstExisting(candidates) {
  for (const candidate of candidates) {
    if (pathExists(candidate)) {
      return candidate;
    }
  }
  return candidates[0];
}

export function resolveInstallLayout({ moduleUrl, installRootOverride } = {}) {
  const moduleDir = dirname(fileURLToPath(moduleUrl));
  let installRoot;

  if (installRootOverride) {
    installRoot = resolve(installRootOverride);
  } else if (moduleDir.replace(/\\/gu, '/').includes('/vendor/src')) {
    installRoot = resolve(moduleDir, '../..');
  } else {
    installRoot = resolve(moduleDir, '..');
  }

  const publicRoot = firstExisting([
    join(installRoot, 'vendor/public'),
    join(installRoot, 'public'),
  ]);

  const designTokensRoot = firstExisting([
    join(installRoot, 'vendor/packages/design-tokens/generated'),
    join(installRoot, 'packages/design-tokens/generated'),
  ]);

  const mermaidPath = firstExisting([
    join(installRoot, 'node_modules/mermaid/dist/mermaid.min.js'),
    join(installRoot, '..', 'node_modules/mermaid/dist/mermaid.min.js'),
    join(installRoot, '..', '..', 'node_modules/mermaid/dist/mermaid.min.js'),
    join(installRoot, '..', '..', '..', 'node_modules/mermaid/dist/mermaid.min.js'),
  ]);

  return {
    installRoot,
    MERMAID_VENDOR_PATH: mermaidPath,
    GRAPH_CANVAS_LIT_FLOW_JS_PATH: join(publicRoot, 'graph-canvas-lit-flow.js'),
    GRAPH_CANVAS_LIT_FLOW_CSS_PATH: join(publicRoot, 'graph-canvas-lit-flow.css'),
    WORKGRAPH_LOGO_SVG_PATH: join(publicRoot, 'assets/workgraph-logo.svg'),
    WORKGRAPH_EMBLEM_SVG_PATH: join(publicRoot, 'assets/workgraph-emblem.svg'),
    WORKGRAPH_WORDMARK_SVG_PATH: join(publicRoot, 'assets/workgraph-wordmark.svg'),
    PUBLIC_ROOT: publicRoot,
    DESIGN_TOKENS_GRIPE_CSS_PATH: join(designTokensRoot, 'gripe-dark-default.css'),
    DESIGN_TOKENS_WG_CSS_PATH: join(designTokensRoot, 'workgraph-dark.css'),
    SRC_ROOT: moduleDir.replace(/\\/gu, '/').includes('/vendor/src')
      ? join(installRoot, 'vendor/src')
      : moduleDir,
  };
}
