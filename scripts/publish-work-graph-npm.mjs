#!/usr/bin/env node
/**
 * Create @work-graph npm org (free/public) and publish CLI + MCP.
 * Requires: npm login as user with rights to create orgs.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const ORG = 'work-graph';
const REGISTRY = 'https://registry.npmjs.org';

function readNpmToken() {
  const npmrc = readFileSync(join(homedir(), '.npmrc'), 'utf8');
  const match = npmrc.match(/\/\/registry\.npmjs\.org\/:_authToken=(\S+)/);
  if (!match) {
    throw new Error('npm token not found — run: npm login');
  }
  return match[1].trim();
}

async function registryFetch(path, { method = 'GET', body } = {}) {
  const token = readNpmToken();
  const response = await fetch(`${REGISTRY}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { ok: response.ok, status: response.status, json };
}

async function orgExists() {
  const whoami = execSync('npm whoami', { encoding: 'utf8' }).trim();
  const roster = await registryFetch(`/-/org/${ORG}/user`);
  if (roster.ok) {
    return { exists: true, whoami, roster: roster.json };
  }
  return { exists: false, whoami, status: roster.status, detail: roster.json };
}

async function tryCreateOrgViaMembership(whoami) {
  const result = await registryFetch(`/-/org/${ORG}/user`, {
    method: 'PUT',
    body: { user: whoami, role: 'owner' },
  });
  return result;
}

async function publishPackage(pkgRel) {
  execSync('npm publish --access public', {
    cwd: join(process.cwd(), pkgRel),
    stdio: 'inherit',
  });
}

async function canPublishScope() {
  try {
    execSync('npm view @work-graph/cli version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const state = await orgExists();
  console.log(JSON.stringify({ step: 'org-check', ...state }, null, 2));

  if (!state.exists && !(await canPublishScope())) {
    console.log(`Org @${ORG} not visible via API — trying publish anyway (create org at npmjs.com/org/create if needed).`);
  }

  execSync('npm run sync:work-graph-cli-vendor', { stdio: 'inherit' });

  console.log('Publishing @work-graph/cli...');
  await publishPackage('packages/work-graph-cli');

  console.log('Publishing @work-graph/mcp...');
  await publishPackage('packages/workgraph-mcp');

  const cliVer = execSync('npm view @work-graph/cli version', { encoding: 'utf8' }).trim();
  const mcpVer = execSync('npm view @work-graph/mcp version', { encoding: 'utf8' }).trim();
  console.log(JSON.stringify({
    schema: 'workgraph.publish-work-graph-npm.v1',
    ok: true,
    '@work-graph/cli': cliVer,
    '@work-graph/mcp': mcpVer,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
