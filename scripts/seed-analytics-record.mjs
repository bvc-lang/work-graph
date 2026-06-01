#!/usr/bin/env node
/**
 * Register analytics markdown in work/analytics-records.jsonl (atomic md + journal).
 *
 * Usage:
 *   npm run seed:analytics-record -- --body work/analytics/<file>.md
 *   npm run seed:analytics-record -- --body work/analytics/<file>.md --key AN-40
 *   npm run seed:analytics-record -- --body work/analytics/<file>.md --dry-run
 *   npm run seed:analytics-record -- --body work/analytics/<file>.md --force
 *
 * Metadata defaults are parsed from the markdown:
 *   # AN-XX: Title
 *   **Запрос:** operator question
 */
import { parseSeedAnalyticsRecordArgs, seedAnalyticsRecord } from '../src/seedAnalyticsRecord.mjs';

async function main() {
  const options = parseSeedAnalyticsRecordArgs(process.argv.slice(2));
  const result = await seedAnalyticsRecord(options);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
