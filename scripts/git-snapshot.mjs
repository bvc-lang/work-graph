#!/usr/bin/env node
import { runGitSnapshot } from '../src/gitSnapshot.mjs';

function arg(name) {
  const hit = process.argv.find((item) => item.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3) ?? null;
}

const event = arg('event') ?? 'work_item.done';
const workId = arg('workId') ?? arg('work-id');
const analyticsKey = arg('analyticsKey') ?? arg('analytics-key') ?? arg('key');
const title = arg('title');
const paths = process.argv
  .slice(2)
  .filter((entry) => !entry.startsWith('--'))
  .map((entry) => entry.trim())
  .filter(Boolean);

if (paths.length === 0) {
  console.error('Usage: node scripts/git-snapshot.mjs [--event=work_item.done] [--workId=id] [--title=...] path1 [path2...]');
  process.exit(1);
}

const result = await runGitSnapshot({
  cwd: process.cwd(),
  event,
  workId,
  analyticsKey,
  title,
  paths,
});

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok && !result.skipped ? 0 : result.skipped ? 0 : 1);
