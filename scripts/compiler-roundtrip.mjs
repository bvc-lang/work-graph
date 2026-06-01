import { pathToFileURL } from 'node:url';

import { runCompilerRoundTripCli } from '../src/compilerRoundTripCli.mjs';

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runCompilerRoundTripCli(process.argv);
}
