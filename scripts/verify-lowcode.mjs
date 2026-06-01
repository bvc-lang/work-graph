import { pathToFileURL } from 'node:url';

import { runLowcodeVerify } from '../src/lowcodeScaffoldCli.mjs';

async function main() {
  const jsonFlagIndex = process.argv.indexOf('--json');
  const charterFlagIndex = process.argv.indexOf('--charter');
  const charterPath = charterFlagIndex === -1 ? undefined : process.argv[charterFlagIndex + 1];
  const json = jsonFlagIndex !== -1;

  const result = await runLowcodeVerify({ charterPath });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`verify:lowcode ${result.ok ? 'OK' : 'FAILED'}`);
    console.log(`charter: ${result.charter.charterPath} (${result.charter.ruleCount} rules)`);
    if (result.scaffoldDryRun) {
      console.log(`scaffold dry-run planned ${result.scaffoldDryRun.filesPlanned.length} files`);
    }
    for (const error of result.errors) {
      console.error(error);
    }
  }

  if (!result.ok) {
    process.exitCode = 1;
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

export { main };
