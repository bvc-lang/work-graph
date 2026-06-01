import { pathToFileURL } from 'node:url';

import { analyzeCodeGaps, formatCodeGapReportMarkdown } from '../src/codeGapAnalyzer.mjs';

function parseArgs(argv) {
  const options = {
    repoRoot: process.cwd(),
    markdown: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--markdown') {
      options.markdown = true;
      continue;
    }
    if (arg === '--repo-root') {
      options.repoRoot = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--code-dir') {
      options.codeRelDirs = String(argv[index + 1]).split(',').map((value) => value.trim()).filter(Boolean);
      index += 1;
      continue;
    }
    if (arg === '--step-dir') {
      options.stepSearchRelDirs = String(argv[index + 1]).split(',').map((value) => value.trim()).filter(Boolean);
      index += 1;
    }
  }

  return options;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const options = parseArgs(process.argv);
  const report = analyzeCodeGaps(options);

  if (options.markdown) {
    console.log(formatCodeGapReportMarkdown(report));
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
}
