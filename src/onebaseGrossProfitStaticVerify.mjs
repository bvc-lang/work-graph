import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));
export const DEFAULT_ONEBASE_ROOT = path.resolve(scriptDir, '../../onebase');

/**
 * Static cross-repo checks mirroring ../onebase/internal/project/trade_gross_profit_test.go.
 * Does not replace go test ./...; validates artifact content when Go is unavailable.
 *
 * @param {string} [onebaseRoot]
 */
export function verifyOnebaseGrossProfitWarehouseArtifacts(onebaseRoot = DEFAULT_ONEBASE_ROOT) {
  const failures = [];
  const checkedFiles = [];

  const registerPath = path.join(onebaseRoot, 'examples/trade/registers/валовая_прибыль.yaml');
  const postingPath = path.join(onebaseRoot, 'examples/trade/src/реализациятоваров.posting.os');
  const reportPath = path.join(onebaseRoot, 'examples/trade/reports/валовая_прибыль.yaml');
  const kpiPath = path.join(onebaseRoot, 'examples/trade/widgets/валовая_прибыль_kpi.yaml');

  const register = readText(registerPath, failures, checkedFiles);
  const posting = readText(postingPath, failures, checkedFiles);
  const report = readText(reportPath, failures, checkedFiles);
  const kpi = readText(kpiPath, failures, checkedFiles);

  if (register) {
    if (!hasYamlField(register, 'Номенклатура', 'reference:Номенклатура')) {
      failures.push('register must keep Номенклатура dimension');
    }
    if (!hasYamlField(register, 'Склад', 'reference:Склад')) {
      failures.push('register must include Склад dimension');
    }
  }

  if (report) {
    if (!hasReportParam(report, 'Склад', 'reference:Склад')) {
      failures.push('report must expose Склад filter');
    }
    if (!report.includes('СГРУППИРОВАТЬ ПО Номенклатура, Склад')) {
      failures.push('report must group by Номенклатура and Склад');
    }
    if (!report.includes('Склад = &Склад')) {
      failures.push('report must filter by Склад');
    }
  }

  if (kpi) {
    if (kpi.includes('СГРУППИРОВАТЬ') || kpi.includes('Склад')) {
      failures.push('gross-profit KPI must remain a total query');
    }
  }

  if (posting && !posting.includes('ДвВП.Склад        = this.Склад')) {
    failures.push('РеализацияТоваров gross-profit movement must set Склад');
  }

  const testPath = path.join(onebaseRoot, 'internal/project/trade_gross_profit_test.go');
  const testSource = readText(testPath, failures, checkedFiles);
  if (testSource && !testSource.includes('TestTradeGrossProfitWarehouseDimension')) {
    failures.push('targeted trade_gross_profit_test.go must include warehouse dimension test');
  }

  return {
    ok: failures.length === 0,
    failures,
    checkedFiles,
    onebaseRoot,
  };
}

/** @param {string} filePath @param {string[]} failures @param {string[]} checkedFiles */
function readText(filePath, failures, checkedFiles) {
  checkedFiles.push(filePath);
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    failures.push(`missing or unreadable file: ${filePath} (${error.message})`);
    return null;
  }
}

/** @param {string} yaml @param {string} name @param {string} type */
function hasYamlField(yaml, name, type) {
  const block = yaml.match(/dimensions:[\s\S]*?(?=\nresources:|\n[a-z_]+:|$)/i);
  if (!block) return false;
  const lines = block[0];
  return lines.includes(`name: ${name}`) && lines.includes(`type: ${type}`);
}

/** @param {string} yaml @param {string} name @param {string} type */
function hasReportParam(yaml, name, type) {
  const block = yaml.match(/params:[\s\S]*?(?=\nquery:|$)/i);
  if (!block) return false;
  const lines = block[0];
  return lines.includes(`name: ${name}`) && lines.includes(`type: ${type}`);
}
