import { pathToFileURL } from 'node:url';

import {
  parseLowcodeCliArgs,
  runLowcodeVerify,
  writeArchRulesScaffold,
} from '../src/lowcodeScaffoldCli.mjs';

async function main(argv = process.argv.slice(2)) {
  const options = parseLowcodeCliArgs(argv);

  if (options.command === 'verify') {
    const result = await runLowcodeVerify({
      charterPath: options.charterPath,
      outputDir: options.outputDir,
    });

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`lowcode verify: ${result.ok ? 'OK' : 'FAILED'}`);
      console.log(`charter: ${result.charter.charterPath} (${result.charter.ruleCount} rules)`);
      if (result.scaffoldDryRun) {
        console.log(`scaffold dry-run: ${result.scaffoldDryRun.ok ? 'OK' : 'FAILED'} (${result.scaffoldDryRun.filesPlanned.length} files planned)`);
      }
      if (result.errors.length > 0) {
        for (const error of result.errors) {
          console.error(error);
        }
      }
    }

    if (!result.ok) {
      process.exitCode = 1;
    }

    return;
  }

  const result = await writeArchRulesScaffold({
    charterPath: options.charterPath,
    outputDir: options.outputDir,
    dryRun: options.dryRun,
  });

  if (options.json) {
    console.log(JSON.stringify({
      ok: result.ok,
      summary: result.summary,
      manifest: result.manifest,
      filesWritten: result.filesWritten,
      errors: result.errors,
      dryRun: result.dryRun,
    }, null, 2));
  } else if (result.ok) {
    console.log(`scaffold:arch-rules OK (${result.summary.ruleCount} rules${result.dryRun ? ', dry-run' : ''})`);
    console.log(`charter: ${result.summary.charterPath}`);
    console.log(`output: ${result.summary.outputDir}`);
    for (const filePath of result.filesWritten) {
      console.log(`  ${filePath}`);
    }
  } else {
    console.error('scaffold:arch-rules FAILED');
    for (const error of result.errors) {
      console.error(error);
    }
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
