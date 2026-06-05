import { access, cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';

import {
  CANON_LAYOUT_DOT_CANON,
  CANON_LAYOUT_ROOT_INTENT,
  DEFAULT_CANON_ROOT_REL,
  normalizeCanonLayout,
  readProjectConfigSync,
  resolveCanonPaths,
} from './canonPaths.mjs';

export const CANON_LAYOUT_MIGRATION_SCHEMA = 'workgraph.canon-layout-migration.v1';
export const CANON_LAYOUT_MIGRATION_EVIDENCE_REL = '.work-graph/migration/root-intent-to-dot-canon.v1.json';
export const DEFAULT_MIGRATION_SCRIPT = 'scripts/migrate-root-intent-to-dot-canon.mjs';

export const CANON_TREE_DIRS = ['intent', 'charter', 'architecture'];

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function directoryHasEntries(path) {
  if (!(await pathExists(path))) {
    return false;
  }
  const entries = await readdir(path);
  return entries.length > 0;
}

export function buildDotCanonConfigFromExisting(existingConfig, repoRoot) {
  const root = resolve(repoRoot);
  return {
    ...existingConfig,
    schema: 'workgraph.project.config.v3',
    projectRoot: root,
    canonLayout: CANON_LAYOUT_DOT_CANON,
    canonRoot: DEFAULT_CANON_ROOT_REL,
  };
}

export async function planRootIntentToDotCanonMigration(options = {}) {
  const repoRoot = resolve(options.repoRoot ?? process.cwd());
  const config = options.config ?? readProjectConfigSync(repoRoot, { optional: true });
  const paths = resolveCanonPaths({ repoRoot, config });
  const canonRoot = resolve(repoRoot, DEFAULT_CANON_ROOT_REL);
  const evidencePath = join(repoRoot, CANON_LAYOUT_MIGRATION_EVIDENCE_REL);

  if (!config) {
    throw new Error('missing .work-graph/config.json — run work-graph init first');
  }

  if (normalizeCanonLayout(config.canonLayout) === CANON_LAYOUT_DOT_CANON) {
    throw new Error('project already uses canonLayout=dot-canon');
  }

  const sourceDirs = [];
  for (const dirName of CANON_TREE_DIRS) {
    const sourcePath = join(repoRoot, dirName);
    if (await directoryHasEntries(sourcePath)) {
      sourceDirs.push({
        dirName,
        sourcePath,
        targetPath: join(canonRoot, dirName),
      });
    }
  }

  if (!sourceDirs.some((entry) => entry.dirName === 'intent')) {
    throw new Error('root intent/ tree not found — nothing to migrate');
  }

  for (const entry of sourceDirs) {
    if (await directoryHasEntries(entry.targetPath)) {
      throw new Error(`target already exists and is not empty: ${entry.targetPath}`);
    }
  }

  if (await pathExists(evidencePath)) {
    throw new Error(`migration evidence already exists: ${CANON_LAYOUT_MIGRATION_EVIDENCE_REL}`);
  }

  return {
    schema: 'workgraph.canon-layout-migration-plan.v1',
    repoRoot,
    fromLayout: CANON_LAYOUT_ROOT_INTENT,
    toLayout: CANON_LAYOUT_DOT_CANON,
    canonRoot,
    canonRootRel: DEFAULT_CANON_ROOT_REL,
    sourceDirs,
    evidencePath,
    configPath: join(repoRoot, '.work-graph/config.json'),
    nextConfig: buildDotCanonConfigFromExisting(config, repoRoot),
    currentCanonLayout: paths.canonLayout,
  };
}

export async function migrateRootIntentToDotCanon(options = {}) {
  const plan = await planRootIntentToDotCanonMigration(options);
  const dryRun = options.dryRun === true;
  const removeSource = options.removeSource === true;
  const migrationScript = String(options.migrationScript ?? DEFAULT_MIGRATION_SCRIPT).trim();

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      plan,
      copiedDirs: plan.sourceDirs.map((entry) => entry.dirName),
      removedSource: false,
    };
  }

  await mkdir(plan.canonRoot, { recursive: true });
  await mkdir(dirname(plan.evidencePath), { recursive: true });

  const copiedDirs = [];
  for (const entry of plan.sourceDirs) {
    await cp(entry.sourcePath, entry.targetPath, { recursive: true, force: false });
    copiedDirs.push(entry.dirName);
  }

  await writeFile(plan.configPath, `${JSON.stringify(plan.nextConfig, null, 2)}\n`, 'utf8');

  const evidence = {
    schema: CANON_LAYOUT_MIGRATION_SCHEMA,
    fromLayout: plan.fromLayout,
    toLayout: plan.toLayout,
    repoRoot: plan.repoRoot,
    canonRoot: plan.canonRoot,
    canonRootRel: plan.canonRootRel,
    copiedDirs,
    removedSource: false,
    at: new Date().toISOString(),
    script: migrationScript,
  };

  if (removeSource) {
    for (const dirName of copiedDirs) {
      await rm(join(plan.repoRoot, dirName), { recursive: true, force: true });
    }
    evidence.removedSource = true;
  }

  await writeFile(plan.evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');

  return {
    ok: true,
    dryRun: false,
    plan,
    copiedDirs,
    removedSource: evidence.removedSource,
    evidencePath: plan.evidencePath,
    configPath: plan.configPath,
  };
}
