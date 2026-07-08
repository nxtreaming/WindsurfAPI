import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { tierBucket } from '../src/auth.js';

// The dashboard tier filter (batch 3) folds every raw account tier into exactly
// four buckets — pro / free / unknown / expired — so the filter dropdown and the
// per-tier counts (getAccountListStats().byTier) stay closed over a known set.
// Any paid-ish tier (enterprise / teams / trial / premium / …) reads as "pro";
// empty or unrecognized reads as "unknown". Keep in sync with setAccountTier's
// manual whitelist.
describe('tierBucket — dashboard tier filter buckets', () => {
  it('keeps free / expired / unknown as themselves', () => {
    assert.equal(tierBucket('free'), 'free');
    assert.equal(tierBucket('expired'), 'expired');
    assert.equal(tierBucket('unknown'), 'unknown');
  });

  it('treats empty / null / undefined as unknown', () => {
    assert.equal(tierBucket(''), 'unknown');
    assert.equal(tierBucket(null), 'unknown');
    assert.equal(tierBucket(undefined), 'unknown');
  });

  it('folds every paid-ish tier into pro', () => {
    for (const t of ['pro', 'enterprise', 'teams', 'team', 'trial', 'premium', 'paid', 'startup']) {
      assert.equal(tierBucket(t), 'pro', `${t} should bucket as pro`);
    }
  });

  it('is case-insensitive and trims surrounding whitespace', () => {
    assert.equal(tierBucket('PRO'), 'pro');
    assert.equal(tierBucket('  Free '), 'free');
    assert.equal(tierBucket('Expired'), 'expired');
  });
});
