import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import {
  buildGfsOverlayProjectPassport,
  buildGfsOverlayReadContract,
  evaluateGfsOverlayFallbackPolicy,
  GFS_OVERLAY_PILOT_PREREQUISITES,
  GFS_OVERLAY_READ_ORDER,
  readGfsOverlayPassportPilot,
} from '../src/gfsOverlayProjectPassport.mjs';

describe('buildGfsOverlayProjectPassport', () => {
  it('defines disk-first read contract with optional overlay paths', () => {
    const passport = buildGfsOverlayProjectPassport();
    const readContract = buildGfsOverlayReadContract();

    assert.equal(passport.schema, 'gfs.overlay.project.passport.v1');
    assert.deepEqual(readContract.readOrder, GFS_OVERLAY_READ_ORDER);
    assert.equal(readContract.diskFirst, true);
    assert.ok(readContract.utf8JsonOverlayPaths.length >= 2);
    assert.ok(readContract.deferredBinaryPaths.length >= 2);
  });

  it('requires mandatory fallback without GFS', () => {
    const passport = buildGfsOverlayProjectPassport();
    const policy = evaluateGfsOverlayFallbackPolicy(passport);

    assert.equal(passport.mandatoryFallback.required, true);
    assert.ok(passport.mandatoryFallback.requiredProjectionIds.includes('workgraph-snapshot'));
    assert.ok(passport.mandatoryFallback.requiredProjectionIds.includes('intent-tree-parity'));
    assert.equal(policy.ok, true);
    assert.match(passport.agentContextPolicy.withoutGfs, /JSON snapshots/i);
  });

  it('reads passport from disk fixture without GFS mount', async () => {
    const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    const fixtureRoot = resolve(repoRoot, 'tests/fixtures/gfs-passport-pilot');
    const pilot = await readGfsOverlayPassportPilot({ cwd: fixtureRoot });

    assert.equal(pilot.schema, 'gfs.overlay.pilot-read.v1');
    assert.equal(pilot.ok, true);
    assert.equal(pilot.gfsMounted, false);
    assert.equal(pilot.readPath, 'disk-canonical');
    assert.equal(pilot.passportSchema, 'project-passport.v1');
    assert.ok(GFS_OVERLAY_PILOT_PREREQUISITES.length >= 3);
  });

  it('falls back to json-snapshot projection when disk passport is missing', async () => {
    const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    const pilot = await readGfsOverlayPassportPilot({
      cwd: resolve(repoRoot, 'tests/fixtures/missing-passport'),
    });

    assert.equal(pilot.readPath, 'json-snapshot-projection');
    assert.equal(pilot.fallback, true);
    assert.ok(pilot.mandatoryFallbackProjectionIds.includes('workgraph-snapshot'));
  });
});
