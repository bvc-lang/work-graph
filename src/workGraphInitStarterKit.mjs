import { cpSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const STARTER_KIT_SCHEMA = 'workgraph.init-starter-kit.v1';

export function resolveStarterKitRoot(options = {}) {
  const candidates = [];

  if (options.cliModuleUrl) {
    const cliDir = dirname(fileURLToPath(options.cliModuleUrl));
    const packageRoot = resolve(cliDir, '..');
    candidates.push(join(packageRoot, 'templates/starter'));
    candidates.push(join(packageRoot, 'vendor/templates/starter'));
  }

  if (options.engineRoot) {
    candidates.push(join(resolve(options.engineRoot), 'packages/work-graph-cli/templates/starter'));
  }

  for (const candidate of candidates) {
    if (pathExists(join(candidate, 'intent/index.bvc'))) {
      return candidate;
    }
  }

  throw new Error('Work Graph starter kit templates not found in @work-graph/cli package');
}

function pathExists(path) {
  try {
    readFileSync(path);
    return true;
  } catch {
    return false;
  }
}

function listStarterKitFiles(root, relativeDir = '') {
  const absoluteDir = join(root, relativeDir);
  const entries = readdirSync(absoluteDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...listStarterKitFiles(root, relativePath));
      continue;
    }
    if (entry.isFile()) {
      files.push(relativePath.replace(/\\/g, '/'));
    }
  }

  return files.sort();
}

export function copyStarterKitIntoProject({ starterRoot, canonTreeRoot, projectRoot }) {
  const files = listStarterKitFiles(starterRoot);
  const writes = [];

  for (const relativePath of files) {
    const sourcePath = join(starterRoot, relativePath);
    const targetRoot = relativePath.startsWith('work/') ? projectRoot : canonTreeRoot;
    const targetPath = join(targetRoot, relativePath);
    mkdirSync(dirname(targetPath), { recursive: true });

    let written = false;
    let skipped = false;
    try {
      readFileSync(targetPath);
      skipped = true;
    } catch {
      cpSync(sourcePath, targetPath);
      written = true;
    }

    writes.push({
      relativePath,
      targetPath,
      written,
      skipped,
    });
  }

  return {
    schema: STARTER_KIT_SCHEMA,
    starterRoot,
    files: writes,
  };
}

export function materializeStarterKitForProject(options = {}) {
  const starterRoot = resolveStarterKitRoot(options);
  const canonTreeRoot = resolve(options.canonTreeRoot);
  const projectRoot = resolve(options.projectRoot ?? dirname(canonTreeRoot));
  return copyStarterKitIntoProject({ starterRoot, canonTreeRoot, projectRoot });
}

export function starterKitLooksPresent(canonTreeRoot) {
  return pathExists(join(canonTreeRoot, 'architecture/main.bvc'))
    && pathExists(join(canonTreeRoot, 'intent/demo/starter-sample-task.work.bvc'));
}
