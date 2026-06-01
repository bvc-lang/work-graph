import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_ONEBASE_ROOT,
  verifyOnebaseGrossProfitWarehouseArtifacts,
} from '../src/onebaseGrossProfitStaticVerify.mjs';

describe('verifyOnebaseGrossProfitWarehouseArtifacts', () => {
  it('passes static checks against sibling ../onebase trade artifacts', () => {
    const result = verifyOnebaseGrossProfitWarehouseArtifacts(DEFAULT_ONEBASE_ROOT);

    assert.equal(result.ok, true, result.failures.join('; '));
    assert.ok(result.checkedFiles.length >= 5);
    assert.match(result.checkedFiles.join('\n'), /валовая_прибыль\.yaml/);
    assert.match(result.checkedFiles.join('\n'), /trade_gross_profit_test\.go/);
  });

  it('reports missing artifacts for invalid root', () => {
    const result = verifyOnebaseGrossProfitWarehouseArtifacts('D:/Work/IDE/__missing_onebase__');

    assert.equal(result.ok, false);
    assert.ok(result.failures.length >= 4);
  });
});
